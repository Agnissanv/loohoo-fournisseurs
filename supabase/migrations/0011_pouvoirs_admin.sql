-- 0011 — Pouvoirs de l'administrateur : décisions motivées, journal d'audit, notes internes, documents, tableau de bord
--
-- 1) Journal d'audit : chaque décision d'un admin (publication, suspension, badge, validation ou rejet de produit,
--    vérification du stock, décision sur un document) est enregistrée automatiquement : qui, quoi, quand, ancienne et nouvelle valeur.
-- 2) Décision motivée sur un fournisseur ou un document (motif obligatoire pour suspendre ou rejeter).
-- 3) Notes internes de l'équipe sur un fournisseur ou un acheteur (invisibles pour les intéressés).
-- 4) Lecture des documents privés (RCCM, pièce d'identité...) par l'admin, via liens temporaires.
-- 5) Tableau de bord : tous les compteurs en un seul appel.
--
-- Prérequis : migrations 0001 à 0010, fonction is_admin().
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

-- ---------------------------------------------------------------------------
-- 1) Journal d'audit
-- ---------------------------------------------------------------------------
create table if not exists public.journal_admin (
  id bigint generated always as identity primary key,
  date_action timestamptz not null default now(),
  admin_id uuid,
  action text not null,
  cible_type text not null,
  cible_id text not null,
  details jsonb not null default '{}'::jsonb
);
create index if not exists journal_admin_date_idx on public.journal_admin (date_action desc);
create index if not exists journal_admin_cible_idx on public.journal_admin (cible_type, cible_id);

alter table public.journal_admin enable row level security;
revoke all on public.journal_admin from anon, authenticated;
grant select on public.journal_admin to authenticated;

drop policy if exists journal_admin_lecture on public.journal_admin;
create policy journal_admin_lecture on public.journal_admin
  for select to authenticated using (public.is_admin());

-- Écriture réservée aux déclencheurs (security definer) : personne ne peut fabriquer ni effacer une ligne du journal
create or replace function public.journaliser(p_action text, p_cible_type text, p_cible_id text, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.journal_admin (admin_id, action, cible_type, cible_id, details)
  values (auth.uid(), p_action, p_cible_type, p_cible_id, coalesce(p_details, '{}'::jsonb));
$$;
revoke all on function public.journaliser(text, text, text, jsonb) from public, anon, authenticated;

-- Journal automatique : fournisseurs
create or replace function public.journal_grossiste()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    if new.statut is distinct from old.statut then
      perform public.journaliser('fournisseur_statut', 'grossiste', new.id::text,
        jsonb_build_object('nom', new.nom, 'avant', old.statut, 'apres', new.statut));
    end if;
    if new.badge_verifie is distinct from old.badge_verifie then
      perform public.journaliser('fournisseur_badge', 'grossiste', new.id::text,
        jsonb_build_object('nom', new.nom, 'avant', old.badge_verifie, 'apres', new.badge_verifie));
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists journal_grossiste on public.grossiste;
create trigger journal_grossiste after update on public.grossiste
  for each row execute function public.journal_grossiste();

-- Journal automatique : produits (publication, rejet, stock vérifié)
create or replace function public.journal_produit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    if new.statut is distinct from old.statut then
      perform public.journaliser('produit_statut', 'produit', new.id::text,
        jsonb_build_object('nom', new.nom, 'avant', old.statut, 'apres', new.statut, 'motif', new.motif_rejet));
    end if;
    if new.stock_verifie_le is distinct from old.stock_verifie_le then
      perform public.journaliser('produit_stock', 'produit', new.id::text,
        jsonb_build_object('nom', new.nom, 'verifie', new.stock_verifie_le is not null, 'stock', new.stock_disponible));
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists journal_produit on public.produit;
create trigger journal_produit after update on public.produit
  for each row execute function public.journal_produit();

-- ---------------------------------------------------------------------------
-- 2) Décisions motivées
-- ---------------------------------------------------------------------------
-- Le motif d'une suspension est privé : il est rangé dans la table protégée des contacts (visible du fournisseur et de l'admin seulement)
alter table public.grossiste_contact add column if not exists motif_statut text;

