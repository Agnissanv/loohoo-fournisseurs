-- 0029 — Lot 4 (retours du client) : profil public du fournisseur
--
-- 1) Publication immédiate du profil : un fournisseur qui s'inscrit est en ligne tout de suite. Seul le badge « vérifié »
--    reste humain (visite sur place). Le pays reste modifiable jusqu'au badge, puis il est verrouillé.
-- 2) Contrôle à l'envoi : nom, présentation, vitrine et FAQ sont refusés s'ils contiennent une coordonnée ou une promesse
--    de santé, de résultat ou de livraison (comme les produits, migration 0027).
-- 3) Types neutres (Fabricant, Grossiste, Importateur, Producteur), origine de l'entreprise (affichée si le fournisseur le
--    choisit), langues parlées, et la vitrine « Présentation de l'entreprise » : année de création, spécialités, emplacement,
--    zones d'expédition, moyens de paiement, vidéo, champs selon le type, FAQ. Présentation jusqu'à 5 000 caractères.
-- 4) Documents vérifiés affichés sans numéro ni fichier, et filtre « origine du fournisseur » dans la recherche.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0028.

-- ---------------------------------------------------------------------------
-- 3) Nouveaux champs (créés d'abord : les fonctions plus bas s'en servent)
-- ---------------------------------------------------------------------------
alter table public.grossiste
  add column if not exists type_entreprise text,
  add column if not exists pays_origine text,
  add column if not exists afficher_origine boolean not null default false,
  add column if not exists langues text[] not null default '{fr}',
  add column if not exists annee_creation integer,
  add column if not exists specialites text,
  add column if not exists emplacement text,
  add column if not exists zones_expedition text,
  add column if not exists moyens_paiement text[] not null default '{}',
  add column if not exists video_presentation_url text,
  add column if not exists atelier text,
  add column if not exists nb_employes integer,
  add column if not exists capacite_production text,
  add column if not exists sur_mesure boolean,
  add column if not exists pose_logo boolean,
  add column if not exists pays_provenance text,
  add column if not exists marques text,
  add column if not exists frequence_arrivages text,
  add column if not exists faq jsonb not null default '[]'::jsonb;

do $$
begin
  alter table public.grossiste drop constraint if exists grossiste_type_entreprise_check;
  alter table public.grossiste add constraint grossiste_type_entreprise_check
    check (type_entreprise is null or type_entreprise in ('fabricant', 'grossiste', 'importateur', 'producteur'));
  alter table public.grossiste drop constraint if exists grossiste_vitrine_check;
  alter table public.grossiste add constraint grossiste_vitrine_check check (
    (annee_creation is null or annee_creation between 1900 and 2100)
    and (nb_employes is null or nb_employes between 1 and 100000)
    and (pays_origine is null or pays_origine ~ '^[A-Z]{2}$')
    and cardinality(langues) <= 12
    and moyens_paiement <@ array['mobile_money', 'especes', 'virement', 'carte', 'cheque']
    and char_length(coalesce(specialites, '')) <= 400
    and char_length(coalesce(emplacement, '')) <= 200
    and char_length(coalesce(zones_expedition, '')) <= 400
    and char_length(coalesce(atelier, '')) <= 800
    and char_length(coalesce(capacite_production, '')) <= 200
    and char_length(coalesce(pays_provenance, '')) <= 200
    and char_length(coalesce(marques, '')) <= 400
    and char_length(coalesce(frequence_arrivages, '')) <= 120
    and jsonb_typeof(faq) = 'array' and jsonb_array_length(faq) <= 12
  );
  -- « Sans limite de longueur » côté client : 5 000 caractères suffisent largement à une présentation
  alter table public.grossiste drop constraint if exists grossiste_description_longueur;
  alter table public.grossiste add constraint grossiste_description_longueur check (description is null or char_length(description) <= 5000);
end $$;

-- Fournisseurs existants : type déduit de l'ancienne case « fabricant »
update public.grossiste set type_entreprise = case when est_fabricant then 'fabricant' else 'grossiste' end where type_entreprise is null;

