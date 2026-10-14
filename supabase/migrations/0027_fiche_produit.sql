-- 0027 — Lot 3 (retours du client) : fiche produit
--
-- 1) Publication immédiate : un produit ajouté ou modifié par le fournisseur est publié tout de suite. L'équipe intervient
--    après coup (rejet avec motif). Un produit rejeté puis corrigé repasse en vérification.
-- 2) Contrôle à l'envoi : nom, description et mots-clés sont refusés tout de suite s'ils contiennent une coordonnée
--    (numéro, e-mail, lien, pseudo) ou une promesse de santé, de résultat ou de livraison. Le fournisseur voit pourquoi.
-- 3) Caractéristiques : usage, conditionnement, origine, délai de préparation (obligatoires dans le formulaire),
--    et facultatives : matière, marque, modèle, variantes, capacité mensuelle, personnalisation, échantillon.
-- 4) Paliers de prix : trois au maximum, le prix de base (à partir du minimum de commande) comptant pour le premier.
-- 5) Favoris produits (comparer avant de commander), certificats (fournis par le fournisseur, vérifiés par l'équipe),
--    signalements (« Signaler ce produit »).
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0026.

-- ---------------------------------------------------------------------------
-- 1) Publication immédiate
-- ---------------------------------------------------------------------------
create or replace function public.produit_proteger_moderation()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.statut := 'publie';
    new.motif_rejet := null;
    new.verifie_par := null;
    new.verifie_le := null;
    return new;
  end if;

  new.verifie_par := old.verifie_par;
  new.verifie_le := old.verifie_le;

  if old.statut = 'rejete' then
    -- Le fournisseur corrige un produit rejeté : il repasse en vérification (motif effacé)
    if new.nom is distinct from old.nom or new.description is distinct from old.description
       or new.categorie is distinct from old.categorie or new.tags is distinct from old.tags
       or new.prix_gros_fcfa is distinct from old.prix_gros_fcfa or new.photo_url is distinct from old.photo_url then
      new.statut := 'en_attente';
      new.motif_rejet := null;
    else
      new.statut := old.statut;
      new.motif_rejet := old.motif_rejet;
    end if;
  else
    -- Publié ou en attente : le fournisseur ne choisit pas le statut, il reste tel quel
    new.statut := old.statut;
    new.motif_rejet := old.motif_rejet;
  end if;
  return new;
end;
$$;

-- Produits en attente de l'ancien fonctionnement : publiés une fois pour toutes (sauf ceux qui contiennent une coordonnée)
do $$
begin
  if not exists (select 1 from public.parametre where cle = 'publication_immediate_initialisee') then
    update public.produit set statut = 'publie' where statut = 'en_attente' and not coalesce(drapeau_coordonnees, false);
    insert into public.parametre (cle, valeur) values ('publication_immediate_initialisee', 'true'::jsonb);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Contrôle à l'envoi
-- ---------------------------------------------------------------------------
-- Promesses interdites : renvoie les catégories trouvées (vide si rien)
create or replace function public.promesses_interdites(p_texte text)
returns text[]
language sql
immutable
as $$
  select array_remove(array[
    case when public.sans_accent(p_texte) ~ '(guerit|guerir|guerison|soigne |soigner|remede|miracle|maigrir|minceur|perdre du poids|perte de poids|ventre plat|diminuer le ventre|reduire le ventre|bruler les graisses|brule[- ]graisse|anti[- ]?cancer|contre le cancer|contre le diabete|traite l.hypertension)'
      then 'une promesse de santé' end,
    case when public.sans_accent(p_texte) ~ '(resultats? garantis?|efficacite garantie|100 ?% garanti|satisfait ou rembourse|resultat en [0-9]+ (jours|semaines|heures)|en [0-9]+ jours seulement)'
      then 'une promesse de résultat' end,
    case when public.sans_accent(p_texte) ~ '(livraison (gratuite|offerte|garantie|express|rapide garantie|partout)|livre(e|es|s)? en [0-9]+ ?h|livre(e|es|s)? partout)'
      then 'une promesse de livraison' end
  ], null);
$$;

create or replace function public.produit_controle_contenu()
returns trigger
language plpgsql
as $$
declare
  texte text := coalesce(new.nom, '') || ' ' || coalesce(new.description, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '') || ' ' || coalesce(new.usage, '');
  problemes text[] := '{}';
