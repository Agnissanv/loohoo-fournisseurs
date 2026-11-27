-- 0033 — Modèle d'abonnement unique (décision du client du 22 nov 2026, point S1 du rapport de test)
--
-- Avant : trois modèles coexistaient (20 ventes gratuites côté fournisseur, 50 ventes dans la fiche v3, commission de 2 % côté admin).
-- Après : quatre formules plafonnées par NOUVELLES DEMANDES REÇUES PAR MOIS (nouvelles conversations ouvertes par des acheteurs).
-- Les ventes restent comptées pour les statistiques et la confiance, mais ne déclenchent plus rien.
--
--   Départ (gratuit)   20 demandes / mois
--   Plus   2 900 F/mois ou 29 000 F/an    60 demandes / mois
--   Pro    4 900 F/mois ou 49 000 F/an   200 demandes / mois
--   Élite 10 900 F/mois ou 100 000 F/an  illimité
--
-- Le compteur repart de zéro le 1er de chaque mois (heure de Côte d'Ivoire = UTC).
-- Ce que cette migration NE fait PAS (à construire ensuite) : bloquer ou mettre en attente les demandes au-delà du plafond,
-- encaisser un paiement, parrainage. Le plafond est donc affiché et mesuré, pas encore appliqué.
--
-- Pour l'administration : `definir_formule_fournisseur(id, formule)` change la formule d'un fournisseur (réservée aux admins).
-- La commission de 2 % n'est plus le modèle : à retirer de l'écran « Affaires » côté admin.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0032.

-- ---------------------------------------------------------------------------
-- 1) La formule de chaque fournisseur (Départ par défaut), protégée comme l'abonnement
-- ---------------------------------------------------------------------------
alter table public.grossiste add column if not exists formule text not null default 'depart';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'grossiste_formule_valide') then
    alter table public.grossiste add constraint grossiste_formule_valide check (formule in ('depart', 'plus', 'pro', 'elite'));
  end if;
end $$;

create or replace function public.grossiste_proteger_abonnement()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.abonnement_actif := false;
    new.date_debut_abonnement := null;
    new.formule := 'depart';
  else
    new.abonnement_actif := old.abonnement_actif;
    new.date_debut_abonnement := old.date_debut_abonnement;
    new.formule := old.formule;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Les quatre formules (lisibles par tous via formules_abonnement(), déjà en place)
--    Remplace l'ancienne liste à trois niveaux, sauf si l'équipe a déjà adopté la nouvelle forme.
-- ---------------------------------------------------------------------------
update public.parametre
set valeur = '[
  {"niveau": 0, "code": "depart", "nom": "Départ", "mensuel": 0,     "annuel": 0,      "demandes_mois": 20},
  {"niveau": 1, "code": "plus",   "nom": "Plus",   "mensuel": 2900,  "annuel": 29000,  "demandes_mois": 60},
  {"niveau": 2, "code": "pro",    "nom": "Pro",    "mensuel": 4900,  "annuel": 49000,  "demandes_mois": 200},
  {"niveau": 3, "code": "elite",  "nom": "Élite",  "mensuel": 10900, "annuel": 100000, "demandes_mois": null}
]'::jsonb, maj = now()
where cle = 'formules_abonnement' and valeur::text not like '%demandes_mois%';

insert into public.parametre (cle, valeur) values ('formules_abonnement', '[
  {"niveau": 0, "code": "depart", "nom": "Départ", "mensuel": 0,     "annuel": 0,      "demandes_mois": 20},
  {"niveau": 1, "code": "plus",   "nom": "Plus",   "mensuel": 2900,  "annuel": 29000,  "demandes_mois": 60},
  {"niveau": 2, "code": "pro",    "nom": "Pro",    "mensuel": 4900,  "annuel": 49000,  "demandes_mois": 200},
  {"niveau": 3, "code": "elite",  "nom": "Élite",  "mensuel": 10900, "annuel": 100000, "demandes_mois": null}
]'::jsonb)
on conflict (cle) do nothing;

-- ---------------------------------------------------------------------------
-- 3) Ce que voit le fournisseur : sa formule et les demandes reçues ce mois-ci
--    Les anciennes colonnes (ventes, seuil, abonnement_actif) restent, pour que le site déjà en ligne continue de s'afficher.
-- ---------------------------------------------------------------------------
drop function if exists public.mon_abonnement();

create function public.mon_abonnement()
returns table(ventes integer, seuil integer, abonnement_actif boolean, formule text, demandes_utilisees integer, demandes_max integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.affaire a where a.grossiste_id = g.id and a.statut = 'confirmee'),
    coalesce((select (p.valeur ->> 'ventes')::int from public.parametre p where p.cle = 'seuil_ventes_gratuites'), 20),
    g.abonnement_actif,
    g.formule,
    (select count(*)::int from public.conversation c
      where c.grossiste_id = g.id and c.date_creation >= date_trunc('month', now())),
    (select (f ->> 'demandes_mois')::int
       from public.parametre p, jsonb_array_elements(p.valeur) f
      where p.cle = 'formules_abonnement' and f ->> 'code' = g.formule)
  from public.grossiste g
  where g.user_id = auth.uid();
$$;
revoke all on function public.mon_abonnement() from public;
grant execute on function public.mon_abonnement() to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Pour l'administration : changer la formule d'un fournisseur
-- ---------------------------------------------------------------------------
create or replace function public.definir_formule_fournisseur(p_grossiste uuid, p_formule text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''équipe LOOHOO.' using errcode = '42501';
  end if;
  if p_formule not in ('depart', 'plus', 'pro', 'elite') then
    raise exception 'Formule inconnue : %', p_formule;
  end if;
  update public.grossiste
  set formule = p_formule,
      abonnement_actif = (p_formule <> 'depart'),
      date_debut_abonnement = case
        when p_formule = 'depart' then null
        when abonnement_actif then date_debut_abonnement
        else current_date end
  where id = p_grossiste;
  if not found then raise exception 'Fournisseur introuvable.'; end if;
end;
$$;
revoke all on function public.definir_formule_fournisseur(uuid, text) from public;
grant execute on function public.definir_formule_fournisseur(uuid, text) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION (à lancer après, une par une) :
--
-- 1) select code, nom, mensuel, demandes_mois from public.parametre, jsonb_to_recordset(valeur) as f(code text, nom text, mensuel int, demandes_mois int)
--    where cle = 'formules_abonnement';
--    -> 4 lignes : depart 0 / 20, plus 2900 / 60, pro 4900 / 200, elite 10900 / null
--
-- 2) select nom, formule, abonnement_actif from public.grossiste;
--    -> tous « depart », abonnement_actif = false
--
-- 3) Dans l'application, connecté comme fournisseur : le tableau de bord affiche « Formule Départ » et « X / 20 demandes ce mois-ci ».
--
-- 4) Sécurité : un fournisseur qui envoie { formule: 'elite' } sur sa propre fiche ne change rien (la valeur reste « depart »).
