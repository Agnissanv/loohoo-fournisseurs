-- 0036 — Nouvelle catégorie « Sport et fitness » (rapport du 22 nov 2026, F7)
--
-- Les appareils de sport finissaient dans « Autre » : produits difficiles à trouver pour les acheteurs.
-- La catégorie est ajoutée juste avant « Autre » (qui reste la dernière), avec ses sous-catégories : matériel de musculation,
-- accessoires de fitness, vêtements de sport, autres articles de sport. L'équipe peut les modifier depuis l'écran Catégories de l'admin.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé (ne fait rien si la catégorie existe déjà).

do $$
declare
  v_ordre integer;
  v_id uuid;
begin
  if exists (select 1 from public.categorie where nom = 'Sport et fitness') then
    return;
  end if;

  -- Place la nouvelle catégorie à la position de « Autre » et décale « Autre » d'un cran
  select ordre into v_ordre from public.categorie where nom = 'Autre';
  if v_ordre is null then
    select coalesce(max(ordre), 0) + 1 into v_ordre from public.categorie;
  else
    update public.categorie set ordre = ordre + 1 where nom = 'Autre';
  end if;

  insert into public.categorie (nom, ordre, active) values ('Sport et fitness', v_ordre, true) returning id into v_id;

  insert into public.sous_categorie (categorie_id, nom, ordre, active) values
    (v_id, 'Matériel de musculation', 1, true),
    (v_id, 'Accessoires de fitness', 2, true),
    (v_id, 'Vêtements de sport', 3, true),
    (v_id, 'Autres articles de sport', 4, true);
end $$;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
--   select c.ordre, c.nom, (select count(*) from public.sous_categorie s where s.categorie_id = c.id) as sous_categories
--   from public.categorie c order by c.ordre;
--   -> « Sport et fitness » (4 sous-catégories) juste avant « Autre », qui reste la dernière
