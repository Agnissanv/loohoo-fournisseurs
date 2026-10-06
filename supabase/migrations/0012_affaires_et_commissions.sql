-- 0012 — Affaires conclues et commissions
--
-- Principe : quand un acheteur et un fournisseur concluent une affaire grâce à LOOHOO, l'un des deux la DÉCLARE
-- (montant et description) depuis la conversation, et l'autre la CONFIRME ou la CONTESTE. Une affaire confirmée par les
-- deux parties génère automatiquement une ligne de commission, visible UNIQUEMENT par l'administrateur.
--
--   affaire      : lisible par les deux participants et l'admin (montant, statut). Jamais modifiable directement.
--   commission   : lisible par l'admin seulement (taux appliqué, montant dû, état de facturation).
--   parametre    : réglages de la plateforme (taux de commission), lisibles par l'admin seulement.
--
-- Le taux de commission est à 0 % tant que le client ne l'a pas fixé (réglage dans l'administration).
-- Les paiements restent hors plateforme : l'admin suit seulement ce qui est dû et facturé.
--
-- Prérequis : migrations 0001 à 0011, tables conversation, grossiste, vendeur, produit; fonctions is_admin(), journaliser().
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

-- ---------------------------------------------------------------------------
-- Paramètres
-- ---------------------------------------------------------------------------
create table if not exists public.parametre (
  cle text primary key,
  valeur jsonb not null,
  maj timestamptz not null default now()
);
insert into public.parametre (cle, valeur) values ('taux_commission', '{"pourcent": 0}'::jsonb)
on conflict (cle) do nothing;

alter table public.parametre enable row level security;
revoke all on public.parametre from anon, authenticated;
grant select on public.parametre to authenticated;
drop policy if exists parametre_admin_lecture on public.parametre;
create policy parametre_admin_lecture on public.parametre for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Affaires
-- ---------------------------------------------------------------------------
create table if not exists public.affaire (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid,
  grossiste_id uuid,
  vendeur_id uuid,
  produit_id uuid,
  -- Copies des noms au moment de la déclaration : l'historique reste lisible même si une conversation ou un compte disparaît
  grossiste_nom text,
  vendeur_nom text,
  produit_nom text,
  montant_fcfa bigint not null check (montant_fcfa > 0),
  description text,
  declaree_par text not null check (declaree_par in ('vendeur', 'fournisseur')),
  statut text not null default 'proposee' check (statut in ('proposee', 'confirmee', 'contestee', 'annulee')),
  date_declaration timestamptz not null default now(),
  date_reponse timestamptz
);
create index if not exists affaire_grossiste_idx on public.affaire (grossiste_id);
create index if not exists affaire_vendeur_idx on public.affaire (vendeur_id);
create index if not exists affaire_conversation_idx on public.affaire (conversation_id);
create index if not exists affaire_statut_idx on public.affaire (statut);

create table if not exists public.commission (
  affaire_id uuid primary key references public.affaire(id) on delete cascade,
  taux_pourcent numeric(5, 2) not null,
  montant_fcfa bigint not null,
  statut text not null default 'a_facturer' check (statut in ('a_facturer', 'facturee', 'payee', 'annulee')),
  note text,
  maj timestamptz not null default now()
);

alter table public.affaire enable row level security;
alter table public.commission enable row level security;
revoke all on public.affaire, public.commission from anon, authenticated;
grant select on public.affaire, public.commission to authenticated;

-- Lecture : l'admin et les DEUX participants. On passe par role_dans() (fonction sécurisée, définie plus bas) pour ne
-- dépendre ni des règles de lecture des autres tables, ni des droits de colonnes de la table vendeur.
drop policy if exists commission_admin_lecture on public.commission;
create policy commission_admin_lecture on public.commission for select to authenticated using (public.is_admin());

-- Rôle de la personne connectée dans une conversation ou une affaire : 'fournisseur', 'vendeur' ou null
create or replace function public.role_dans(p_grossiste_id uuid, p_vendeur_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.grossiste g where g.id = p_grossiste_id and g.user_id = auth.uid()) then 'fournisseur'
    when exists (select 1 from public.vendeur v where v.id = p_vendeur_id and v.user_id = auth.uid()) then 'vendeur'
    else null
  end;
$$;
revoke all on function public.role_dans(uuid, uuid) from public, anon;
grant execute on function public.role_dans(uuid, uuid) to authenticated;

