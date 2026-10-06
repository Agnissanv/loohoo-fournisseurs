-- 0009 — « Stock vérifié par LOOHOO » et lecture complète pour l'administrateur
--
-- 1) Stock vérifié : le fournisseur déclare son stock; seul l'admin peut le marquer « vérifié » (date et nom de l'admin).
--    Dès que le fournisseur modifie la quantité en stock, la vérification est retirée (le chiffre n'est plus celui contrôlé).
-- 2) Lecture admin : l'administrateur peut lire toutes les données dont il a besoin pour valider et superviser
--    (conversations, messages, acheteurs, mises en relation, leads, médiathèque, photos, contacts, documents).
--    Pour chaque table, la règle n'est ajoutée que si la protection par lignes (RLS) est active; sinon la table est signalée
--    sans être modifiée, pour ne jamais ouvrir une table par erreur.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.
-- Prérequis : fonction is_admin(). Lire les messages de la zone « Messages » après l'exécution.

-- ---------------------------------------------------------------------------
-- 1) Stock vérifié
-- ---------------------------------------------------------------------------
alter table public.produit
  add column if not exists stock_verifie_le timestamptz,
  add column if not exists stock_verifie_par uuid;

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
  else
    -- Un fournisseur ne peut pas se déclarer « vérifié ». S'il change le stock, la vérification tombe.
    if new.stock_disponible is distinct from old.stock_disponible then
      new.stock_verifie_le := null;
      new.stock_verifie_par := null;
    else
      new.stock_verifie_le := old.stock_verifie_le;
      new.stock_verifie_par := old.stock_verifie_par;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists produit_stock_verifie on public.produit;
create trigger produit_stock_verifie
  before insert or update on public.produit
  for each row execute function public.produit_stock_verifie();

-- Action admin : confirmer (ou retirer) la vérification du stock d'un produit
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
      stock_verifie_par = case when p_verifie then auth.uid() else null end
  where id = p_id;
end;
$$;

revoke all on function public.verifier_stock_produit(uuid, boolean) from public, anon;
grant execute on function public.verifier_stock_produit(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Lecture complète pour l'administrateur
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'conversation', 'message', 'vendeur', 'mise_en_relation', 'lead',
    'media', 'grossiste_photo', 'grossiste_contact', 'document_fournisseur'
  ] loop
    if to_regclass('public.' || t) is null then
      raise notice 'Table % absente : ignorée.', t;
    elsif not (select relrowsecurity from pg_class where oid = to_regclass('public.' || t)) then
      raise notice 'ATTENTION : la protection par lignes (RLS) est désactivée sur « % » : table ignorée, à examiner avec soin avant d''y donner accès.', t;
    else
      execute format('drop policy if exists admin_lecture_complete on public.%I', t);
      execute format('create policy admin_lecture_complete on public.%I for select to authenticated using (public.is_admin())', t);
      execute format('grant select on public.%I to authenticated', t);
      raise notice 'OK : lecture admin sur « % ».', t;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'produit' and column_name like 'stock_verifie%';
--   -> deux lignes.
-- Les messages « OK » / « ATTENTION » s'affichent dans l'onglet Messages du SQL Editor.
