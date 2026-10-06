-- 0007 — Plus aucune donnée privée dans la table publique `grossiste`
--
-- À exécuter APRÈS la migration 0006 ET APRÈS le déploiement du site qui lit/écrit ces champs dans grossiste_contact.
-- (Si vous l'exécutez avant, les adresses et réseaux enregistrés depuis l'ancien site seraient perdus.)
--
-- 1) Vide les colonnes privées de `grossiste` (leur contenu a été copié par la migration 0006).
-- 2) Installe un garde-fou : même un ancien site ou un appel direct à l'API ne peut plus y réécrire de données privées.
--
-- Sans danger si relancé.

-- Sécurité : on ne vide que ce qui a bien été copié dans la table protégée
update public.grossiste g
set adresse = null, site_web = null, reseaux_sociaux = null
where (g.adresse is not null or g.site_web is not null or g.reseaux_sociaux is not null)
  and exists (
    select 1 from public.grossiste_contact c
    where c.grossiste_id = g.id
      and (g.adresse is null or c.adresse is not null)
      and (g.site_web is null or c.site_web is not null)
      and (g.reseaux_sociaux is null or c.reseaux_sociaux is not null)
  );

create or replace function public.grossiste_sans_donnees_privees()
returns trigger
language plpgsql
as $$
begin
  new.adresse := null;
  new.site_web := null;
  new.reseaux_sociaux := null;
  return new;
end;
$$;

drop trigger if exists grossiste_sans_donnees_privees on public.grossiste;
create trigger grossiste_sans_donnees_privees
  before insert or update on public.grossiste
  for each row execute function public.grossiste_sans_donnees_privees();

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
--   select count(*) from public.grossiste where adresse is not null or site_web is not null or reseaux_sociaux is not null;
--   -> 0
--   Et les données privées sont bien dans la table protégée :
--   select grossiste_id, adresse, site_web from public.grossiste_contact;
