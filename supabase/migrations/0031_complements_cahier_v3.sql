-- 0031 — Compléments du cahier des charges v3 qui ne dépendent pas d'une décision du client
--
-- 1) Statut spécial « fondateur » / « prioritaire » (§4) : réglé par l'équipe, il fait remonter le fournisseur en tête
--    de la recherche (tri par défaut) et des « fournisseurs à la une », avec un badge.
-- 2) Promotions publiques (§15 bis) : badge « Promo » sur les produits concernés, section « Promotions en cours » pour tous ;
--    la notification reste réservée aux acheteurs qui suivent le fournisseur ou qui l'ont déjà contacté.
-- 3) Stock qui baisse à la vente confirmée (§8) : quantité facultative sur la déclaration d'affaire.
-- 4) Cloche : « nouveau fournisseur vérifié dans vos catégories », « de retour en stock » (§13, §16) pour l'acheteur ;
--    « certificat à renouveler » pour le fournisseur.
-- 5) Tendances de la semaine (§16) : produits les plus vus et les plus demandés sur 7 jours.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0030.

-- ---------------------------------------------------------------------------
-- 1) Statut spécial
-- ---------------------------------------------------------------------------
alter table public.grossiste
  add column if not exists statut_special text,
  add column if not exists statut_special_expiration timestamptz;
do $$
begin
  alter table public.grossiste drop constraint if exists grossiste_statut_special_check;
  alter table public.grossiste add constraint grossiste_statut_special_check check (statut_special is null or statut_special in ('fondateur', 'prioritaire'));
end $$;
grant select (statut_special, statut_special_expiration) on public.grossiste to anon, authenticated;

