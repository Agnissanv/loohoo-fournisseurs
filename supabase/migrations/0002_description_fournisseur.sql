-- 0002 — Texte de présentation du fournisseur (« À propos »)
--
-- Pourquoi : la page profil (maquette validée) et la page publique affichent une courte présentation
-- de l'entreprise, ce qui rassure l'acheteur avant le premier message.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.
-- Le code fonctionne avant et après cette migration : sans elle, la présentation ne s'enregistre
-- simplement pas (message d'erreur explicite) et la page publique n'affiche rien.

alter table public.grossiste
  add column if not exists description text;

alter table public.grossiste
  drop constraint if exists grossiste_description_longueur;
alter table public.grossiste
  add constraint grossiste_description_longueur check (description is null or char_length(description) <= 600);

-- Ces droits sont sans effet si la table a déjà des droits complets, mais évitent une erreur 42501
-- dans le cas où les droits ont été accordés colonne par colonne.
grant select (description) on public.grossiste to anon, authenticated;
grant update (description) on public.grossiste to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
--   select column_name, data_type from information_schema.columns
--   where table_schema = 'public' and table_name = 'grossiste' and column_name = 'description';
--   -> doit renvoyer une ligne (text).
--
-- Test dans l'application : Paramètres > « Ajouter une présentation », enregistrer, puis ouvrir
-- « Voir ma page publique » : le texte apparaît sous le nom (une fois le profil publié).
--
-- Note pour l'équipe admin : la présentation est un champ public. Si elle doit être modérée, la
-- colonne `description` de `grossiste` est à ajouter à la vue de vérification.
