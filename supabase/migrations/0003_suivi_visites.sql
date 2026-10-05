-- 0003 — Suivi des visites (origine du trafic et produits les plus vus)
--
-- Pourquoi : la page Statistiques du fournisseur affiche l'origine de ses visiteurs (recherche LOOHOO,
-- lien direct, WhatsApp, réseaux sociaux, Google) et ses produits les plus consultés.
-- Aucune donnée personnelle n'est stockée : ni adresse IP, ni identifiant de visiteur.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.
-- Le code fonctionne avant et après cette migration (sans elle, les blocs « origine des visites »
-- et « produits les plus vus » affichent simplement « bientôt disponible »).

create table if not exists public.visite (
  id bigint generated always as identity primary key,
  grossiste_id uuid not null references public.grossiste(id) on delete cascade,
  produit_id uuid references public.produit(id) on delete cascade,
  source text not null default 'autre'
    check (source in ('recherche_loohoo', 'lien_direct', 'whatsapp', 'facebook', 'instagram', 'google', 'autre')),
  date_visite timestamptz not null default now()
);

create index if not exists visite_grossiste_date_idx on public.visite (grossiste_id, date_visite desc);
create index if not exists visite_produit_idx on public.visite (produit_id) where produit_id is not null;

-- Aucune lecture ni écriture directe : tout passe par les deux fonctions ci-dessous.
alter table public.visite enable row level security;
revoke all on public.visite from anon, authenticated;

-- Enregistre une visite sur une page fournisseur publiée (ou l'un de ses produits).
-- Les visites du fournisseur sur sa propre page ne sont pas comptées.
create or replace function public.enregistrer_visite(
  p_grossiste_id uuid,
  p_produit_id uuid default null,
  p_source text default 'autre'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proprietaire uuid;
begin
  select user_id into v_proprietaire from public.grossiste where id = p_grossiste_id and statut = 'publie';
  if not found then return; end if;
  if v_proprietaire is not null and v_proprietaire = auth.uid() then return; end if;

  if p_source is null or p_source not in ('recherche_loohoo', 'lien_direct', 'whatsapp', 'facebook', 'instagram', 'google', 'autre') then
    p_source := 'autre';
  end if;
  if p_produit_id is not null and not exists (
    select 1 from public.produit where id = p_produit_id and grossiste_id = p_grossiste_id
  ) then
    p_produit_id := null;
  end if;

  insert into public.visite (grossiste_id, produit_id, source) values (p_grossiste_id, p_produit_id, p_source);
end;
$$;

grant execute on function public.enregistrer_visite(uuid, uuid, text) to anon, authenticated;

-- Statistiques de visites du fournisseur connecté, sur les p_jours derniers jours.
create or replace function public.stats_visites(p_jours integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_debut timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_jours, 30), 365)));
  v_resultat jsonb;
begin
  select id into v_id from public.grossiste where user_id = auth.uid();
  if v_id is null then
    return jsonb_build_object('total', 0, 'par_source', '[]'::jsonb, 'par_jour', '[]'::jsonb, 'top_produits', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'total', (select count(*) from public.visite where grossiste_id = v_id and date_visite >= v_debut),
    'par_source', coalesce((
      select jsonb_agg(jsonb_build_object('source', source, 'nb', nb) order by nb desc)
      from (select source, count(*) as nb from public.visite
            where grossiste_id = v_id and date_visite >= v_debut group by source) s
    ), '[]'::jsonb),
    'par_jour', coalesce((
      select jsonb_agg(jsonb_build_object('jour', jour, 'nb', nb) order by jour)
      from (select (date_visite at time zone 'UTC')::date as jour, count(*) as nb from public.visite
            where grossiste_id = v_id and date_visite >= v_debut group by 1) j
    ), '[]'::jsonb),
    'top_produits', coalesce((
      select jsonb_agg(jsonb_build_object('produit_id', produit_id, 'nom', nom, 'nb', nb) order by nb desc)
      from (select v.produit_id, p.nom, count(*) as nb
            from public.visite v join public.produit p on p.id = v.produit_id
            where v.grossiste_id = v_id and v.date_visite >= v_debut
            group by v.produit_id, p.nom order by count(*) desc limit 8) t
    ), '[]'::jsonb)
  ) into v_resultat;

  return v_resultat;
end;
$$;

grant execute on function public.stats_visites(integer) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
--   select proname from pg_proc where proname in ('enregistrer_visite', 'stats_visites');
--   -> deux lignes.
--
-- Test : ouvrir en navigation privée la page publique d'un fournisseur publié, puis dans Supabase :
--   select source, count(*) from public.visite group by source;
--
-- Conservation : la table grossit avec le trafic. Prévoir plus tard un nettoyage des lignes de plus
-- de 12 mois (même principe que le nettoyage des conversations).
