-- 0026 — Lot 2 (retours du client) : recherche du catalogue, listes fermées de villes et communes, date de vérification
--
-- 1) lieu : villes (et communes) par pays, en listes fermées. Les fournisseurs choisissent dans ces listes ;
--    les valeurs existantes écrites à la main (« abidjan », « ADJAME »…) sont ramenées à la forme officielle.
--    Ajouter une ville : insert into public.lieu (pays_code, ville) values ('CI', 'Bondoukou');
--    Ajouter une commune : insert into public.lieu (pays_code, ville, commune) values ('CI', 'Abidjan', 'Anyama');
-- 2) grossiste.verifie_le : date à laquelle l'équipe a accordé le badge « vérifié » (affichée « Contrôlé par LOOHOO le … »).
-- 3) rechercher_catalogue() : recherche des produits publiés, filtres (pays, ville, commune, catégorie, prix, quantité, vérifiés),
--    tris (pertinence, nouveautés, prix, minimum), pagination, prix le plus bas des paliers. Les données de test sont exclues.
--    categories_catalogue() : catégories qui ont des produits, avec leur nombre.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

-- Texte sans accents ni majuscules, pour comparer « Adjamé », « ADJAME » et « adjame »
create or replace function public.sans_accent(p text)
returns text
language sql
immutable
as $$
  select lower(translate(coalesce(p, ''),
    'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝŸýÿ',
    'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYYyy'));
$$;

-- ---------------------------------------------------------------------------
-- 1) Villes et communes
-- ---------------------------------------------------------------------------
create table if not exists public.lieu (
  id bigint generated always as identity primary key,
  pays_code text not null references public.pays_loohoo (code),
  ville text not null,
  commune text,
  ordre integer not null default 100
);
create unique index if not exists lieu_unique_idx on public.lieu (pays_code, public.sans_accent(ville), public.sans_accent(coalesce(commune, '')));

alter table public.lieu enable row level security;
revoke all on public.lieu from anon, authenticated;
grant select on public.lieu to anon, authenticated;
drop policy if exists lieu_lecture on public.lieu;
create policy lieu_lecture on public.lieu for select to anon, authenticated using (true);

insert into public.lieu (pays_code, ville, commune, ordre) values
  ('CI', 'Abidjan', null, 1), ('CI', 'Bouaké', null, 2), ('CI', 'Yamoussoukro', null, 3), ('CI', 'San-Pédro', null, 4),
  ('CI', 'Daloa', null, 5), ('CI', 'Korhogo', null, 6), ('CI', 'Man', null, 7), ('CI', 'Gagnoa', null, 8),
  ('CI', 'Abengourou', null, 9), ('CI', 'Divo', null, 10), ('CI', 'Soubré', null, 11), ('CI', 'Bondoukou', null, 12),
  ('CI', 'Odienné', null, 13), ('CI', 'Séguéla', null, 14), ('CI', 'Grand-Bassam', null, 15), ('CI', 'Dabou', null, 16),
  ('CI', 'Abidjan', 'Abobo', 1), ('CI', 'Abidjan', 'Adjamé', 2), ('CI', 'Abidjan', 'Anyama', 3), ('CI', 'Abidjan', 'Attécoubé', 4),
  ('CI', 'Abidjan', 'Bingerville', 5), ('CI', 'Abidjan', 'Cocody', 6), ('CI', 'Abidjan', 'Koumassi', 7), ('CI', 'Abidjan', 'Marcory', 8),
  ('CI', 'Abidjan', 'Plateau', 9), ('CI', 'Abidjan', 'Port-Bouët', 10), ('CI', 'Abidjan', 'Songon', 11), ('CI', 'Abidjan', 'Treichville', 12),
  ('CI', 'Abidjan', 'Yopougon', 13),
  ('SN', 'Dakar', null, 1), ('SN', 'Touba', null, 2), ('SN', 'Thiès', null, 3), ('SN', 'Kaolack', null, 4), ('SN', 'Saint-Louis', null, 5),
  ('SN', 'Ziguinchor', null, 6), ('SN', 'Mbour', null, 7), ('SN', 'Rufisque', null, 8),
  ('CM', 'Douala', null, 1), ('CM', 'Yaoundé', null, 2), ('CM', 'Garoua', null, 3), ('CM', 'Bamenda', null, 4), ('CM', 'Bafoussam', null, 5),
  ('CM', 'Maroua', null, 6), ('CM', 'Ngaoundéré', null, 7), ('CM', 'Kribi', null, 8)
on conflict do nothing;

-- Ramène une ville ou une commune saisie à la main à sa forme officielle (si elle est dans la liste)
create or replace function public.grossiste_normaliser_lieu()
returns trigger
language plpgsql
as $$
declare
  officielle text;