-- Statut en cours (null s'il n'y en a pas ou s'il a expiré)
create or replace function public.statut_special_actif(p_statut text, p_expiration timestamptz)
returns text
language sql
stable
as $$
  select case when p_statut is not null and (p_expiration is null or p_expiration > now()) then p_statut end;
$$;

-- Seule l'équipe le modifie : un fournisseur ne peut pas se l'attribuer
create or replace function public.grossiste_proteger_statut_special()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.statut_special := null;
      new.statut_special_expiration := null;
    else
      new.statut_special := old.statut_special;
      new.statut_special_expiration := old.statut_special_expiration;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists grossiste_proteger_statut_special on public.grossiste;
create trigger grossiste_proteger_statut_special
  before insert or update on public.grossiste
  for each row execute function public.grossiste_proteger_statut_special();

-- Réglage par l'équipe (aussi depuis l'éditeur SQL) : p_statut = 'fondateur', 'prioritaire' ou null pour retirer
create or replace function public.admin_definir_statut_special(p_grossiste_id uuid, p_statut text, p_expiration timestamptz default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut is not null and p_statut not in ('fondateur', 'prioritaire') then
    raise exception 'Statut inconnu : fondateur, prioritaire ou null.';
  end if;
  update public.grossiste set statut_special = p_statut, statut_special_expiration = case when p_statut is null then null else p_expiration end
  where id = p_grossiste_id;
  perform public.journaliser('statut_special', 'grossiste', p_grossiste_id::text, jsonb_build_object('statut', p_statut, 'expiration', p_expiration));
end;
$$;
revoke all on function public.admin_definir_statut_special(uuid, text, timestamptz) from public, anon;
grant execute on function public.admin_definir_statut_special(uuid, text, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Promotions publiques
-- ---------------------------------------------------------------------------
-- Une promotion est en cours si elle n'est ni retirée ni terminée, chez un fournisseur publié (jamais un fournisseur de test)
create or replace function public.promotions_en_cours(p_limite integer default 24, p_grossiste_id uuid default null)
returns table (id uuid, titre text, texte text, date_fin timestamptz, produit_id uuid, produit_nom text, photo_url text,
               prix_gros_fcfa integer, prix_min integer, moq integer, unite text,
               grossiste_id uuid, grossiste_nom text, badge_verifie boolean, logo_url text)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.titre, a.texte, a.date_fin, p.id, p.nom, p.photo_url, p.prix_gros_fcfa::int,
         case when p.id is null then null
              else coalesce((select min((x ->> 'prix')::int) from jsonb_array_elements(coalesce(p.paliers, '[]'::jsonb)) x), p.prix_gros_fcfa)::int end,
         p.moq::int, p.unite, g.id, g.nom, g.badge_verifie, g.logo_url
  from public.annonce a
  join public.grossiste g on g.id = a.grossiste_id and g.statut = 'publie' and not g.est_test
  left join public.produit p on p.id = a.produit_id and p.statut = 'publie' and p.actif and not p.est_test
  where a.type = 'promotion' and not a.retiree and a.date_publication <= now() and (a.date_fin is null or a.date_fin > now())
    and (a.produit_id is null or p.id is not null)
    and (p_grossiste_id is null or a.grossiste_id = p_grossiste_id)
  order by a.date_publication desc
  limit least(greatest(coalesce(p_limite, 24), 1), 100);
$$;
revoke all on function public.promotions_en_cours(integer, uuid) from public;
grant execute on function public.promotions_en_cours(integer, uuid) to anon, authenticated;

-- Le produit est-il en promotion (lui-même, ou tout le catalogue de son fournisseur) ?
create or replace function public.produit_en_promotion(p_produit_id uuid, p_grossiste_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.annonce a
    where a.type = 'promotion' and not a.retiree and a.grossiste_id = p_grossiste_id
      and a.date_publication <= now() and (a.date_fin is null or a.date_fin > now())
      and (a.produit_id is null or a.produit_id = p_produit_id)
  );
$$;

-- La recherche (0029) renvoie aussi « en promotion » et « mis en avant » ; le statut spécial passe en tête du tri par défaut
drop function if exists public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer, text);
create function public.rechercher_catalogue(
  p_q text default null,
  p_categorie text default null,
  p_pays text default null,
  p_ville text default null,
  p_commune text default null,
  p_prix_max integer default null,
  p_qte_max integer default null,
  p_verifies boolean default false,
  p_tri text default 'pertinence',
  p_limite integer default 24,
  p_decalage integer default 0,
  p_origine text default null
)
returns table (
  id uuid, nom text, photo_url text, prix_gros_fcfa integer, prix_min integer, moq integer, unite text, categorie text,
  date_ajout timestamptz, grossiste_id uuid, grossiste_nom text, badge_verifie boolean, ville text, commune text, pays_code text,
  total bigint, en_promotion boolean, mis_en_avant boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with mots as (select nullif(public.sans_accent(btrim(coalesce(p_q, ''))), '') as q),
  base as (
    select p.id, p.nom, p.photo_url, p.prix_gros_fcfa::int as prix_gros_fcfa,
           coalesce((select min((x ->> 'prix')::int) from jsonb_array_elements(coalesce(p.paliers, '[]'::jsonb)) x), p.prix_gros_fcfa)::int as prix_min,
           coalesce(p.moq, 1)::int as moq, p.unite, coalesce(p.categorie, g.categorie) as categorie, p.date_ajout,
           g.id as grossiste_id, g.nom as grossiste_nom, g.badge_verifie, g.ville, g.commune, g.pays_code,
           public.statut_special_actif(g.statut_special, g.statut_special_expiration) is not null as mis_en_avant,
           case
             when m.q is null then 0
             when public.sans_accent(p.nom) like '%' || m.q || '%' then 3
             when exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where public.sans_accent(t) like '%' || m.q || '%') then 2
             else 1
           end as score
    from public.produit p
    join public.grossiste g on g.id = p.grossiste_id
    cross join mots m
    where p.statut = 'publie' and p.actif and not p.est_test
      and g.statut = 'publie' and not g.est_test
      and (m.q is null
           or public.sans_accent(p.nom) like '%' || m.q || '%'
           or public.sans_accent(p.description) like '%' || m.q || '%'
           or public.sans_accent(coalesce(p.categorie, g.categorie)) like '%' || m.q || '%'
           or public.sans_accent(p.sous_categorie) like '%' || m.q || '%'
           or public.sans_accent(g.nom) like '%' || m.q || '%'
           or exists (select 1 from unnest(coalesce(p.tags, '{}'::text[])) t where public.sans_accent(t) like '%' || m.q || '%'))
      and (nullif(p_categorie, '') is null or coalesce(p.categorie, g.categorie) = p_categorie)
      and (nullif(p_pays, '') is null or g.pays_code = upper(p_pays))
      and (nullif(p_ville, '') is null or public.sans_accent(g.ville) = public.sans_accent(p_ville))
      and (nullif(p_commune, '') is null or public.sans_accent(g.commune) = public.sans_accent(p_commune))
      and (p_qte_max is null or coalesce(p.moq, 1) <= p_qte_max)
      and (not coalesce(p_verifies, false) or g.badge_verifie)
      and (nullif(p_origine, '') is null or (g.afficher_origine and g.pays_origine = upper(p_origine)))
  ),
  filtres as (select * from base where p_prix_max is null or prix_min <= p_prix_max)
  select f.id, f.nom, f.photo_url, f.prix_gros_fcfa, f.prix_min, f.moq, f.unite, f.categorie, f.date_ajout,
         f.grossiste_id, f.grossiste_nom, f.badge_verifie, f.ville, f.commune, f.pays_code,
         count(*) over () as total,
         public.produit_en_promotion(f.id, f.grossiste_id) as en_promotion,
         f.mis_en_avant
  from filtres f
  order by
    -- Fournisseurs mis en avant d'abord, sauf quand l'acheteur a choisi un tri par prix ou par minimum
    case when coalesce(p_tri, 'pertinence') in ('pertinence', 'nouveautes') and f.mis_en_avant then 0 else 1 end,
    case when p_tri = 'prix_asc' then f.prix_min end asc nulls last,
    case when p_tri = 'prix_desc' then f.prix_gros_fcfa end desc nulls last,
    case when p_tri = 'moq_asc' then f.moq end asc nulls last,
    case when p_tri = 'nouveautes' then f.date_ajout end desc nulls last,
    f.score desc, f.badge_verifie desc, f.date_ajout desc nulls last, f.id
  limit least(greatest(coalesce(p_limite, 24), 1), 100)
  offset greatest(coalesce(p_decalage, 0), 0);
$$;
revoke all on function public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer, text) from public;
grant execute on function public.rechercher_catalogue(text, text, text, text, text, integer, integer, boolean, text, integer, integer, text) to anon, authenticated;

