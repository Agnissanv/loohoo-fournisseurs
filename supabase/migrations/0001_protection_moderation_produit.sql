-- 0001 — Protection de la modération des produits
--
-- Pourquoi : l'interface ne suffit pas, les droits doivent être imposés par la base.
--   1. Un fournisseur ne peut JAMAIS publier lui-même un produit (seul un admin le peut).
--   2. Un produit publié dont le contenu public change (nom, description, catégorie,
--      sous-catégorie, mots-clés, vidéo) repasse en vérification.
--      Les changements de prix, stock, MOQ, dimensions ou état actif/inactif restent immédiats.
--   3. Un produit rejeté puis modifié repasse en vérification (= le fournisseur le resoumet).
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.
-- Hypothèses vérifiées dans le code : table produit avec colonnes statut, motif_rejet, verifie_par,
-- verifie_le, et fonction is_admin().

create or replace function public.produit_proteger_moderation()
returns trigger
language plpgsql
as $$
begin
  -- Éditeur SQL, clé service_role, migrations : aucune restriction.
  -- Les appels de l'application passent par les rôles anon / authenticated.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  -- Les admins (y compris via la fonction moderer_produit) gardent la main.
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.statut := 'en_attente';
    new.motif_rejet := null;
    new.verifie_par := null;
    new.verifie_le := null;
    return new;
  end if;

  -- UPDATE par un fournisseur : il peut seulement faire repasser son produit en vérification.
  if new.statut is distinct from old.statut and new.statut <> 'en_attente' then
    raise exception 'Seule l''équipe LOOHOO peut publier ou rejeter un produit.'
      using errcode = '42501';
  end if;
  new.verifie_par := old.verifie_par;
  new.verifie_le := old.verifie_le;

  if old.statut = 'publie' and new.statut = 'publie' and (
       new.nom is distinct from old.nom
    or new.description is distinct from old.description
    or new.categorie is distinct from old.categorie
    or new.sous_categorie is distinct from old.sous_categorie
    or new.tags is distinct from old.tags
    or new.video_url is distinct from old.video_url
  ) then
    new.statut := 'en_attente';
  end if;

  if old.statut = 'rejete' and new.statut = 'rejete' and (
       new.nom is distinct from old.nom
    or new.description is distinct from old.description
    or new.categorie is distinct from old.categorie
    or new.sous_categorie is distinct from old.sous_categorie
    or new.tags is distinct from old.tags
    or new.prix_gros_fcfa is distinct from old.prix_gros_fcfa
    or new.moq is distinct from old.moq
  ) then
    new.statut := 'en_attente';
  end if;

  if new.statut = 'en_attente' and old.statut = 'rejete' then
    new.motif_rejet := null;
  else
    new.motif_rejet := old.motif_rejet;
  end if;

  return new;
end;
$$;

drop trigger if exists produit_proteger_moderation on public.produit;
create trigger produit_proteger_moderation
  before insert or update on public.produit
  for each row execute function public.produit_proteger_moderation();

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION (à lancer après, une par une) :
--
-- 1) Le déclencheur existe :
--    select tgname from pg_trigger where tgrelid = 'public.produit'::regclass and not tgisinternal;
--    -> doit contenir produit_proteger_moderation
--
-- 2) Test dans l'application :
--    - Connecté comme fournisseur, modifier le PRIX d'un produit publié : il reste « Publié ».
--    - Modifier la DESCRIPTION d'un produit publié : il passe « En attente de vérification ».
--    - Modifier un produit « Rejeté » : il passe « En attente » et le motif disparaît.
--
-- 3) Test de sécurité (console du navigateur, connecté comme fournisseur) :
--    doit répondre une erreur 42501, pas un succès.
--    await supabase.from('produit').update({ statut: 'publie' }).eq('id', '<id d un produit en attente>')
--    (si `supabase` n'est pas accessible dans la console, ignorez ce test.)
--
-- ATTENTION : si d'anciens déclencheurs (photos/vidéo) remettent déjà le produit en attente,
-- ils restent compatibles : passer à « en_attente » est autorisé pour un fournisseur.
