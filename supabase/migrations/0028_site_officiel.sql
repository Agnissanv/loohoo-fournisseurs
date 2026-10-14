-- 0028 — Site officiel (retours du client du 13 oct 2026) : ce que la page d'accueil de looh-oo.com lit dans la base
--
-- 1) « Nos premiers fournisseurs vérifiés » : le fournisseur accepte d'apparaître sur le site officiel (case dans son profil),
--    et l'équipe ajoute les photos prises lors de la visite terrain (table photo_terrain, réutilisée par le profil public).
-- 2) « Le marché en direct » : activité réelle et récente de la plateforme (fournisseur vérifié, nouveau produit,
--    fournisseur qui ajoute des produits), sans donnée privée et sans les données de test.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0027.

-- ---------------------------------------------------------------------------
-- 1) Premiers fournisseurs vérifiés
-- ---------------------------------------------------------------------------
alter table public.grossiste add column if not exists afficher_site_officiel boolean not null default false;
grant select (afficher_site_officiel) on public.grossiste to anon, authenticated;
grant insert (afficher_site_officiel), update (afficher_site_officiel) on public.grossiste to authenticated;

-- Photos prises par l'équipe LOOHOO pendant la visite terrain (« Photo vérifiée par LOOHOO le… »)
create table if not exists public.photo_terrain (
  id uuid primary key default gen_random_uuid(),
  grossiste_id uuid not null references public.grossiste (id) on delete cascade,
  url text not null,
  prise_le date not null default current_date,
  date_ajout timestamptz not null default now()
);
create index if not exists photo_terrain_idx on public.photo_terrain (grossiste_id, prise_le desc);
alter table public.photo_terrain enable row level security;
revoke all on public.photo_terrain from anon, authenticated;

-- Lecture publique : seulement pour un fournisseur publié (jamais un fournisseur de test)
create or replace function public.photos_terrain(p_grossiste_id uuid)
returns table (id uuid, url text, prise_le date)
language sql
stable
security definer
set search_path = public
as $$
  select ph.id, ph.url, ph.prise_le
  from public.photo_terrain ph
  join public.grossiste g on g.id = ph.grossiste_id
  where ph.grossiste_id = p_grossiste_id
    and ((g.statut = 'publie' and not g.est_test) or g.user_id = auth.uid() or public.is_admin())
  order by ph.prise_le desc, ph.date_ajout desc;
$$;
revoke all on function public.photos_terrain(uuid) from public;
grant execute on function public.photos_terrain(uuid) to anon, authenticated;

-- Réservé à l'équipe (aussi utilisable depuis l'éditeur SQL de Supabase)
create or replace function public.admin_ajouter_photo_terrain(p_grossiste_id uuid, p_url text, p_prise_le date default current_date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nouveau uuid;
begin
  if auth.uid() is not null and not public.is_admin() then -- éditeur SQL de Supabase (sans utilisateur) : autorisé
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if coalesce(btrim(p_url), '') = '' then
    raise exception 'Adresse de la photo manquante.';
  end if;
  insert into public.photo_terrain (grossiste_id, url, prise_le)
  values (p_grossiste_id, btrim(p_url), coalesce(p_prise_le, current_date))
  returning id into nouveau;
  perform public.journaliser('photo_terrain_ajout', 'grossiste', p_grossiste_id::text, jsonb_build_object('url', p_url));
  return nouveau;
end;
$$;
revoke all on function public.admin_ajouter_photo_terrain(uuid, text, date) from public, anon;
grant execute on function public.admin_ajouter_photo_terrain(uuid, text, date) to authenticated;

create or replace function public.admin_supprimer_photo_terrain(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  delete from public.photo_terrain where id = p_id;
end;
$$;
revoke all on function public.admin_supprimer_photo_terrain(uuid) from public, anon;
grant execute on function public.admin_supprimer_photo_terrain(uuid) to authenticated;

-- L'équipe envoie les photos terrain dans le bucket « photos », dossier « terrain/ »
do $$
begin
  if to_regclass('storage.objects') is not null then
    execute 'drop policy if exists photos_terrain_admin on storage.objects';
    execute $p$create policy photos_terrain_admin on storage.objects for insert to authenticated
      with check (bucket_id = 'photos' and (storage.foldername(name))[1] = 'terrain' and public.is_admin())$p$;
  else
    raise notice 'storage.objects absent : politique des photos terrain ignorée (environnement de test).';
  end if;
end $$;

-- Fournisseurs vérifiés qui ont accepté d'apparaître et ont au moins une photo terrain, les plus anciens vérifiés d'abord
create or replace function public.premiers_fournisseurs_verifies(p_limite integer default 8)
returns table (id uuid, nom text, slug text, specialite text, commune text, ville text, photo_url text, verifie_le timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.nom, g.slug, g.categorie, g.commune, g.ville, ph.url, g.verifie_le
  from public.grossiste g
  join lateral (
    select url from public.photo_terrain where grossiste_id = g.id order by prise_le desc, date_ajout desc limit 1
  ) ph on true
  where g.statut = 'publie' and g.badge_verifie and not g.est_test and g.afficher_site_officiel
  order by g.verifie_le asc nulls last, g.date_ajout asc
  limit least(coalesce(p_limite, 8), 24);
$$;
revoke all on function public.premiers_fournisseurs_verifies(integer) from public;
grant execute on function public.premiers_fournisseurs_verifies(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Le marché en direct
-- ---------------------------------------------------------------------------
-- genre : 'verifie' (fournisseur vérifié), 'produit' (nouveau produit dans une catégorie), 'ajouts' (fournisseur qui ajoute des produits)
create or replace function public.marche_en_direct(p_limite integer default 8)
returns table (genre text, fournisseur text, commune text, ville text, categorie text, nombre integer, quand timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with evenements as (
    -- Fournisseurs vérifiés ces 30 derniers jours
    select 'verifie'::text as genre, g.nom as fournisseur, g.commune, g.ville, null::text as categorie, null::integer as nombre, g.verifie_le as quand
    from public.grossiste g
    where g.statut = 'publie' and g.badge_verifie and not g.est_test and g.verifie_le > now() - interval '30 days'
    union all
    -- Le produit le plus récent de chaque catégorie, ces 30 derniers jours
    select * from (
      select distinct on (p.categorie) 'produit'::text, null::text, null::text, null::text, p.categorie, null::integer, p.date_ajout
      from public.produit p
      join public.grossiste g on g.id = p.grossiste_id
      where p.statut = 'publie' and p.actif and not p.est_test and g.statut = 'publie' and not g.est_test
        and p.categorie is not null and p.date_ajout > now() - interval '30 days'
      order by p.categorie, p.date_ajout desc
    ) dernier_par_categorie
  ),
  ajouts as (
    -- Fournisseurs qui ont ajouté au moins deux produits ces 7 derniers jours
    select 'ajouts'::text as genre, g.nom as fournisseur, g.commune, g.ville, null::text as categorie, count(*)::integer as nombre, max(p.date_ajout) as quand
    from public.produit p
    join public.grossiste g on g.id = p.grossiste_id
    where p.statut = 'publie' and p.actif and not p.est_test and g.statut = 'publie' and not g.est_test
      and p.date_ajout > now() - interval '7 days'
    group by g.id, g.nom, g.commune, g.ville
    having count(*) >= 2
  )
  select * from (select * from evenements union all select * from ajouts) e
  order by e.quand desc
  limit least(coalesce(p_limite, 8), 20);
$$;
revoke all on function public.marche_en_direct(integer) from public;
grant execute on function public.marche_en_direct(integer) to anon, authenticated;