begin
  new.drapeau_coordonnees := public.contient_coordonnees(texte || ' ' || coalesce(new.sku, ''));
  if current_user in ('anon', 'authenticated') and not public.is_admin()
     and (tg_op = 'INSERT' or new.nom is distinct from old.nom or new.description is distinct from old.description
          or new.tags is distinct from old.tags or new.usage is distinct from old.usage or new.sku is distinct from old.sku) then
    if new.drapeau_coordonnees then
      problemes := array_append(problemes, 'une coordonnée (numéro, e-mail, lien ou pseudo)');
    end if;
    problemes := problemes || public.promesses_interdites(texte);
    if cardinality(problemes) > 0 then
      raise exception 'Votre texte contient %. Retirez-la pour publier : les acheteurs vous contactent par LOOHOO, et les promesses de santé, de résultat ou de livraison ne sont pas autorisées.',
        array_to_string(problemes, ', ') using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Caractéristiques
-- ---------------------------------------------------------------------------
alter table public.produit
  add column if not exists usage text,
  add column if not exists pieces_par_carton integer check (pieces_par_carton is null or pieces_par_carton > 0),
  add column if not exists poids_carton_kg numeric check (poids_carton_kg is null or poids_carton_kg > 0),
  add column if not exists origine_produit text,
  add column if not exists delai_preparation_jours integer check (delai_preparation_jours is null or delai_preparation_jours >= 0),
  add column if not exists matiere text,
  add column if not exists marque text,
  add column if not exists modele text,
  add column if not exists variantes text,
  add column if not exists capacite_mensuelle integer check (capacite_mensuelle is null or capacite_mensuelle > 0),
  add column if not exists personnalisable boolean,
  add column if not exists echantillon_disponible boolean,
  add column if not exists prix_echantillon integer check (prix_echantillon is null or prix_echantillon >= 0);

grant select (usage, pieces_par_carton, poids_carton_kg, origine_produit, delai_preparation_jours, matiere, marque, modele, variantes,
              capacite_mensuelle, personnalisable, echantillon_disponible, prix_echantillon) on public.produit to anon, authenticated;
grant insert (usage, pieces_par_carton, poids_carton_kg, origine_produit, delai_preparation_jours, matiere, marque, modele, variantes,
              capacite_mensuelle, personnalisable, echantillon_disponible, prix_echantillon),
      update (usage, pieces_par_carton, poids_carton_kg, origine_produit, delai_preparation_jours, matiere, marque, modele, variantes,
              capacite_mensuelle, personnalisable, echantillon_disponible, prix_echantillon) on public.produit to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Trois paliers au maximum : le prix de base + deux paliers dégressifs
-- ---------------------------------------------------------------------------
create or replace function public.produit_verifier_paliers()
returns trigger
language plpgsql
as $$
declare
  p jsonb;
  qte_prec bigint := coalesce(new.moq, 1);
  prix_prec numeric := new.prix_gros_fcfa;
begin
  if new.paliers is null then
    new.paliers := '[]'::jsonb;
  end if;
  if jsonb_typeof(new.paliers) <> 'array' then
    raise exception 'Les paliers de prix doivent former une liste.';
  end if;
  if jsonb_array_length(new.paliers) > 2 then
    raise exception 'Trois paliers de prix au maximum : le prix de base et deux paliers dégressifs.';
  end if;
  for p in select * from jsonb_array_elements(new.paliers) loop
    if jsonb_typeof(p -> 'min') <> 'number' or jsonb_typeof(p -> 'prix') <> 'number' then
      raise exception 'Chaque palier doit avoir une quantité et un prix.';
    end if;
    if (p ->> 'min')::numeric <> trunc((p ->> 'min')::numeric) or (p ->> 'prix')::numeric <> trunc((p ->> 'prix')::numeric) then
      raise exception 'Quantités et prix des paliers : nombres entiers uniquement.';
    end if;
    if (p ->> 'min')::bigint <= qte_prec then
      raise exception 'Chaque palier doit commencer à une quantité supérieure au précédent (et au minimum de commande).';
    end if;
    if (p ->> 'prix')::numeric >= prix_prec or (p ->> 'prix')::numeric < 0 then
      raise exception 'Le prix d''un palier doit être inférieur au prix du palier précédent.';
    end if;
    qte_prec := (p ->> 'min')::bigint;
    prix_prec := (p ->> 'prix')::numeric;
  end loop;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5a) Favoris produits
-- ---------------------------------------------------------------------------
create table if not exists public.favori_produit (
  vendeur_id uuid not null,
  produit_id uuid not null,
  date_ajout timestamptz not null default now(),
  primary key (vendeur_id, produit_id)
);
alter table public.favori_produit enable row level security;
revoke all on public.favori_produit from anon, authenticated;

