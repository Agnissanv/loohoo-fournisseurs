-- 0018 — Date de mise à jour du stock, et suivi du seuil de ventes gratuites
--
-- 1) produit.stock_maj_le : date de la dernière mise à jour du stock, remplie automatiquement quand le stock change.
--    Sert au fournisseur (« mis à jour aujourd'hui », « rupture depuis 2 jours ») et plus tard au contrôle a posteriori du stock.
-- 2) Seuil de ventes gratuites : le fournisseur est gratuit jusqu'à N ventes confirmées sur la plateforme, puis passe à
--    l'abonnement mensuel (le prix et la date de bascule se règlent avec le client, rien n'est facturé ici).
--    - parametre 'seuil_ventes_gratuites' (50 par défaut, modifiable par l'équipe)
--    - grossiste.abonnement_actif / date_debut_abonnement : posés par l'équipe uniquement
--    - fonction mon_abonnement() : ventes confirmées, seuil et état, pour le fournisseur connecté
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

-- ---------------------------------------------------------------------------
-- 1) Stock : date de dernière mise à jour
-- ---------------------------------------------------------------------------
alter table public.produit add column if not exists stock_maj_le timestamptz not null default now();

create or replace function public.produit_stock_maj()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.stock_maj_le := now();
  elsif new.stock_disponible is distinct from old.stock_disponible then
    new.stock_maj_le := now();
  else
    new.stock_maj_le := old.stock_maj_le;
  end if;
  return new;
end;
$$;

drop trigger if exists produit_stock_maj on public.produit;
create trigger produit_stock_maj
  before insert or update on public.produit
  for each row execute function public.produit_stock_maj();

-- Si les droits de la table sont donnés colonne par colonne : lecture pour les comptes connectés (sans effet sinon)
grant select (stock_maj_le) on public.produit to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Seuil de ventes gratuites et abonnement
-- ---------------------------------------------------------------------------
insert into public.parametre (cle, valeur) values ('seuil_ventes_gratuites', '{"ventes": 50}'::jsonb)
on conflict (cle) do nothing;

alter table public.grossiste
  add column if not exists abonnement_actif boolean not null default false,
  add column if not exists date_debut_abonnement date;

-- Un fournisseur ne peut pas s'accorder ou se retirer un abonnement : seule l'équipe (ou l'éditeur SQL) le peut
create or replace function public.grossiste_proteger_abonnement()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.abonnement_actif := false;
    new.date_debut_abonnement := null;
  else
    new.abonnement_actif := old.abonnement_actif;
    new.date_debut_abonnement := old.date_debut_abonnement;
  end if;
  return new;
end;
$$;

drop trigger if exists grossiste_proteger_abonnement on public.grossiste;
create trigger grossiste_proteger_abonnement
  before insert or update on public.grossiste
  for each row execute function public.grossiste_proteger_abonnement();

create or replace function public.mon_abonnement()
returns table (ventes integer, seuil integer, abonnement_actif boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.affaire a where a.grossiste_id = g.id and a.statut = 'confirmee'),
    coalesce((select (p.valeur ->> 'ventes')::int from public.parametre p where p.cle = 'seuil_ventes_gratuites'), 50),
    g.abonnement_actif
  from public.grossiste g
  where g.user_id = auth.uid();
$$;
revoke all on function public.mon_abonnement() from public, anon;
grant execute on function public.mon_abonnement() to authenticated;
