-- 0032 — Correctif B1 (rapport de test du 22 nov 2026) : impossible d'ajouter des photos à un produit
--
-- Cause (constatée dans la base en ligne, le 27 nov 2026) :
--   Un ancien déclencheur, produit_proteger_champs_admin (fonction proteger_champs_admin_produit), existe dans la base mais
--   dans AUCUN fichier de migration. Il refuse tout changement de `statut` par un non-admin, avec le message
--   « Seul un administrateur peut publier ou rejeter un produit ».
--   Or, quand un fournisseur ajoute une photo, le déclencheur produit_photo_reverifier (reverifier_sur_galerie, SECURITY DEFINER)
--   remet le produit « en_attente » : c'est une modification de statut faite au nom du fournisseur, donc refusée.
--   Résultat : le produit est créé, mais l'enregistrement de la photo échoue.
--
-- Pourquoi on peut le retirer sans perdre de protection :
--   produit_proteger_moderation (migrations 0001 puis 0027) impose déjà, pour un non-admin :
--     - à la création : statut « publie » (publication immédiate), verifie_par / verifie_le / motif_rejet remis à vide ;
--     - à la modification : statut, verifie_par, verifie_le et motif_rejet conservés tels quels (un fournisseur ne peut pas
--       se publier ou se rejeter lui-même ; il ne reçoit plus d'erreur, la valeur est simplement ignorée).
--   L'ancien déclencheur faisait donc doublon, et son exception bloque désormais des actions légitimes.
--   Le déclencheur produit_photo_reverifier devient sans effet (la modération ignore son changement de statut) : on le retire aussi.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0031.

drop trigger if exists produit_proteger_champs_admin on public.produit;
drop trigger if exists produit_photo_reverifier on public.produit_photo;

-- Les anciennes fonctions restent en place (plus appelées) : on ne supprime que ce qui bloque.

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION (à lancer après, une par une) :
--
-- 1) Les deux déclencheurs ont disparu et la modération reste en place :
--    select tgname from pg_trigger
--    where tgrelid in ('public.produit'::regclass, 'public.produit_photo'::regclass) and not tgisinternal order by 1;
--    -> NE doit PAS contenir produit_proteger_champs_admin ni produit_photo_reverifier ;
--    -> doit contenir produit_proteger_moderation, produit_photo_limite, produit_photo_synchro.
--
-- 2) Test dans l'application (connecté comme fournisseur, pas comme admin) :
--    - Créer un produit avec 4 photos : il apparaît une seule fois, avec ses 4 photos, sur « Mes produits » et sur la page publique.
--    - Ajouter une photo à un produit existant : aucune erreur.
--    - Retirer puis réordonner les photos : aucune erreur.
--
-- 3) Test de sécurité (le fournisseur ne peut toujours pas se publier lui-même) :
--    sur un produit REJETÉ, un fournisseur qui envoie { statut: 'publie' } ne change rien : le statut reste « rejete ».
--
-- Note : les produits déjà créés SANS photo à cause du bug (par ex. ceux du compte NOWOH) ne sont pas réparés par cette migration ;
-- le fournisseur doit rouvrir le produit et y ajouter ses photos.