grant select (type_entreprise, pays_origine, afficher_origine, langues, annee_creation, specialites, emplacement, zones_expedition,
              moyens_paiement, video_presentation_url, atelier, nb_employes, capacite_production, sur_mesure, pose_logo,
              pays_provenance, marques, frequence_arrivages, faq) on public.grossiste to anon, authenticated;
grant insert (type_entreprise, pays_origine, afficher_origine, langues, annee_creation, specialites, emplacement, zones_expedition,
              moyens_paiement, video_presentation_url, atelier, nb_employes, capacite_production, sur_mesure, pose_logo,
              pays_provenance, marques, frequence_arrivages, faq),
      update (type_entreprise, pays_origine, afficher_origine, langues, annee_creation, specialites, emplacement, zones_expedition,
              moyens_paiement, video_presentation_url, atelier, nb_employes, capacite_production, sur_mesure, pose_logo,
              pays_provenance, marques, frequence_arrivages, faq) on public.grossiste to authenticated;

-- Le type et l'ancienne case restent d'accord (le badge « Fabricant local » s'appuie encore sur est_fabricant) ; FAQ vérifiée
create or replace function public.grossiste_type_et_faq()
returns trigger
language plpgsql
as $$
declare
  q jsonb;
begin
  if new.type_entreprise is null then
    new.type_entreprise := case when new.est_fabricant then 'fabricant' else 'grossiste' end;
  elsif tg_op = 'INSERT' or new.type_entreprise is distinct from old.type_entreprise then
    new.est_fabricant := new.type_entreprise = 'fabricant';
  elsif new.est_fabricant is distinct from old.est_fabricant then
    new.type_entreprise := case when new.est_fabricant then 'fabricant' else 'grossiste' end;
  end if;
  new.pays_origine := nullif(upper(btrim(coalesce(new.pays_origine, ''))), '');
  if new.annee_creation is not null and new.annee_creation > extract(year from now())::int then
    raise exception 'L''année de création ne peut pas être dans le futur.' using errcode = '22023';
  end if;
  for q in select * from jsonb_array_elements(coalesce(new.faq, '[]'::jsonb)) loop
    if jsonb_typeof(q -> 'q') <> 'string' or jsonb_typeof(q -> 'r') <> 'string'
       or btrim(q ->> 'q') = '' or btrim(q ->> 'r') = '' then
      raise exception 'Chaque question de la FAQ doit avoir une question et une réponse.' using errcode = '22023';
    end if;
    if char_length(q ->> 'q') > 200 or char_length(q ->> 'r') > 1000 then
      raise exception 'FAQ : 200 caractères au plus par question et 1 000 par réponse.' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists grossiste_type_et_faq on public.grossiste;
create trigger grossiste_type_et_faq
  before insert or update on public.grossiste
  for each row execute function public.grossiste_type_et_faq();

-- ---------------------------------------------------------------------------
-- 2) Contrôle à l'envoi (remplace la mise en attente de la migration 0008)
-- ---------------------------------------------------------------------------
create or replace function public.grossiste_controle_contenu()
returns trigger
language plpgsql
as $$
declare
  texte text := concat_ws(' ', new.nom, new.description, new.specialites, new.emplacement, new.zones_expedition, new.atelier,
                          new.capacite_production, new.pays_provenance, new.marques, new.frequence_arrivages,
                          (select string_agg(concat_ws(' ', x ->> 'q', x ->> 'r'), ' ') from jsonb_array_elements(coalesce(new.faq, '[]'::jsonb)) x));
  problemes text[] := '{}';
