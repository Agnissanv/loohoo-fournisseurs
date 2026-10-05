-- 0004 — Le fournisseur peut lire et modifier SON PROPRE numéro de téléphone
--
-- Symptôme : on enregistre un numéro dans Paramètres, on recharge la page, il a disparu (« Non renseigné »).
-- Cause probable : la table grossiste_contact est privée (le numéro n'est jamais public, c'est voulu), mais aucune
-- règle ne laisse le fournisseur lire ou modifier la ligne qui le concerne.
--
-- Cette migration ajoute trois règles réservées au propriétaire du profil. Elle ne touche à aucune autre règle :
-- le téléphone reste invisible pour les visiteurs, les acheteurs et les autres fournisseurs.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

alter table public.grossiste_contact enable row level security;

-- Nécessaire pour « enregistrer ou mettre à jour » (un seul numéro par fournisseur)
create unique index if not exists grossiste_contact_grossiste_id_key
  on public.grossiste_contact (grossiste_id);

grant select, insert, update on public.grossiste_contact to authenticated;

drop policy if exists contact_proprietaire_lecture on public.grossiste_contact;
create policy contact_proprietaire_lecture on public.grossiste_contact
  for select to authenticated
  using (exists (
    select 1 from public.grossiste g
    where g.id = grossiste_contact.grossiste_id and g.user_id = auth.uid()
  ));

drop policy if exists contact_proprietaire_ajout on public.grossiste_contact;
create policy contact_proprietaire_ajout on public.grossiste_contact
  for insert to authenticated
  with check (exists (
    select 1 from public.grossiste g
    where g.id = grossiste_contact.grossiste_id and g.user_id = auth.uid()
  ));

drop policy if exists contact_proprietaire_modification on public.grossiste_contact;
create policy contact_proprietaire_modification on public.grossiste_contact
  for update to authenticated
  using (exists (
    select 1 from public.grossiste g
    where g.id = grossiste_contact.grossiste_id and g.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.grossiste g
    where g.id = grossiste_contact.grossiste_id and g.user_id = auth.uid()
  ));

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION (à lancer après) :
--
-- 1) Les règles de la table. IMPORTANT : aucune ligne ne doit donner l'accès en lecture à « anon » ou « public »
--    (sinon les numéros seraient visibles de tous). Seuls « authenticated » (et éventuellement l'admin) doivent apparaître.
--    select policyname, cmd, roles, qual from pg_policies where tablename = 'grossiste_contact';
--
-- 2) Test dans l'application : Paramètres > Téléphone > crayon > saisir un numéro > valider > recharger la page :
--    le numéro doit rester affiché.
--
-- 3) Test de confidentialité : dans une fenêtre privée (sans connexion), ouvrir la console du navigateur sur le site et vérifier
--    qu'une requête directe sur grossiste_contact ne renvoie rien. Ou, plus simple, demandez-moi de le vérifier.