begin
  if new.ville is not null then
    select l.ville into officielle from public.lieu l
    where l.pays_code = coalesce(new.pays_code, 'CI') and public.sans_accent(l.ville) = public.sans_accent(btrim(new.ville)) limit 1;
    if officielle is not null then new.ville := officielle; end if;
  end if;
  if new.commune is not null and btrim(new.commune) <> '' then
    officielle := null;
    select l.commune into officielle from public.lieu l
    where l.pays_code = coalesce(new.pays_code, 'CI') and l.commune is not null
      and public.sans_accent(l.ville) = public.sans_accent(new.ville) and public.sans_accent(l.commune) = public.sans_accent(btrim(new.commune)) limit 1;
    if officielle is not null then new.commune := officielle; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists grossiste_normaliser_lieu on public.grossiste;
create trigger grossiste_normaliser_lieu
  before insert or update of ville, commune, pays_code on public.grossiste
  for each row execute function public.grossiste_normaliser_lieu();

-- Les fournisseurs existants : on réécrit ville et commune (le déclencheur ci-dessus les met en forme)
update public.grossiste set ville = ville, commune = commune;

-- ---------------------------------------------------------------------------
-- 2) Date de vérification
-- ---------------------------------------------------------------------------
alter table public.grossiste add column if not exists verifie_le timestamptz;

create or replace function public.grossiste_date_verification()
returns trigger
language plpgsql
as $$
begin
  if new.badge_verifie and (tg_op = 'INSERT' or not coalesce(old.badge_verifie, false)) then
    new.verifie_le := now();
  elsif not coalesce(new.badge_verifie, false) then
    new.verifie_le := null;
  elsif tg_op = 'UPDATE' then
    new.verifie_le := coalesce(old.verifie_le, new.verifie_le);
  end if;
  return new;
end;
$$;

drop trigger if exists grossiste_date_verification on public.grossiste;
create trigger grossiste_date_verification
  before insert or update of badge_verifie on public.grossiste
  for each row execute function public.grossiste_date_verification();

-- Fournisseurs déjà vérifiés : date du journal d'audit si elle existe, sinon date d'inscription
update public.grossiste g
set verifie_le = coalesce(
  (select max(j.date_action) from public.journal_admin j where j.cible_type = 'grossiste' and j.cible_id = g.id::text and j.details ->> 'apres' = 'true'),
  g.date_ajout, now())
where g.badge_verifie and g.verifie_le is null;

grant select (verifie_le) on public.grossiste to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Recherche du catalogue
-- ---------------------------------------------------------------------------
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
  p_decalage integer default 0
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
revoke all on function public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer) from public;
grant execute on function public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer) to anon, authenticated;

create or replace function public.categories_catalogue()
returns table (categorie text, nombre integer)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.categorie, g.categorie) as categorie, count(*)::int
  from public.produit p
  join public.grossiste g on g.id = p.grossiste_id
  where p.statut = 'publie' and p.actif and not p.est_test and g.statut = 'publie' and not g.est_test
    and coalesce(p.categorie, g.categorie) is not null
  group by 1
  order by (coalesce(p.categorie, g.categorie) = 'Autre'), count(*) desc, 1;
$$;
revoke all on function public.categories_catalogue() from public;
grant execute on function public.categories_catalogue() to anon, authenticated;

-- « Fournisseurs à la une » : on ajoute la date d'inscription (« Membre depuis ») et la date de vérification
drop function if exists public.fournisseurs_a_la_une(integer);
create function public.fournisseurs_a_la_une(p_limite integer default 4)
returns table (
  id uuid, nom text, ville text, categorie text, logo_url text, badge_verifie boolean, est_fabricant boolean,
  nb_avis integer, note numeric, prix_min bigint, moq_prix_min integer, date_ajout timestamptz, verifie_le timestamptz, slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.nom, g.ville, g.categorie, g.logo_url, g.badge_verifie, g.est_fabricant,
         coalesce(av.nb, 0), av.moyenne, pm.prix::bigint, pm.moq::int, g.date_ajout, g.verifie_le, g.slug
  from public.grossiste g
  join lateral (
    select coalesce((select min((x ->> 'prix')::int) from jsonb_array_elements(coalesce(p.paliers, '[]'::jsonb)) x), p.prix_gros_fcfa) as prix, p.moq
    from public.produit p
    where p.grossiste_id = g.id and p.statut = 'publie' and p.actif and not p.est_test
    order by 1 asc
    limit 1
  ) pm on true
  left join lateral (
    select count(*)::int as nb, round(avg(a.note)::numeric, 1) as moyenne
    from public.avis a
    where a.grossiste_id = g.id and a.statut = 'publie'
  ) av on true
  where g.statut = 'publie' and not g.est_test
  order by g.badge_verifie desc, av.moyenne desc nulls last, g.date_ajout desc nulls last
  limit least(coalesce(p_limite, 4), 12);
$$;
revoke all on function public.fournisseurs_a_la_une(integer) from public;
grant execute on function public.fournisseurs_a_la_une(integer) to anon, authenticated;
