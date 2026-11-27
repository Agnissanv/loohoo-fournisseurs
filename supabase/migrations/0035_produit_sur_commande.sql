-- 0035 — Disponibilité d'un produit : « en stock » ou « sur commande » (formulaire simplifié du rapport du 22 nov 2026)
--
-- Le fournisseur choisit : « En stock : ___ » (quantité, déjà stock_disponible) ou « Sur commande » (délai en jours, déjà
-- delai_preparation_jours). Il faut distinguer « sur commande » de « stock non renseigné », d'où cette colonne.
-- Les produits existants restent à « non » : rien ne change pour eux.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0034.

alter table public.produit add column if not exists sur_commande boolean not null default false;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
--   select column_name, data_type, column_default from information_schema.columns
--   where table_schema = 'public' and table_name = 'produit' and column_name = 'sur_commande';
--   -> boolean, default false
