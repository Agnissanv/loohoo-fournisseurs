-- 0010 — Le téléphone et l'e-mail d'un acheteur ne sont lisibles ni par les fournisseurs, ni par les autres acheteurs
--
-- Pourquoi : un fournisseur qui discute avec un acheteur doit pouvoir voir son nom et son activité, mais pas ses coordonnées.
-- Sinon il pourrait le rappeler directement, en dehors de LOOHOO.
--
-- Comment : les colonnes `telephone` et `email` de la table `vendeur` ne sont plus lisibles directement par les comptes connectés.
--   - L'acheteur relit ses propres informations avec la fonction mon_vendeur().
--   - L'administrateur lit tout avec la fonction admin_vendeurs().
--
-- ORDRE D'EXÉCUTION (important) : déployer d'abord la version du site qui utilise mon_vendeur() (elle fonctionne aussi
-- sans cette migration), PUIS exécuter cette migration. Sinon les acheteurs ne pourraient plus ouvrir leur compte.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

create or replace function public.mon_vendeur()
returns setof public.vendeur
language sql
stable
security definer
set search_path = public
as $$
  select * from public.vendeur where user_id = auth.uid();
$$;

revoke all on function public.mon_vendeur() from public, anon;
grant execute on function public.mon_vendeur() to authenticated;

create or replace function public.admin_vendeurs()
returns setof public.vendeur
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  return query select * from public.vendeur order by 1;
end;
$$;

revoke all on function public.admin_vendeurs() from public, anon;
grant execute on function public.admin_vendeurs() to authenticated;

-- Retire la lecture directe des deux colonnes sensibles pour les comptes connectés (toutes les autres colonnes restent lisibles)
do $$
declare
  colonnes text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into colonnes
  from information_schema.columns
  where table_schema = 'public' and table_name = 'vendeur' and column_name not in ('telephone', 'email');

  if colonnes is null then
    raise exception 'Table vendeur introuvable : abandon, rien n''a été modifié.';
  end if;

  execute 'revoke select on public.vendeur from authenticated';
  execute format('grant select (%s) on public.vendeur to authenticated', colonnes);
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
-- 1) Connecté comme acheteur, ouvrir une demande de devis : ses nom et téléphone sont préremplis (via mon_vendeur()).
-- 2) Connecté comme fournisseur, la messagerie affiche toujours le nom et l'activité de l'acheteur.
-- 3) Dans la console du navigateur d'un compte fournisseur, cette requête doit être REFUSÉE (permission denied) :
--      await supabase.from('vendeur').select('telephone')
-- En cas de problème pour revenir en arrière :
--      grant select on public.vendeur to authenticated;
