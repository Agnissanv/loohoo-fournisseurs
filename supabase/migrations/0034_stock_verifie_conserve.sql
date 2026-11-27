-- 0034 — Le « stock vérifié » ne tombe plus quand le fournisseur met son stock à jour (rapport du 22 nov 2026, S2)
--
-- Avant (migration 0009) : dès que le fournisseur modifiait la quantité en stock, la vérification de LOOHOO était retirée.
-- Le fournisseur était donc puni pour avoir mis son stock à jour.
-- Après : la mention reste. Pour que l'équipe puisse repérer un mouvement inhabituel APRÈS COUP, on garde la quantité
-- qui avait été contrôlée (stock_verifie_quantite) : l'écart avec le stock actuel se calcule à tout moment.
-- Un fournisseur ne peut toujours ni se déclarer « vérifié », ni modifier la date, le contrôleur ou la quantité contrôlée.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0033.

alter table public.produit add column if not exists stock_verifie_quantite numeric;

-- Produits déjà vérifiés : la quantité contrôlée est le stock actuel (le mieux que l'on sache)
update public.produit
set stock_verifie_quantite = stock_disponible
where stock_verifie_le is not null and stock_verifie_quantite is null;

create or replace function public.produit_stock_verifie()
returns trigger
language plpgsql
as $$
begin
  -- Éditeur SQL, clé service_role, migrations : aucune restriction.
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.stock_verifie_le := null;
    new.stock_verifie_par := null;
    new.stock_verifie_quantite := null;
  else
    -- Le fournisseur peut changer son stock : la vérification reste, telle que l'équipe l'a posée.
    new.stock_verifie_le := old.stock_verifie_le;
    new.stock_verifie_par := old.stock_verifie_par;
    new.stock_verifie_quantite := old.stock_verifie_quantite;
  end if;
  return new;
end;
$$;

-- Action admin : confirmer (ou retirer) la vérification, en notant la quantité contrôlée
create or replace function public.verifier_stock_produit(p_id uuid, p_verifie boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  update public.produit
  set stock_verifie_le = case when p_verifie then now() else null end,
      stock_verifie_par = case when p_verifie then auth.uid() else null end,
      stock_verifie_quantite = case when p_verifie then stock_disponible else null end
  where id = p_id;
end;
$$;

revoke all on function public.verifier_stock_produit(uuid, boolean) from public, anon;
grant execute on function public.verifier_stock_produit(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION (à lancer après) :
--
-- 1) Écart entre le stock contrôlé et le stock actuel (pour l'équipe, après coup) :
--    select nom, stock_verifie_quantite as controle, stock_disponible as actuel, stock_disponible - stock_verifie_quantite as ecart
--    from public.produit where stock_verifie_le is not null order by abs(stock_disponible - stock_verifie_quantite) desc nulls last;
--
-- 2) Dans l'application, connecté comme fournisseur : modifier le stock d'un produit « stock vérifié » ; la mention reste.
