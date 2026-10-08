-- 0020 — Fournisseurs favoris de l'acheteur
--
-- Un acheteur peut « suivre » un fournisseur publié pour le retrouver sans l'avoir contacté. Table sans accès direct :
-- tout passe par trois fonctions qui retrouvent l'acheteur à partir de son compte connecté.
--   basculer_favori(grossiste_id)  : ajoute ou retire, renvoie true si le fournisseur est maintenant en favori
--   est_favori(grossiste_id)       : true/false
--   mes_favoris()                  : fournisseurs publiés suivis, avec leur plus bas prix de gros
-- Seuls les comptes acheteurs peuvent s'en servir.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

create table if not exists public.favori (
  vendeur_id uuid not null,
  grossiste_id uuid not null,
  date_ajout timestamptz not null default now(),
  primary key (vendeur_id, grossiste_id)
);
create index if not exists favori_grossiste_idx on public.favori (grossiste_id);

alter table public.favori enable row level security;
revoke all on public.favori from anon, authenticated;

create or replace function public.basculer_favori(p_grossiste_id uuid)
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
  if exists (select 1 from public.favori where vendeur_id = v and grossiste_id = p_grossiste_id) then
    delete from public.favori where vendeur_id = v and grossiste_id = p_grossiste_id;
    return false;
  end if;
  if not exists (select 1 from public.grossiste where id = p_grossiste_id and statut = 'publie') then
    raise exception 'Ce fournisseur n''est pas disponible.';
  end if;
  insert into public.favori (vendeur_id, grossiste_id) values (v, p_grossiste_id);
  return true;
end;
$$;
revoke all on function public.basculer_favori(uuid) from public, anon;
grant execute on function public.basculer_favori(uuid) to authenticated;

create or replace function public.est_favori(p_grossiste_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.favori f join public.vendeur v on v.id = f.vendeur_id
    where v.user_id = auth.uid() and f.grossiste_id = p_grossiste_id
  );
$$;
revoke all on function public.est_favori(uuid) from public, anon;
grant execute on function public.est_favori(uuid) to authenticated;

create or replace function public.mes_favoris()
returns table (id uuid, nom text, ville text, categorie text, logo_url text, badge_verifie boolean, prix_min bigint, date_ajout timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.nom, g.ville, g.categorie, g.logo_url, g.badge_verifie,
         (select min(p.prix_gros_fcfa)::bigint from public.produit p where p.grossiste_id = g.id and p.statut = 'publie' and p.actif),
         f.date_ajout
  from public.favori f
  join public.vendeur v on v.id = f.vendeur_id and v.user_id = auth.uid()
  join public.grossiste g on g.id = f.grossiste_id and g.statut = 'publie'
  order by f.date_ajout desc;
$$;
revoke all on function public.mes_favoris() from public, anon;
grant execute on function public.mes_favoris() to authenticated;
