-- 0005 — Les photos d'un produit publié sont lisibles par les visiteurs
--
-- Symptôme : un visiteur non connecté ouvre une fiche produit et voit « Produit introuvable ».
-- Cause : la fiche demande les photos du produit (table produit_photo), mais la base refuse cette lecture
-- aux visiteurs (erreur « permission denied for table produit_photo »), ce qui fait échouer toute la page.
--
-- Correction : les visiteurs peuvent lire UNIQUEMENT les photos des produits publiés, actifs, dont le fournisseur est publié.
-- Les propriétaires et l'admin gardent leurs propres règles existantes (non modifiées).
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

alter table public.produit_photo enable row level security;

grant select on public.produit_photo to anon, authenticated;

drop policy if exists produit_photo_lecture_publique on public.produit_photo;
create policy produit_photo_lecture_publique on public.produit_photo
  for select to anon, authenticated
  using (exists (
    select 1
    from public.produit p
    join public.grossiste g on g.id = p.grossiste_id
    where p.id = produit_photo.produit_id
      and p.statut = 'publie' and p.actif = true and g.statut = 'publie'
  ));

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION : ouvrir une fiche produit dans une fenêtre privée (sans connexion) : elle doit s'afficher avec ses photos.
