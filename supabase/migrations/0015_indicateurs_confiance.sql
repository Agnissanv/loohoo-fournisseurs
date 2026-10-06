-- 0015 — Indicateurs de confiance affichés aux acheteurs
--
-- Pour chaque fournisseur publié : affaires confirmées, taux et délai de réponse (90 derniers jours),
-- date de la dernière vérification du stock. Seuls des chiffres agrégés sortent : jamais de noms d'acheteurs,
-- de montants ni de contenu de message. Le taux et le délai restent vides tant qu'il y a moins de 3 conversations
-- (un chiffre sur 1 ou 2 échanges serait trompeur).
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

create or replace function public.indicateurs_confiance(p_ids uuid[])
returns table (
  grossiste_id uuid,
  affaires_confirmees integer,
  conversations_90j integer,
  taux_reponse integer,
  delai_reponse_heures numeric,
  stock_verifie_le timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with cibles as (
    select g.id from public.grossiste g
    where g.id = any(p_ids) and g.statut = 'publie'
  ),
  echanges as (
    -- une ligne par conversation récente : heure du 1er message de l'acheteur, heure de la 1re réponse qui suit
    select c.grossiste_id,
           (select min(m.date_envoi) from public.message m where m.conversation_id = c.id and m.expediteur = 'vendeur') as demande,
           (select min(r.date_envoi) from public.message r
             where r.conversation_id = c.id and r.expediteur = 'fournisseur'
               and r.date_envoi >= (select min(m.date_envoi) from public.message m where m.conversation_id = c.id and m.expediteur = 'vendeur')) as reponse
    from public.conversation c
    where c.grossiste_id in (select id from cibles)
      and c.derniere_activite >= now() - interval '90 days'
  ),
  reponses as (
    select grossiste_id,
           count(*) filter (where demande is not null) as nb,
           count(*) filter (where demande is not null and reponse is not null) as nb_repondues,
           percentile_cont(0.5) within group (order by extract(epoch from (reponse - demande)) / 3600.0)
             filter (where reponse is not null and demande is not null) as mediane_h
    from echanges
    group by grossiste_id
  )
  select t.id,
         (select count(*)::int from public.affaire a where a.grossiste_id = t.id and a.statut = 'confirmee'),
         coalesce(r.nb, 0)::int,
         case when coalesce(r.nb, 0) >= 3 then round(100.0 * r.nb_repondues / r.nb)::int end,
         case when coalesce(r.nb, 0) >= 3 then round(r.mediane_h::numeric, 1) end,
         (select max(p.stock_verifie_le) from public.produit p
           where p.grossiste_id = t.id and p.statut = 'publie' and p.actif)
  from cibles t
  left join reponses r on r.grossiste_id = t.id;
$$;

revoke all on function public.indicateurs_confiance(uuid[]) from public;
grant execute on function public.indicateurs_confiance(uuid[]) to anon, authenticated;