begin
  new.drapeau_coordonnees := public.contient_coordonnees(texte);
  -- Le fournisseur (connecté, même à travers une fonction de l'inscription) ; jamais l'équipe ni l'éditeur SQL
  if auth.uid() is not null and not public.is_admin()
     and (tg_op = 'INSERT'
          or new.nom is distinct from old.nom or new.description is distinct from old.description
          or new.specialites is distinct from old.specialites or new.emplacement is distinct from old.emplacement
          or new.zones_expedition is distinct from old.zones_expedition or new.atelier is distinct from old.atelier
          or new.capacite_production is distinct from old.capacite_production or new.pays_provenance is distinct from old.pays_provenance
          or new.marques is distinct from old.marques or new.frequence_arrivages is distinct from old.frequence_arrivages
          or new.faq is distinct from old.faq) then
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
-- 1) Publication immédiate du profil
-- ---------------------------------------------------------------------------
create or replace function public.grossiste_publication_immediate()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.statut := 'publie';
  end if;
  return new;
end;
$$;

drop trigger if exists grossiste_publication_immediate on public.grossiste;
create trigger grossiste_publication_immediate
  before insert on public.grossiste
  for each row execute function public.grossiste_publication_immediate();

-- Profils en attente de l'ancien fonctionnement : publiés une fois pour toutes (sauf ceux qui contiennent une coordonnée)
do $$
begin
  if not exists (select 1 from public.parametre where cle = 'profils_publication_immediate_initialisee') then
    update public.grossiste set statut = 'publie' where statut = 'en_attente' and not coalesce(drapeau_coordonnees, false);
    insert into public.parametre (cle, valeur) values ('profils_publication_immediate_initialisee', 'true'::jsonb);
  end if;
end $$;

-- Le pays se verrouille au badge « vérifié » (et non plus à la publication, qui est maintenant immédiate)
create or replace function public.grossiste_pays()
returns trigger
language plpgsql
as $$
declare
  equipe boolean := current_user not in ('anon', 'authenticated') or public.is_admin();
begin
  if new.pays_code is null then
    new.pays_code := case when tg_op = 'UPDATE' then coalesce(old.pays_code, 'CI') else 'CI' end;
  end if;
  new.pays_code := upper(new.pays_code);

  if not equipe then
    if tg_op = 'UPDATE' and new.pays_code is distinct from old.pays_code and coalesce(old.badge_verifie, false) then
      -- Fournisseur vérifié sur place : le pays est verrouillé
      new.pays_code := old.pays_code;
    elsif (tg_op = 'INSERT' or new.pays_code is distinct from old.pays_code)
      and not exists (select 1 from public.pays_loohoo where code = new.pays_code and actif) then
      raise exception 'LOOHOO n''est pas encore ouvert dans ce pays.' using errcode = '22023';
    end if;
  end if;

  new.pays := (select nom from public.pays_loohoo where code = new.pays_code);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Documents vérifiés (sans numéro ni fichier) et filtre « origine »
