-- 0019 — Données de l'accueil public : chiffres réels et fournisseurs à la une
--
-- chiffres_publics()        : nombre de fournisseurs publiés, vérifiés, de produits publiés et de pays (comptés, jamais saisis à la main)
-- fournisseurs_a_la_une(n)  : fournisseurs publiés qui ont au moins un produit publié, avec leur note moyenne (avis validés) et
--                             leur prix de gros le plus bas. Ordre : vérifiés d'abord, puis mieux notés, puis plus récents.
-- Rien de privé n'en sort : pas de téléphone, d'adresse ni de nom d'acheteur.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.
-- Prérequis : migration 0016 (table avis).

create or replace function public.chiffres_publics()
returns table (fournisseurs integer, verifies integer, produits integer, pays integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.grossiste where statut = 'publie'),
    (select count(*)::int from public.grossiste where statut = 'publie' and badge_verifie),
    (select count(*)::int from public.produit p join public.grossiste g on g.id = p.grossiste_id
       where p.statut = 'publie' and p.actif and g.statut = 'publie'),
    (select count(distinct nullif(btrim(pays), ''))::int from public.grossiste where statut = 'publie');
$$;
revoke all on function public.chiffres_publics() from public;
grant execute on function public.chiffres_publics() to anon, authenticated;

create or replace function public.fournisseurs_a_la_une(p_limite integer default 4)
returns table (
  id uuid, nom text, ville text, categorie text, logo_url text, badge_verifie boolean, est_fabricant boolean,
  nb_avis integer, note numeric, prix_min bigint, moq_prix_min integer
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.nom, g.ville, g.categorie, g.logo_url, g.badge_verifie, g.est_fabricant,
         coalesce(av.nb, 0), av.moyenne, pm.prix::bigint, pm.moq::int
  from public.grossiste g
  join lateral (
    select p.prix_gros_fcfa as prix, p.moq
    from public.produit p
    where p.grossiste_id = g.id and p.statut = 'publie' and p.actif
    order by p.prix_gros_fcfa asc
    limit 1
  ) pm on true
  left join lateral (
    select count(*)::int as nb, round(avg(a.note)::numeric, 1) as moyenne
    from public.avis a
    where a.grossiste_id = g.id and a.statut = 'publie'
  ) av on true
  where g.statut = 'publie'
  order by g.badge_verifie desc, av.moyenne desc nulls last, g.date_ajout desc nulls last
  limit least(coalesce(p_limite, 4), 12);
$$;
revoke all on function public.fournisseurs_a_la_une(integer) from public;
grant execute on function public.fournisseurs_a_la_une(integer) to anon, authenticated;
