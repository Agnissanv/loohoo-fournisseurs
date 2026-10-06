-- 0016 — Avis des acheteurs après une affaire confirmée
--
-- Règles :
--   * Seul l'acheteur d'une affaire CONFIRMÉE par les deux parties peut laisser un avis, un seul par affaire.
--   * Le commentaire ne doit contenir aucune coordonnée (numéro, e-mail, lien) : sinon il est refusé.
--   * Chaque avis est lu et validé par l'équipe LOOHOO avant d'apparaître (statut en_attente > publie ou rejete).
--   * Publiquement : note, commentaire, date et activité de l'acheteur. Jamais son nom.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

create table if not exists public.avis (
  id uuid primary key default gen_random_uuid(),
  affaire_id uuid not null unique,
  grossiste_id uuid not null,
  vendeur_id uuid not null,
  note smallint not null check (note between 1 and 5),
  commentaire text check (commentaire is null or char_length(commentaire) <= 500),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'publie', 'rejete')),
  motif_rejet text,
  date_creation timestamptz not null default now(),
  date_moderation timestamptz
);
create index if not exists avis_grossiste_idx on public.avis (grossiste_id, statut);

alter table public.avis enable row level security;
revoke all on public.avis from anon, authenticated;
grant select on public.avis to authenticated;

-- L'utilisateur connecté est-il cet acheteur ? (fonction à part : la table vendeur a ses propres règles de lecture)
create or replace function public.suis_vendeur(p_vendeur_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.vendeur v where v.id = p_vendeur_id and v.user_id = auth.uid());
$$;
revoke all on function public.suis_vendeur(uuid) from public, anon;
grant execute on function public.suis_vendeur(uuid) to authenticated;

drop policy if exists avis_lecture on public.avis;
create policy avis_lecture on public.avis for select to authenticated
  using (public.is_admin() or public.suis_vendeur(vendeur_id));

-- L'acheteur dépose son avis
create or replace function public.deposer_avis(p_affaire_id uuid, p_note integer, p_commentaire text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  m record;
  texte text := nullif(btrim(coalesce(p_commentaire, '')), '');
  nouveau uuid;
begin
  select * into a from public.affaire where id = p_affaire_id;
  if not found or a.statut <> 'confirmee' or not public.suis_vendeur(a.vendeur_id) then
    raise exception 'Vous ne pouvez donner un avis que sur une affaire confirmée dont vous êtes l''acheteur.' using errcode = '42501';
  end if;
  if p_note is null or p_note < 1 or p_note > 5 then
    raise exception 'La note doit être comprise entre 1 et 5.';
  end if;
  if texte is not null then
    if char_length(texte) > 500 then
      raise exception 'Le commentaire est limité à 500 caractères.';
    end if;
    select * into m from public.masquer_coordonnees(texte);
    if cardinality(m.motifs) > 0 then
      raise exception 'Le commentaire ne doit contenir ni numéro de téléphone, ni e-mail, ni lien. Retirez-les et réessayez.';
    end if;
  end if;
  if exists (select 1 from public.avis where affaire_id = p_affaire_id) then
    raise exception 'Vous avez déjà donné votre avis sur cette affaire.';
  end if;
  insert into public.avis (affaire_id, grossiste_id, vendeur_id, note, commentaire)
  values (p_affaire_id, a.grossiste_id, a.vendeur_id, p_note, texte)
  returning id into nouveau;
  return nouveau;
end;
$$;
revoke all on function public.deposer_avis(uuid, integer, text) from public, anon;
grant execute on function public.deposer_avis(uuid, integer, text) to authenticated;

-- Avis publiés d'un fournisseur (lecture publique, sans nom d'acheteur)
create or replace function public.avis_publics(p_grossiste_id uuid, p_limite integer default 20)
returns table (note smallint, commentaire text, date_creation timestamptz, activite text)
language sql
stable
security definer
set search_path = public
as $$
  select a.note, a.commentaire, a.date_creation, v.activite
  from public.avis a
  join public.grossiste g on g.id = a.grossiste_id and g.statut = 'publie'
  left join public.vendeur v on v.id = a.vendeur_id
  where a.grossiste_id = p_grossiste_id and a.statut = 'publie'
  order by a.date_creation desc
  limit least(coalesce(p_limite, 20), 50);
$$;
revoke all on function public.avis_publics(uuid, integer) from public;
grant execute on function public.avis_publics(uuid, integer) to anon, authenticated;

create or replace function public.resume_avis(p_grossiste_id uuid)
returns table (nombre integer, moyenne numeric)
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int, round(avg(a.note)::numeric, 1)
  from public.avis a
  join public.grossiste g on g.id = a.grossiste_id and g.statut = 'publie'
  where a.grossiste_id = p_grossiste_id and a.statut = 'publie';
$$;
revoke all on function public.resume_avis(uuid) from public;
grant execute on function public.resume_avis(uuid) to anon, authenticated;

-- L'équipe publie ou rejette un avis
create or replace function public.admin_moderer_avis(p_id uuid, p_publier boolean, p_motif text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  update public.avis
  set statut = case when p_publier then 'publie' else 'rejete' end,
      motif_rejet = case when p_publier then null else nullif(btrim(coalesce(p_motif, '')), '') end,
      date_moderation = now()
  where id = p_id;
  if not found then
    raise exception 'Avis introuvable.';
  end if;
  perform public.journaliser(case when p_publier then 'avis_publie' else 'avis_rejete' end, 'avis', p_id::text,
    jsonb_build_object('motif', p_motif));
end;
$$;
revoke all on function public.admin_moderer_avis(uuid, boolean, text) from public, anon;
grant execute on function public.admin_moderer_avis(uuid, boolean, text) to authenticated;

-- Liste de modération pour l'admin (avec noms, que le public ne voit jamais)
create or replace function public.admin_liste_avis(p_statut text default 'en_attente')
returns table (id uuid, note smallint, commentaire text, statut text, date_creation timestamptz,
               grossiste_nom text, vendeur_nom text, montant_fcfa bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  return query
    select a.id, a.note, a.commentaire, a.statut, a.date_creation,
           coalesce(g.nom, f.grossiste_nom), coalesce(v.nom, f.vendeur_nom), f.montant_fcfa
    from public.avis a
    left join public.grossiste g on g.id = a.grossiste_id
    left join public.vendeur v on v.id = a.vendeur_id
    left join public.affaire f on f.id = a.affaire_id
    where p_statut is null or a.statut = p_statut
    order by a.date_creation desc
    limit 200;
end;
$$;
revoke all on function public.admin_liste_avis(text) from public, anon;
grant execute on function public.admin_liste_avis(text) to authenticated;
