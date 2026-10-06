-- 0006 — Les données privées du fournisseur ont leur place dans la table protégée des contacts
--
-- Pourquoi : l'adresse, le site web et les réseaux sociaux (dont le WhatsApp) étaient stockés dans la table
-- publique `grossiste`, lisible par n'importe qui via l'API. La table `grossiste_contact` (téléphone) est, elle,
-- réservée au fournisseur et à l'admin. On y range maintenant toutes les données privées.
--
-- ORDRE D'EXÉCUTION (important) :
--   1) Cette migration 0006 (ajoute les colonnes et copie les données : sans risque, ne retire rien).
--   2) Déployer le site (il lit et écrit désormais ces champs dans grossiste_contact).
--   3) Migration 0007 (retire les données privées de la table publique).
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

alter table public.grossiste_contact
  add column if not exists adresse text,
  add column if not exists site_web text,
  add column if not exists reseaux_sociaux jsonb;

-- Copie l'existant sans écraser ce qui serait déjà renseigné
update public.grossiste_contact c
set adresse = coalesce(c.adresse, g.adresse),
    site_web = coalesce(c.site_web, g.site_web),
    reseaux_sociaux = coalesce(c.reseaux_sociaux, g.reseaux_sociaux)
from public.grossiste g
where g.id = c.grossiste_id;

notify pgrst, 'reload schema';

-- VÉRIFICATION :
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'grossiste_contact' order by ordinal_position;
--   -> doit contenir adresse, site_web, reseaux_sociaux.