create or replace function public.admin_decider_fournisseur(
  p_id uuid, p_statut text, p_motif text default null, p_badge boolean default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('publie', 'en_attente', 'suspendu') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;
  if p_statut = 'suspendu' and coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un motif est obligatoire pour suspendre un fournisseur.';
  end if;

  update public.grossiste
  set statut = p_statut,
      badge_verifie = coalesce(p_badge, badge_verifie)
  where id = p_id;
  if not found then
    raise exception 'Fournisseur introuvable';
  end if;

  -- Motif : conservé pour une suspension, effacé quand le fournisseur est publié
  insert into public.grossiste_contact (grossiste_id, telephone, motif_statut)
  values (p_id, '', case when p_statut = 'publie' then null else nullif(btrim(p_motif), '') end)
  on conflict (grossiste_id) do update
    set motif_statut = case when p_statut = 'publie' then null else coalesce(nullif(btrim(p_motif), ''), public.grossiste_contact.motif_statut) end;
end;
$$;
revoke all on function public.admin_decider_fournisseur(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_decider_fournisseur(uuid, text, text, boolean) to authenticated;

create or replace function public.admin_decider_document(p_id uuid, p_statut text, p_motif text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('verifie', 'rejete', 'en_attente') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;
  if p_statut = 'rejete' and coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un motif est obligatoire pour rejeter un document.';
  end if;
  update public.document_fournisseur
  set statut = p_statut, motif_rejet = case when p_statut = 'rejete' then btrim(p_motif) else null end
  where id = p_id;
  if not found then
    raise exception 'Document introuvable';
  end if;
  perform public.journaliser('document_statut', 'document', p_id::text, jsonb_build_object('statut', p_statut, 'motif', p_motif));
end;
$$;
revoke all on function public.admin_decider_document(uuid, text, text) from public, anon;
grant execute on function public.admin_decider_document(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2 bis) Messages signalés : état « traité »
-- ---------------------------------------------------------------------------
alter table public.message add column if not exists signale_traite boolean not null default false;

create or replace function public.admin_marquer_message_traite(p_id uuid, p_traite boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  update public.message set signale_traite = p_traite where id = p_id;
end;
$$;
revoke all on function public.admin_marquer_message_traite(uuid, boolean) from public, anon;
grant execute on function public.admin_marquer_message_traite(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Notes internes
-- ---------------------------------------------------------------------------
create table if not exists public.note_admin (
  id bigint generated always as identity primary key,
  cible_type text not null check (cible_type in ('grossiste', 'vendeur')),
  cible_id text not null,
  auteur uuid default auth.uid(),
  texte text not null check (char_length(btrim(texte)) > 0),
  date_note timestamptz not null default now()
);
create index if not exists note_admin_cible_idx on public.note_admin (cible_type, cible_id, date_note desc);

alter table public.note_admin enable row level security;
revoke all on public.note_admin from anon, authenticated;
grant select, insert, delete on public.note_admin to authenticated;

drop policy if exists note_admin_toutes on public.note_admin;
create policy note_admin_toutes on public.note_admin
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4) Documents privés : lecture par l'admin (liens temporaires)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists documents_admin_lecture on storage.objects';
    execute $p$create policy documents_admin_lecture on storage.objects for select to authenticated using (bucket_id = 'documents' and public.is_admin())$p$;
  else
    raise notice 'storage.objects absent : politique des documents ignorée (environnement de test).';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5) Tableau de bord administrateur
-- ---------------------------------------------------------------------------
create or replace function public.admin_tableau_de_bord()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resultat jsonb;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'fournisseurs', jsonb_build_object(
      'total', (select count(*) from public.grossiste),
      'en_attente', (select count(*) from public.grossiste where statut = 'en_attente'),
      'publies', (select count(*) from public.grossiste where statut = 'publie'),
      'suspendus', (select count(*) from public.grossiste where statut = 'suspendu'),
      'verifies', (select count(*) from public.grossiste where badge_verifie),
      'drapeaux', (select count(*) from public.grossiste where drapeau_coordonnees)
    ),
    'produits', jsonb_build_object(
      'total', (select count(*) from public.produit),
      'en_attente', (select count(*) from public.produit where statut = 'en_attente'),
      'publies', (select count(*) from public.produit where statut = 'publie' and actif),
      'rejetes', (select count(*) from public.produit where statut = 'rejete'),
      'drapeaux', (select count(*) from public.produit where drapeau_coordonnees),
      'stock_non_verifie', (select count(*) from public.produit where statut = 'publie' and actif and stock_verifie_le is null)
    ),
    'documents_en_attente', (select count(*) from public.document_fournisseur where statut = 'en_attente'),
    'messages', jsonb_build_object(
      'signales', (select count(*) from public.message where signale and not signale_traite),
      'total', (select count(*) from public.message)
    ),
    'conversations', jsonb_build_object(
      'total', (select count(*) from public.conversation),
      'sept_jours', (select count(*) from public.conversation where derniere_activite >= now() - interval '7 days'),
      'sans_reponse', (select count(*) from public.conversation c
                       where not exists (select 1 from public.message m where m.conversation_id = c.id and m.expediteur = 'fournisseur'))
    ),
    'acheteurs', jsonb_build_object(
      'total', (select count(*) from public.vendeur)
    ),
    'leads', (select count(*) from public.lead),
    'mises_en_relation', (select count(*) from public.mise_en_relation)
  ) into resultat;

  return resultat;
end;
$$;
revoke all on function public.admin_tableau_de_bord() from public, anon;
grant execute on function public.admin_tableau_de_bord() to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION (connecté comme admin dans l'interface d'administration) :
--   - le tableau de bord affiche des compteurs;
--   - publier ou suspendre un fournisseur ajoute une ligne dans le journal d'audit.
-- Côté SQL : select count(*) from public.journal_admin;