-- « Fournisseurs à la une » (0026) : les fournisseurs mis en avant d'abord, avec leur statut
drop function if exists public.fournisseurs_a_la_une(integer);
create function public.fournisseurs_a_la_une(p_limite integer default 4)
returns table (
  id uuid, nom text, ville text, categorie text, logo_url text, badge_verifie boolean, est_fabricant boolean,
  nb_avis integer, note numeric, prix_min bigint, moq_prix_min integer, date_ajout timestamptz, verifie_le timestamptz, slug text,
  statut_special text
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.nom, g.ville, g.categorie, g.logo_url, g.badge_verifie, g.est_fabricant,
         coalesce(av.nb, 0), av.moyenne, pm.prix::bigint, pm.moq::int, g.date_ajout, g.verifie_le, g.slug,
         public.statut_special_actif(g.statut_special, g.statut_special_expiration)
  from public.grossiste g
  join lateral (
    select coalesce((select min((x ->> 'prix')::int) from jsonb_array_elements(coalesce(p.paliers, '[]'::jsonb)) x), p.prix_gros_fcfa) as prix, p.moq
    from public.produit p
    where p.grossiste_id = g.id and p.statut = 'publie' and p.actif and not p.est_test
    order by 1 asc
    limit 1
  ) pm on true
  left join lateral (
    select count(*)::int as nb, round(avg(a.note)::numeric, 1) as moyenne
    from public.avis a
    where a.grossiste_id = g.id and a.statut = 'publie'
  ) av on true
  where g.statut = 'publie' and not g.est_test
  order by (public.statut_special_actif(g.statut_special, g.statut_special_expiration) is not null) desc,
           g.badge_verifie desc, av.moyenne desc nulls last, g.date_ajout desc nulls last
  limit least(coalesce(p_limite, 4), 12);
$$;
revoke all on function public.fournisseurs_a_la_une(integer) from public;
grant execute on function public.fournisseurs_a_la_une(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Le stock baisse à la vente confirmée
-- ---------------------------------------------------------------------------
alter table public.affaire add column if not exists quantite integer;
do $$
begin
  alter table public.affaire drop constraint if exists affaire_quantite_check;
  alter table public.affaire add constraint affaire_quantite_check check (quantite is null or quantite > 0);
end $$;

drop function if exists public.declarer_affaire(uuid, bigint, text);
create or replace function public.declarer_affaire(p_conversation_id uuid, p_montant bigint, p_description text default null, p_quantite integer default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_role text;
  v_id uuid;
begin
  select cv.id, cv.grossiste_id, cv.vendeur_id, cv.produit_id into c from public.conversation cv where cv.id = p_conversation_id;
  if not found then
    raise exception 'Conversation introuvable';
  end if;
  v_role := public.role_dans(c.grossiste_id, c.vendeur_id);
  if v_role is null then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_montant is null or p_montant <= 0 then
    raise exception 'Indiquez un montant supérieur à zéro.';
  end if;
  if p_quantite is not null and p_quantite <= 0 then
    raise exception 'La quantité doit être supérieure à zéro.';
  end if;
  if (select count(*) from public.affaire where conversation_id = p_conversation_id and statut = 'proposee') >= 3 then
    raise exception 'Trois déclarations sont déjà en attente de réponse dans cette conversation.';
  end if;

  insert into public.affaire (conversation_id, grossiste_id, vendeur_id, produit_id, grossiste_nom, vendeur_nom, produit_nom,
                              montant_fcfa, description, declaree_par, quantite)
  values (c.id, c.grossiste_id, c.vendeur_id, c.produit_id,
          (select nom from public.grossiste where id = c.grossiste_id),
          (select nom from public.vendeur where id = c.vendeur_id),
          (select nom from public.produit where id = c.produit_id),
          p_montant, nullif(btrim(p_description), ''), v_role, p_quantite)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.declarer_affaire(uuid, bigint, text, integer) from public, anon;
grant execute on function public.declarer_affaire(uuid, bigint, text, integer) to authenticated;

-- Confirmation par l'autre partie : le stock du produit de la conversation baisse de la quantité vendue (jamais sous zéro)
create or replace function public.affaire_baisser_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'confirmee' and old.statut is distinct from 'confirmee' and new.produit_id is not null and new.quantite is not null then
    update public.produit
    set stock_disponible = greatest(0, stock_disponible - new.quantite), stock_maj_le = now()
    where id = new.produit_id and stock_disponible is not null;
  end if;
  return new;
end;
$$;
drop trigger if exists affaire_baisser_stock on public.affaire;
create trigger affaire_baisser_stock
  after update of statut on public.affaire
  for each row execute function public.affaire_baisser_stock();

-- ---------------------------------------------------------------------------
-- 4) Cloche : alertes acheteur et fournisseur
-- ---------------------------------------------------------------------------
-- Date du dernier retour en stock (passage de 0 à plus de 0)
alter table public.produit add column if not exists retour_stock_le timestamptz;
create or replace function public.produit_retour_stock()
returns trigger
language plpgsql
as $$
begin
  if old.stock_disponible = 0 and coalesce(new.stock_disponible, 0) > 0 then
    new.retour_stock_le := now();
  end if;
  return new;
end;
$$;
drop trigger if exists produit_retour_stock on public.produit;
create trigger produit_retour_stock
  before update of stock_disponible on public.produit
  for each row execute function public.produit_retour_stock();

-- La cloche (0030), complétée :
--   acheteur : promotions des fournisseurs suivis OU déjà contactés ; nouveau fournisseur vérifié dans ses catégories ;
--              retour en stock d'un produit enregistré ou d'un fournisseur suivi ;
--   fournisseur : certificat qui expire dans 30 jours (ou expiré depuis moins de 7 jours).
create or replace function public.ma_cloche(p_limite integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vendeur uuid := (select id from public.vendeur where user_id = auth.uid());
  v_grossiste uuid := (select id from public.grossiste where user_id = auth.uid());
  v_vu_le timestamptz := (select vu_le from public.cloche_lecture where user_id = auth.uid());
  v_elements jsonb;
begin
  with
  relations as (
    select f.grossiste_id from public.favori f where f.vendeur_id = v_vendeur
    union
    select cv.grossiste_id from public.conversation cv where cv.vendeur_id = v_vendeur
  ),
  categories as (
    select g.categorie from public.grossiste g where g.id in (select grossiste_id from relations) and g.categorie is not null
    union
    select coalesce(p.categorie, g.categorie) from public.favori_produit fp
      join public.produit p on p.id = fp.produit_id join public.grossiste g on g.id = p.grossiste_id
      where fp.vendeur_id = v_vendeur
  ),
  elements as (
    -- Annonces de LOOHOO et promotions
    select a.id::text as id, a.type, a.titre, a.texte, a.lien, a.date_publication, g.nom as fournisseur, g.badge_verifie
    from public.annonce a
    left join public.grossiste g on g.id = a.grossiste_id
    where not a.retiree
      and a.date_publication <= now() and a.date_publication > now() - interval '120 days'
      and (a.date_fin is null or a.date_fin > now())
      and (a.grossiste_id is null
           or (v_vendeur is not null and g.statut = 'publie' and not g.est_test and a.grossiste_id in (select grossiste_id from relations)))
    union all
    -- Nouveau fournisseur vérifié dans une catégorie qui intéresse l'acheteur
    select 'f-' || g.id, 'fournisseur', 'Nouveau fournisseur vérifié : ' || g.nom,
           concat_ws(' · ', g.categorie, coalesce(g.commune, g.ville)), '/grossiste/' || g.id, g.verifie_le, g.nom, true
    from public.grossiste g
    where v_vendeur is not null and g.badge_verifie and g.statut = 'publie' and not g.est_test
      and g.verifie_le > now() - interval '30 days'
      and g.categorie in (select categorie from categories)
      and g.id not in (select grossiste_id from relations)
    union all
    -- De retour en stock
    select 's-' || p.id || '-' || floor(extract(epoch from p.retour_stock_le))::bigint, 'stock', 'De retour en stock : ' || p.nom,
           g.nom, '/produit/' || p.id, p.retour_stock_le, g.nom, g.badge_verifie
    from public.produit p
    join public.grossiste g on g.id = p.grossiste_id
    where v_vendeur is not null and p.retour_stock_le > now() - interval '14 days'
      and p.statut = 'publie' and p.actif and not p.est_test and g.statut = 'publie' and not g.est_test
      and (p.id in (select produit_id from public.favori_produit where vendeur_id = v_vendeur)
           or p.grossiste_id in (select grossiste_id from public.favori where vendeur_id = v_vendeur))
    union all
    -- Certificat à renouveler (fournisseur)
    select 'c-' || c.id || '-' || c.date_expiration, 'certificat',
           case when c.date_expiration < current_date then 'Certificat expiré : ' else 'Certificat à renouveler : ' end || c.type_certificat,
           p.nom || ' · ' || case when c.date_expiration < current_date then 'expiré le ' else 'expire le ' end || to_char(c.date_expiration, 'DD/MM/YYYY'),
           '/produits/' || p.id || '/modifier',
           case when c.date_expiration < current_date then c.date_expiration::timestamptz else (c.date_expiration - 30)::timestamptz end,
           null, null
    from public.certificat_produit c
    join public.produit p on p.id = c.produit_id
    where v_grossiste is not null and p.grossiste_id = v_grossiste and c.statut <> 'rejete'
      and c.date_expiration between current_date - 7 and current_date + 30
  )
  select coalesce(jsonb_agg(x order by x.date_publication desc), '[]'::jsonb) into v_elements
  from (select * from elements order by date_publication desc limit least(greatest(coalesce(p_limite, 20), 1), 100)) x;
  return jsonb_build_object('vu_le', v_vu_le, 'elements', v_elements);
end;
$$;
revoke all on function public.ma_cloche(integer) from public;
grant execute on function public.ma_cloche(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Tendances de la semaine
-- ---------------------------------------------------------------------------
-- Score = vues des 7 derniers jours + 5 points par conversation ouverte sur le produit
create or replace function public.tendances_semaine(p_limite integer default 12)
returns table (id uuid, nom text, photo_url text, prix_gros_fcfa integer, prix_min integer, moq integer, unite text, categorie text,
               date_ajout timestamptz, grossiste_id uuid, grossiste_nom text, badge_verifie boolean, en_promotion boolean, score bigint)
language sql
stable
security definer
set search_path = public
as $$
  with activite as (
    select produit_id, count(*)::bigint as points from public.visite
    where produit_id is not null and date_visite > now() - interval '7 days' group by produit_id
    union all
    select produit_id, count(*)::bigint * 5 from public.conversation
    where produit_id is not null and derniere_activite > now() - interval '7 days' group by produit_id
  ),
  scores as (select produit_id, sum(points)::bigint as score from activite group by produit_id)
  select p.id, p.nom, p.photo_url, p.prix_gros_fcfa::int,
         coalesce((select min((x ->> 'prix')::int) from jsonb_array_elements(coalesce(p.paliers, '[]'::jsonb)) x), p.prix_gros_fcfa)::int,
         coalesce(p.moq, 1)::int, p.unite, coalesce(p.categorie, g.categorie), p.date_ajout,
         g.id, g.nom, g.badge_verifie, public.produit_en_promotion(p.id, g.id), s.score
  from scores s
  join public.produit p on p.id = s.produit_id and p.statut = 'publie' and p.actif and not p.est_test
  join public.grossiste g on g.id = p.grossiste_id and g.statut = 'publie' and not g.est_test
  order by s.score desc, p.date_ajout desc
  limit least(greatest(coalesce(p_limite, 12), 1), 48);
$$;
revoke all on function public.tendances_semaine(integer) from public;
grant execute on function public.tendances_semaine(integer) to anon, authenticated;

notify pgrst, 'reload schema';