create or replace function public.basculer_favori_produit(p_produit_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v uuid;
begin
  select id into v from public.vendeur where user_id = auth.uid();
  if v is null then
    raise exception 'Réservé aux comptes acheteurs.' using errcode = '42501';
  end if;
  if exists (select 1 from public.favori_produit where vendeur_id = v and produit_id = p_produit_id) then
    delete from public.favori_produit where vendeur_id = v and produit_id = p_produit_id;
    return false;
  end if;
  insert into public.favori_produit (vendeur_id, produit_id) values (v, p_produit_id);
  return true;
end;
$$;
revoke all on function public.basculer_favori_produit(uuid) from public, anon;
grant execute on function public.basculer_favori_produit(uuid) to authenticated;

create or replace function public.est_favori_produit(p_produit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.favori_produit f join public.vendeur v on v.id = f.vendeur_id
                 where v.user_id = auth.uid() and f.produit_id = p_produit_id);
$$;
revoke all on function public.est_favori_produit(uuid) from public, anon;
grant execute on function public.est_favori_produit(uuid) to authenticated;

create or replace function public.mes_produits_favoris()
returns table (id uuid, nom text, photo_url text, prix_gros_fcfa integer, prix_min integer, moq integer, unite text,
               date_ajout timestamptz, grossiste_id uuid, grossiste_nom text, badge_verifie boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nom, p.photo_url, p.prix_gros_fcfa::int,
         coalesce((select min((x ->> 'prix')::int) from jsonb_array_elements(coalesce(p.paliers, '[]'::jsonb)) x), p.prix_gros_fcfa)::int,
         coalesce(p.moq, 1)::int, p.unite, p.date_ajout, g.id, g.nom, g.badge_verifie
  from public.favori_produit f
  join public.vendeur v on v.id = f.vendeur_id and v.user_id = auth.uid()
  join public.produit p on p.id = f.produit_id and p.statut = 'publie' and p.actif and not p.est_test
  join public.grossiste g on g.id = p.grossiste_id and g.statut = 'publie' and not g.est_test
  order by f.date_ajout desc;
$$;
revoke all on function public.mes_produits_favoris() from public, anon;
grant execute on function public.mes_produits_favoris() to authenticated;

-- ---------------------------------------------------------------------------
-- 5b) Certificats (cosmétique, alimentaire, électronique…)
-- ---------------------------------------------------------------------------
create table if not exists public.certificat_produit (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid not null references public.produit (id) on delete cascade,
  type_certificat text not null,
  organisme text not null,
  date_expiration date,
  chemin text,
  statut text not null default 'fourni' check (statut in ('fourni', 'verifie', 'rejete')),
  date_ajout timestamptz not null default now(),
  verifie_le timestamptz
);
create index if not exists certificat_produit_idx on public.certificat_produit (produit_id);
alter table public.certificat_produit enable row level security;
revoke all on public.certificat_produit from anon, authenticated;

create or replace function public.ajouter_certificat(p_produit_id uuid, p_type text, p_organisme text, p_date_expiration date, p_chemin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nouveau uuid;
begin
  if not exists (select 1 from public.produit p join public.grossiste g on g.id = p.grossiste_id where p.id = p_produit_id and g.user_id = auth.uid()) then
    raise exception 'Ce produit ne vous appartient pas.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_type), '') = '' or coalesce(btrim(p_organisme), '') = '' then
    raise exception 'Indiquez le type de certificat et l''organisme qui l''a délivré.';
  end if;
  insert into public.certificat_produit (produit_id, type_certificat, organisme, date_expiration, chemin)
  values (p_produit_id, btrim(p_type), btrim(p_organisme), p_date_expiration, p_chemin)
  returning id into nouveau;
  return nouveau;
end;
$$;
revoke all on function public.ajouter_certificat(uuid, text, text, date, text) from public, anon;
grant execute on function public.ajouter_certificat(uuid, text, text, date, text) to authenticated;

create or replace function public.supprimer_certificat(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.certificat_produit c
  using public.produit p, public.grossiste g
  where c.id = p_id and p.id = c.produit_id and g.id = p.grossiste_id and (g.user_id = auth.uid() or public.is_admin());
end;
$$;
revoke all on function public.supprimer_certificat(uuid) from public, anon;
grant execute on function public.supprimer_certificat(uuid) to authenticated;

-- Certificats d'un produit : tous pour son propriétaire et l'équipe ; pour le public, seulement ceux qui ne sont ni rejetés ni expirés
create or replace function public.certificats_produit(p_produit_id uuid)
returns table (id uuid, type_certificat text, organisme text, date_expiration date, statut text, verifie_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.type_certificat, c.organisme, c.date_expiration, c.statut, c.verifie_le
  from public.certificat_produit c
  join public.produit p on p.id = c.produit_id
  join public.grossiste g on g.id = p.grossiste_id
  where c.produit_id = p_produit_id
    and (g.user_id = auth.uid() or public.is_admin()
         or (c.statut <> 'rejete' and (c.date_expiration is null or c.date_expiration >= current_date)))
  order by c.statut = 'verifie' desc, c.date_ajout;
$$;
revoke all on function public.certificats_produit(uuid) from public;
grant execute on function public.certificats_produit(uuid) to anon, authenticated;

create or replace function public.admin_verifier_certificat(p_id uuid, p_statut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then -- éditeur SQL de Supabase (sans utilisateur) : autorisé
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('fourni', 'verifie', 'rejete') then
    raise exception 'Statut inconnu.';
  end if;
  update public.certificat_produit set statut = p_statut, verifie_le = case when p_statut = 'verifie' then now() else null end where id = p_id;
  perform public.journaliser('certificat_' || p_statut, 'certificat', p_id::text, '{}'::jsonb);
end;
$$;
revoke all on function public.admin_verifier_certificat(uuid, text) from public, anon;
grant execute on function public.admin_verifier_certificat(uuid, text) to authenticated;

-- Liste pour l'équipe : certificats à vérifier (ou déjà traités), avec le chemin du fichier dans le bucket « documents »
create or replace function public.admin_certificats(p_statut text default 'fourni')
returns table (id uuid, produit_id uuid, produit_nom text, grossiste_id uuid, grossiste_nom text, type_certificat text, organisme text,
               date_expiration date, chemin text, statut text, date_ajout timestamptz, verifie_le timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then -- éditeur SQL de Supabase (sans utilisateur) : autorisé
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  return query
    select c.id, p.id, p.nom, g.id, g.nom, c.type_certificat, c.organisme, c.date_expiration, c.chemin, c.statut, c.date_ajout, c.verifie_le
    from public.certificat_produit c
    join public.produit p on p.id = c.produit_id
    join public.grossiste g on g.id = p.grossiste_id
    where p_statut is null or c.statut = p_statut
    order by c.date_ajout desc
    limit 300;
end;
$$;
revoke all on function public.admin_certificats(text) from public, anon;
grant execute on function public.admin_certificats(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5c) Signalements
-- ---------------------------------------------------------------------------
create table if not exists public.signalement_produit (
  id bigint generated always as identity primary key,
  produit_id uuid not null references public.produit (id) on delete cascade,
  motif text not null check (motif in ('fausse_photo', 'prix_non_respecte', 'promesse_trompeuse', 'autre')),
  details text check (details is null or char_length(details) <= 500),
  auteur uuid,
  traite boolean not null default false,
  date_signalement timestamptz not null default now()
);
create index if not exists signalement_produit_idx on public.signalement_produit (produit_id, traite);
alter table public.signalement_produit enable row level security;
revoke all on public.signalement_produit from anon, authenticated;

create or replace function public.signaler_produit(p_produit_id uuid, p_motif text, p_details text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_motif not in ('fausse_photo', 'prix_non_respecte', 'promesse_trompeuse', 'autre') then
    raise exception 'Motif inconnu.';
  end if;
  if not exists (select 1 from public.produit where id = p_produit_id) then
    raise exception 'Produit introuvable.';
  end if;
  insert into public.signalement_produit (produit_id, motif, details, auteur)
  values (p_produit_id, p_motif, nullif(left(btrim(coalesce(p_details, '')), 500), ''), auth.uid());
end;
$$;
revoke all on function public.signaler_produit(uuid, text, text) from public;
grant execute on function public.signaler_produit(uuid, text, text) to anon, authenticated;

create or replace function public.admin_signalements_produits(p_traites boolean default false)
returns table (id bigint, produit_id uuid, produit_nom text, grossiste_nom text, motif text, details text, date_signalement timestamptz, traite boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then -- éditeur SQL de Supabase (sans utilisateur) : autorisé
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  return query
    select s.id, s.produit_id, p.nom, g.nom, s.motif, s.details, s.date_signalement, s.traite
    from public.signalement_produit s
    join public.produit p on p.id = s.produit_id
    join public.grossiste g on g.id = p.grossiste_id
    where s.traite = coalesce(p_traites, false)
    order by s.date_signalement desc
    limit 300;
end;
$$;
revoke all on function public.admin_signalements_produits(boolean) from public, anon;
grant execute on function public.admin_signalements_produits(boolean) to authenticated;
