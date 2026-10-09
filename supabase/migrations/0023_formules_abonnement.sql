-- 0023 — Formules d'abonnement validées par le client (9 oct. 2026)
--
--   Niveau 0 : gratuit jusqu'à 20 ventes confirmées (seuil_ventes_gratuites)
--   Niveau 1 : 2 900 F CFA / mois  ou 29 000 F CFA / an
--   Niveau 2 : 4 900 F CFA / mois  ou 49 000 F CFA / an
--   Niveau 3 : 10 900 F CFA / mois ou 100 000 F CFA / an
-- Le contenu de chaque niveau reste à préciser par le client : seuls les prix sont enregistrés.
-- Aucun paiement n'est encaissé par le site (le paiement Mobile Money est prévu en phase 2).
--
-- formules_abonnement() : seuil gratuit et prix, lisibles par tous (page « Devenir fournisseur », espace fournisseur).
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé :
-- une valeur déjà modifiée par l'équipe n'est jamais écrasée.

-- Seuil gratuit : passe de 50 (valeur par défaut de la migration 0018) à 20, seulement s'il n'a pas été changé depuis
update public.parametre
set valeur = '{"ventes": 20}'::jsonb, maj = now()
where cle = 'seuil_ventes_gratuites' and (valeur ->> 'ventes') = '50';

insert into public.parametre (cle, valeur) values ('seuil_ventes_gratuites', '{"ventes": 20}'::jsonb)
on conflict (cle) do nothing;

insert into public.parametre (cle, valeur) values ('formules_abonnement', '[
  {"niveau": 1, "mensuel": 2900, "annuel": 29000},
  {"niveau": 2, "mensuel": 4900, "annuel": 49000},
  {"niveau": 3, "mensuel": 10900, "annuel": 100000}
]'::jsonb)
on conflict (cle) do nothing;

create or replace function public.formules_abonnement()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'seuil', coalesce((select (valeur ->> 'ventes')::int from public.parametre where cle = 'seuil_ventes_gratuites'), 20),
    'niveaux', coalesce((select valeur from public.parametre where cle = 'formules_abonnement'), '[]'::jsonb)
  );
$$;
revoke all on function public.formules_abonnement() from public;
grant execute on function public.formules_abonnement() to anon, authenticated;