-- ---------------------------------------------------------------------------
create or replace function public.documents_verifies(p_grossiste_id uuid)
returns table (type text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct d.type
  from public.document_fournisseur d
  join public.grossiste g on g.id = d.grossiste_id
  where d.grossiste_id = p_grossiste_id and d.statut = 'verifie'
    and g.statut = 'publie' and not g.est_test
    and d.type in ('rccm', 'piece_identite', 'attestation_residence', 'certificat_conformite');
$$;
revoke all on function public.documents_verifies(uuid) from public;
grant execute on function public.documents_verifies(uuid) to anon, authenticated;

-- Pays d'origine des fournisseurs qui choisissent de l'afficher (pour la liste du filtre)
create or replace function public.origines_fournisseurs()
returns table (pays_origine text, nombre integer)
language sql
stable
security definer
set search_path = public
as $$
  select g.pays_origine, count(*)::int
  from public.grossiste g
  where g.statut = 'publie' and not g.est_test and g.afficher_origine and g.pays_origine is not null
  group by g.pays_origine
  order by count(*) desc, g.pays_origine;
$$;
revoke all on function public.origines_fournisseurs() from public;
grant execute on function public.origines_fournisseurs() to anon, authenticated;

-- La recherche du catalogue (migration 0026) reçoit le filtre « origine »
drop function if exists public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer);
create or replace function public.rechercher_catalogue(
  p_q text default null,
  p_categorie text default null,
  p_pays text default null,
  p_ville text default null,
  p_commune text default null,
  p_prix_max integer default null,
  p_qte_max integer default null,
  p_verifies boolean default false,
  p_tri text default 'pertinence',
  p_limite integer default 24,
  p_decalage integer default 0,
  p_origine text default null
)
returns table (
  id uuid, nom text, photo_url text, prix_gros_fcfa integer, prix_min integer, moq integer, unite text, categorie text,
  date_ajout timestamptz, grossiste_id uuid, grossiste_nom text, badge_verifie boolean, ville text, commune text, pays_code text,
  total bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with mots as (select nullif(public.sans_accent(btrim(coalesce(p_q, ''))), '') as q),
  base as (
    select p.id, p.nom, p.photo_url, p.prix_gros_fcfa::int as prix_gros_fcfa,
           coalesce((select min((x ->> 'prix')::int) from jsonb_array_elements(coalesce(p.paliers, '[]'::jsonb)) x), p.prix_gros_fcfa)::int as prix_min,
           coalesce(p.moq, 1)::int as moq, p.unite, coalesce(p.categorie, g.categorie) as categorie, p.date_ajout,
           g.id as grossiste_id, g.nom as grossiste_nom, g.badge_verifie, g.ville, g.commune, g.pays_code,
           case
             when m.q is null then 0
             when public.sans_accent(p.nom) like '%' || m.q || '%' then 3
             when exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where public.sans_accent(t) like '%' || m.q || '%') then 2
             else 1
           end as score
    from public.produit p
    join public.grossiste g on g.id = p.grossiste_id
    cross join mots m
    where p.statut = 'publie' and p.actif and not p.est_test
      and g.statut = 'publie' and not g.est_test
      and (m.q is null
           or public.sans_accent(p.nom) like '%' || m.q || '%'
           or public.sans_accent(p.description) like '%' || m.q || '%'
           or public.sans_accent(coalesce(p.categorie, g.categorie)) like '%' || m.q || '%'
           or public.sans_accent(p.sous_categorie) like '%' || m.q || '%'
           or public.sans_accent(g.nom) like '%' || m.q || '%'
           or exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where public.sans_accent(t) like '%' || m.q || '%'))
      and (nullif(p_categorie, '') is null or coalesce(p.categorie, g.categorie) = p_categorie)
      and (nullif(p_pays, '') is null or g.pays_code = upper(p_pays))
      and (nullif(p_ville, '') is null or public.sans_accent(g.ville) = public.sans_accent(p_ville))
      and (nullif(p_commune, '') is null or public.sans_accent(g.commune) = public.sans_accent(p_commune))
      and (p_qte_max is null or coalesce(p.moq, 1) <= p_qte_max)
      and (not coalesce(p_verifies, false) or g.badge_verifie)
      and (nullif(p_origine, '') is null or (g.afficher_origine and g.pays_origine = upper(p_origine)))
  ),
  filtres as (select * from base where p_prix_max is null or prix_min <= p_prix_max)
  select f.id, f.nom, f.photo_url, f.prix_gros_fcfa, f.prix_min, f.moq, f.unite, f.categorie, f.date_ajout,
         f.grossiste_id, f.grossiste_nom, f.badge_verifie, f.ville, f.commune, f.pays_code,
         count(*) over () as total
  from filtres f
  order by
    case when p_tri = 'prix_asc' then f.prix_min end asc nulls last,
    case when p_tri = 'prix_desc' then f.prix_gros_fcfa end desc nulls last,
    case when p_tri = 'moq_asc' then f.moq end asc nulls last,
    case when p_tri = 'nouveautes' then f.date_ajout end desc nulls last,
    f.score desc, f.badge_verifie desc, f.date_ajout desc nulls last, f.id
  limit least(greatest(coalesce(p_limite, 24), 1), 100)
  offset greatest(coalesce(p_decalage, 0), 0);
$$;
revoke all on function public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer, text) from public;
grant execute on function public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer, text) to anon, authenticated;

notify pgrst, 'reload schema';