drop policy if exists affaire_lecture on public.affaire;
create policy affaire_lecture on public.affaire for select to authenticated
using (public.is_admin() or public.role_dans(affaire.grossiste_id, affaire.vendeur_id) is not null);

create or replace function public.taux_commission_actuel()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (valeur->>'pourcent')::numeric from public.parametre where cle = 'taux_commission'), 0);
$$;
revoke all on function public.taux_commission_actuel() from public, anon, authenticated;

-- Déclarer une affaire conclue (acheteur ou fournisseur de la conversation)
create or replace function public.declarer_affaire(p_conversation_id uuid, p_montant bigint, p_description text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_role text;
  v_id uuid;
begin
  select cv.id, cv.grossiste_id, cv.vendeur_id, cv.produit_id into c from public.conversation cv where cv.id = p_conversation_id;
  if not found then
    raise exception 'Conversation introuvable';
  end if;
  v_role := public.role_dans(c.grossiste_id, c.vendeur_id);
  if v_role is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Indiquez un montant supérieur à zéro.';
  end if;
  if (select count(*) from public.affaire where conversation_id = p_conversation_id and statut = 'proposee') >= 3 then
    raise exception 'Trois déclarations sont déjà en attente de réponse dans cette conversation.';
  end if;

  insert into public.affaire (conversation_id, grossiste_id, vendeur_id, produit_id, grossiste_nom, vendeur_nom, produit_nom,
                              montant_fcfa, description, declaree_par)
  values (c.id, c.grossiste_id, c.vendeur_id, c.produit_id,
          (select nom from public.grossiste where id = c.grossiste_id),
          (select nom from public.vendeur where id = c.vendeur_id),
          (select nom from public.produit where id = c.produit_id),
          p_montant, nullif(btrim(p_description), ''), v_role)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.declarer_affaire(uuid, bigint, text) from public, anon;
grant execute on function public.declarer_affaire(uuid, bigint, text) to authenticated;

-- L'AUTRE partie confirme ou conteste
create or replace function public.repondre_affaire(p_id uuid, p_accepter boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_role text;
  v_taux numeric;
begin
  select * into a from public.affaire where id = p_id for update;
  if not found then
    raise exception 'Affaire introuvable';
  end if;
  v_role := public.role_dans(a.grossiste_id, a.vendeur_id);
  if v_role is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if v_role = a.declaree_par then
    raise exception 'C''est à l''autre partie de répondre à votre déclaration.';
  end if;
  if a.statut <> 'proposee' then
    raise exception 'Cette déclaration a déjà reçu une réponse.';
  end if;

  if p_accepter then
    update public.affaire set statut = 'confirmee', date_reponse = now() where id = p_id;
    v_taux := public.taux_commission_actuel();
    insert into public.commission (affaire_id, taux_pourcent, montant_fcfa)
    values (p_id, v_taux, round(a.montant_fcfa * v_taux / 100))
    on conflict (affaire_id) do nothing;
  else
    update public.affaire set statut = 'contestee', date_reponse = now() where id = p_id;
  end if;
end;
$$;
revoke all on function public.repondre_affaire(uuid, boolean) from public, anon;
grant execute on function public.repondre_affaire(uuid, boolean) to authenticated;

-- Le déclarant peut retirer sa déclaration tant qu'elle n'a pas reçu de réponse
create or replace function public.annuler_affaire(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  select * into a from public.affaire where id = p_id for update;
  if not found then
    raise exception 'Affaire introuvable';
  end if;
  if public.role_dans(a.grossiste_id, a.vendeur_id) is distinct from a.declaree_par then
    raise exception 'Seul l''auteur de la déclaration peut l''annuler.' using errcode = '42501';
  end if;
  if a.statut <> 'proposee' then
    raise exception 'Cette déclaration a déjà reçu une réponse.';
  end if;
  update public.affaire set statut = 'annulee', date_reponse = now() where id = p_id;
end;
$$;
revoke all on function public.annuler_affaire(uuid) from public, anon;
grant execute on function public.annuler_affaire(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Actions de l'administrateur
-- ---------------------------------------------------------------------------
-- Trancher une affaire contestée (ou corriger un montant) : confirmée ou annulée
create or replace function public.admin_trancher_affaire(p_id uuid, p_statut text, p_montant bigint default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_taux numeric;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('confirmee', 'annulee') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;
  select * into a from public.affaire where id = p_id for update;
  if not found then
    raise exception 'Affaire introuvable';
  end if;

  update public.affaire
  set statut = p_statut, montant_fcfa = coalesce(p_montant, montant_fcfa), date_reponse = coalesce(date_reponse, now())
  where id = p_id;

  if p_statut = 'confirmee' then
    v_taux := public.taux_commission_actuel();
    insert into public.commission (affaire_id, taux_pourcent, montant_fcfa)
    values (p_id, v_taux, round(coalesce(p_montant, a.montant_fcfa) * v_taux / 100))
    on conflict (affaire_id) do update
      set montant_fcfa = round(coalesce(p_montant, a.montant_fcfa) * public.commission.taux_pourcent / 100), maj = now();
  else
    update public.commission set statut = 'annulee', maj = now() where affaire_id = p_id;
  end if;

  perform public.journaliser('affaire_statut', 'affaire', p_id::text,
    jsonb_build_object('avant', a.statut, 'apres', p_statut, 'montant', coalesce(p_montant, a.montant_fcfa),
                       'fournisseur', a.grossiste_nom, 'acheteur', a.vendeur_nom));
end;
$$;
revoke all on function public.admin_trancher_affaire(uuid, text, bigint) from public, anon;
grant execute on function public.admin_trancher_affaire(uuid, text, bigint) to authenticated;

-- Suivi de la commission : à facturer, facturée, payée, annulée
create or replace function public.admin_statut_commission(p_affaire_id uuid, p_statut text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avant text;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('a_facturer', 'facturee', 'payee', 'annulee') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;
  select statut into avant from public.commission where affaire_id = p_affaire_id;
  if not found then
    raise exception 'Commission introuvable (l''affaire n''est pas confirmée).';
  end if;
  update public.commission
  set statut = p_statut, note = coalesce(nullif(btrim(p_note), ''), note), maj = now()
  where affaire_id = p_affaire_id;
  perform public.journaliser('commission_statut', 'affaire', p_affaire_id::text, jsonb_build_object('avant', avant, 'apres', p_statut));
end;
$$;
revoke all on function public.admin_statut_commission(uuid, text, text) from public, anon;
grant execute on function public.admin_statut_commission(uuid, text, text) to authenticated;

-- Taux de commission appliqué aux NOUVELLES affaires confirmées (les anciennes gardent leur taux)
create or replace function public.admin_definir_taux(p_pourcent numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avant numeric;
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_pourcent is null or p_pourcent < 0 or p_pourcent > 100 then
    raise exception 'Le taux doit être compris entre 0 et 100.';
  end if;
  avant := public.taux_commission_actuel();
  insert into public.parametre (cle, valeur) values ('taux_commission', jsonb_build_object('pourcent', p_pourcent))
  on conflict (cle) do update set valeur = excluded.valeur, maj = now();
  perform public.journaliser('taux_commission', 'parametre', 'taux_commission', jsonb_build_object('avant', avant, 'apres', p_pourcent));
end;
$$;
revoke all on function public.admin_definir_taux(numeric) from public, anon;
grant execute on function public.admin_definir_taux(numeric) to authenticated;

-- ---------------------------------------------------------------------------
-- Tableau de bord administrateur : ajoute les affaires et commissions (remplace la version de la migration 0011)
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
    'acheteurs', jsonb_build_object('total', (select count(*) from public.vendeur)),
    'affaires', jsonb_build_object(
      'proposees', (select count(*) from public.affaire where statut = 'proposee'),
      'contestees', (select count(*) from public.affaire where statut = 'contestee'),
      'confirmees', (select count(*) from public.affaire where statut = 'confirmee'),
      'volume_fcfa', (select coalesce(sum(montant_fcfa), 0) from public.affaire where statut = 'confirmee'),
      'commission_a_facturer', (select coalesce(sum(montant_fcfa), 0) from public.commission where statut = 'a_facturer'),
      'commission_facturee', (select coalesce(sum(montant_fcfa), 0) from public.commission where statut = 'facturee'),
      'commission_payee', (select coalesce(sum(montant_fcfa), 0) from public.commission where statut = 'payee'),
      'taux', public.taux_commission_actuel()
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
-- VÉRIFICATION :
--   select cle, valeur from public.parametre;     -> taux_commission à 0 (à fixer dans l'administration)
-- Test dans l'application : depuis une conversation, « Déclarer une affaire conclue » (montant), puis confirmer depuis
-- l'autre compte : une ligne apparaît dans l'administration, onglet « Affaires et commissions ».
