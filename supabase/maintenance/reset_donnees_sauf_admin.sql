-- ============================================================================
-- REMISE À ZÉRO DES DONNÉES : tout est supprimé SAUF les comptes administrateurs.
-- ACTION IRRÉVERSIBLE. À exécuter dans le projet Supabase « loohoo-fournisseurs » uniquement
-- (pas celui de MédiThé !). Ce fichier n'est PAS une migration : à lancer à la main, une fois.
--
-- Ce qui est supprimé  : fournisseurs, produits, photos, médiathèque, documents, acheteurs,
--                        conversations et messages, mises en relation, leads (e-mails captés
--                        par la landing), visites, et tous les comptes de connexion non admin.
-- Ce qui est conservé  : la table `admins` et les comptes de connexion qui y figurent.
-- Ce qui n'est PAS fait : les fichiers des buckets Storage (photos, videos, documents).
--                        Voir l'étape 3 : à vider depuis l'interface Supabase.
-- ============================================================================


-- ============================================================================
-- ÉTAPE 1 — VÉRIFIER (lecture seule, aucun risque). Lancez ces requêtes d'abord.
-- ============================================================================

-- 1a) Les comptes qui seront CONSERVÉS. Vérifiez que c'est bien la liste voulue.
select u.id, u.email, u.created_at
from auth.users u
join public.admins a on a.user_id = u.id
order by u.created_at;

-- 1b) Les comptes qui seront SUPPRIMÉS (nombre).
select count(*) as comptes_supprimes
from auth.users
where id not in (select user_id from public.admins);

-- 1c) Le contenu qui sera supprimé. Attention aux « lead » : ce sont de vrais e-mails captés par la
--     landing ; si certains sont de vrais prospects, exportez-les avant (Table Editor > lead > Export).
select 'grossiste' as table_, count(*) from public.grossiste
union all select 'produit', count(*) from public.produit
union all select 'vendeur', count(*) from public.vendeur
union all select 'conversation', count(*) from public.conversation
union all select 'message', count(*) from public.message
union all select 'mise_en_relation', count(*) from public.mise_en_relation
union all select 'lead', count(*) from public.lead;

-- Si la liste 1a est vide ou incorrecte : N'ALLEZ PAS PLUS LOIN (vous perdriez tous les accès admin).


-- ============================================================================
-- ÉTAPE 2 — SUPPRIMER. Tout se passe dans une seule transaction : en cas d'erreur, rien n'est supprimé.
-- Conseil : faites une sauvegarde avant (Database > Backups) si vous avez le moindre doute.
-- ============================================================================

begin;

-- Garde-fou : refuse de continuer s'il n'y a aucun admin (sinon plus personne ne pourrait se connecter à l'admin).
do $$
begin
  if (select count(*) from public.admins a join auth.users u on u.id = a.user_id) = 0 then
    raise exception 'Aucun compte admin trouvé : abandon, rien n''a été supprimé.';
  end if;
end $$;

-- Vide toutes les tables de données en une seule instruction (l'ordre des clés étrangères est géré par PostgreSQL).
-- Sans CASCADE : si une table inconnue en dépendait, l'instruction échouerait au lieu de la vider en silence.
do $$
declare
  tables text;
begin
  select string_agg(format('public.%I', t), ', ')
    into tables
  from unnest(array[
    'message', 'conversation', 'mise_en_relation',
    'produit_photo', 'produit', 'media',
    'document_fournisseur', 'grossiste_photo', 'grossiste_contact', 'grossiste',
    'vendeur', 'lead', 'visite'
  ]) as t
  where to_regclass('public.' || t) is not null;   -- ignore les tables qui n'existent pas (ex. visite avant la migration 0003)

  execute 'truncate table ' || tables || ' restart identity';
end $$;

-- Supprime tous les comptes de connexion qui ne sont pas admin (leurs sessions et identités partent avec).
delete from auth.users
where id not in (select user_id from public.admins);

-- Contrôle final : doit afficher uniquement vos admins et des zéros partout ailleurs.
select 'comptes restants' as controle, count(*) from auth.users
union all select 'admins', count(*) from public.admins
union all select 'grossiste', count(*) from public.grossiste
union all select 'produit', count(*) from public.produit
union all select 'vendeur', count(*) from public.vendeur
union all select 'message', count(*) from public.message;

commit;


-- ============================================================================
-- ÉTAPE 3 — VIDER LES FICHIERS (interface Supabase, pas en SQL).
-- Storage > pour chacun des buckets « photos », « videos », « documents » :
-- ouvrir le bucket, sélectionner tous les fichiers et supprimer (ou menu ⋯ > Empty bucket).
-- Ne supprimez pas les buckets eux-mêmes : le site en a besoin.
-- (Supprimer des lignes de storage.objects en SQL ne retire pas les vrais fichiers : à éviter.)
-- ============================================================================
