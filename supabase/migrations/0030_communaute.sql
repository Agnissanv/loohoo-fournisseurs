-- 0030 — Lot 5 (retours du client) : la communauté et la cloche de notifications
--
-- La cloche annonce : les nouveautés de la plateforme et les annonces LOOHOO (publiées par l'équipe), l'ouverture d'un
-- nouveau pays (automatique), les promotions des fournisseurs qu'on suit (publiées par les fournisseurs) et les nouvelles
-- vidéos YouTube (lues sur la chaîne par api/videos-youtube.js, rien à stocker ici).
--   admin_publier_annonce(type, titre, texte, lien) · admin_retirer_annonce(id) · admin_annonces()
--   publier_promotion(titre, texte, produit, date_fin) · retirer_ma_promotion(id) · mes_promotions() · mes_abonnes()
--   ma_cloche(limite) · marquer_cloche_lue()
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé. Après 0029.

create table if not exists public.annonce (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('nouveaute', 'annonce', 'pays', 'promotion')),
  titre text not null check (char_length(btrim(titre)) between 1 and 120),
  texte text check (texte is null or char_length(texte) <= 500),
  lien text check (lien is null or lien ~ '^(/|https://)'),
  grossiste_id uuid references public.grossiste (id) on delete cascade,
  produit_id uuid references public.produit (id) on delete set null,
  date_publication timestamptz not null default now(),
  date_fin timestamptz,
  retiree boolean not null default false
);
create index if not exists annonce_date_idx on public.annonce (date_publication desc);
create index if not exists annonce_grossiste_idx on public.annonce (grossiste_id, date_publication desc);
alter table public.annonce enable row level security;
revoke all on public.annonce from anon, authenticated;

-- Dernière ouverture de la cloche, par compte (les visiteurs sans compte la gardent dans leur navigateur)
create table if not exists public.cloche_lecture (
  user_id uuid primary key,
  vu_le timestamptz not null default now()
);
alter table public.cloche_lecture enable row level security;
revoke all on public.cloche_lecture from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Annonces de l'équipe (aussi utilisables depuis l'éditeur SQL de Supabase)
-- ---------------------------------------------------------------------------
create or replace function public.admin_publier_annonce(p_type text, p_titre text, p_texte text default null, p_lien text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nouveau uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_type not in ('nouveaute', 'annonce', 'pays') then
    raise exception 'Type inconnu : nouveaute, annonce ou pays.';
  end if;
  insert into public.annonce (type, titre, texte, lien)
  values (p_type, btrim(p_titre), nullif(btrim(coalesce(p_texte, '')), ''), nullif(btrim(coalesce(p_lien, '')), ''))
  returning id into nouveau;
  perform public.journaliser('annonce_publiee', 'annonce', nouveau::text, jsonb_build_object('type', p_type, 'titre', p_titre));
  return nouveau;
end;
$$;
revoke all on function public.admin_publier_annonce(text, text, text, text) from public, anon;
grant execute on function public.admin_publier_annonce(text, text, text, text) to authenticated;

-- Retire une annonce ou une promotion (modération après coup)
create or replace function public.admin_retirer_annonce(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  update public.annonce set retiree = true where id = p_id;
  perform public.journaliser('annonce_retiree', 'annonce', p_id::text, '{}'::jsonb);
end;
$$;
revoke all on function public.admin_retirer_annonce(uuid) from public, anon;
grant execute on function public.admin_retirer_annonce(uuid) to authenticated;

create or replace function public.admin_annonces(p_limite integer default 100)
returns table (id uuid, type text, titre text, texte text, lien text, grossiste_nom text, date_publication timestamptz, date_fin timestamptz, retiree boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  return query
    select a.id, a.type, a.titre, a.texte, a.lien, g.nom, a.date_publication, a.date_fin, a.retiree
    from public.annonce a left join public.grossiste g on g.id = a.grossiste_id
    order by a.date_publication desc
    limit least(coalesce(p_limite, 100), 500);
end;
$$;
revoke all on function public.admin_annonces(integer) from public, anon;
grant execute on function public.admin_annonces(integer) to authenticated;

-- Ouverture d'un pays : l'annonce part toute seule (« LOOHOO est ouvert au Sénégal »)
create or replace function public.annonce_ouverture_pays()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actif and not coalesce(old.actif, false) then
    insert into public.annonce (type, titre, texte, lien)
    values ('pays', 'LOOHOO est ouvert ' || new.dans,
            'Les fournisseurs peuvent s''inscrire et publier leurs produits dès maintenant, et les acheteurs les trouver dans la recherche.',
            '/?pays=' || new.code);
  end if;
  return new;
end;
$$;

drop trigger if exists annonce_ouverture_pays on public.pays_loohoo;
create trigger annonce_ouverture_pays
  after update of actif on public.pays_loohoo
  for each row execute function public.annonce_ouverture_pays();

-- ---------------------------------------------------------------------------
-- Promotions des fournisseurs : reçues par les acheteurs qui les suivent
-- ---------------------------------------------------------------------------
create or replace function public.publier_promotion(p_titre text, p_texte text default null, p_produit_id uuid default null, p_date_fin timestamptz default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.grossiste;
  texte text := concat_ws(' ', p_titre, p_texte);
  problemes text[] := '{}';
  fin timestamptz := coalesce(p_date_fin, now() + interval '14 days');
  nouveau uuid;
begin
  select * into g from public.grossiste where user_id = auth.uid();
  if g.id is null then
    raise exception 'Réservé aux fournisseurs.' using errcode = '42501';
  end if;
  if g.statut <> 'publie' then
    raise exception 'Votre profil doit être en ligne pour publier une promotion.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_titre), '') = '' or char_length(btrim(p_titre)) > 80 then
    raise exception 'Le titre est obligatoire (80 caractères au plus).' using errcode = '22023';
  end if;
  if char_length(coalesce(p_texte, '')) > 300 then
    raise exception 'Le texte de la promotion fait 300 caractères au plus.' using errcode = '22023';
  end if;
  if fin <= now() or fin > now() + interval '60 days' then
    raise exception 'La date de fin doit être dans les 60 prochains jours.' using errcode = '22023';
  end if;
  if p_produit_id is not null and not exists (
    select 1 from public.produit where id = p_produit_id and grossiste_id = g.id and statut = 'publie' and actif) then
    raise exception 'Ce produit n''est pas en ligne dans votre catalogue.' using errcode = '22023';
  end if;
  if (select count(*) from public.annonce where grossiste_id = g.id and type = 'promotion' and date_publication > now() - interval '7 days') >= 3 then
    raise exception 'Trois promotions par semaine au maximum : vos abonnés doivent garder envie de les lire.' using errcode = '22023';
  end if;
  -- Même contrôle à l'envoi que les produits et le profil
  if public.contient_coordonnees(texte) then
    problemes := array_append(problemes, 'une coordonnée (numéro, e-mail, lien ou pseudo)');
  end if;
  problemes := problemes || public.promesses_interdites(texte);
  if cardinality(problemes) > 0 then
    raise exception 'Votre texte contient %. Retirez-la pour publier : les acheteurs vous contactent par LOOHOO, et les promesses de santé, de résultat ou de livraison ne sont pas autorisées.',
      array_to_string(problemes, ', ') using errcode = '22023';
  end if;

  insert into public.annonce (type, titre, texte, lien, grossiste_id, produit_id, date_fin)
  values ('promotion', btrim(p_titre), nullif(btrim(coalesce(p_texte, '')), ''),
          case when p_produit_id is not null then '/produit/' || p_produit_id else '/grossiste/' || g.id end,
          g.id, p_produit_id, fin)
  returning id into nouveau;
  return nouveau;
end;
$$;
revoke all on function public.publier_promotion(text, text, uuid, timestamptz) from public, anon;
grant execute on function public.publier_promotion(text, text, uuid, timestamptz) to authenticated;

create or replace function public.retirer_ma_promotion(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.annonce a set retiree = true
  from public.grossiste g
  where a.id = p_id and a.type = 'promotion' and g.id = a.grossiste_id and g.user_id = auth.uid();
$$;
revoke all on function public.retirer_ma_promotion(uuid) from public, anon;
grant execute on function public.retirer_ma_promotion(uuid) to authenticated;

create or replace function public.mes_promotions()
returns table (id uuid, titre text, texte text, produit_id uuid, produit_nom text, date_publication timestamptz, date_fin timestamptz, retiree boolean)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.titre, a.texte, a.produit_id, p.nom, a.date_publication, a.date_fin, a.retiree
  from public.annonce a
  join public.grossiste g on g.id = a.grossiste_id and g.user_id = auth.uid()
  left join public.produit p on p.id = a.produit_id
  where a.type = 'promotion'
  order by a.date_publication desc
  limit 50;
$$;
revoke all on function public.mes_promotions() from public, anon;
grant execute on function public.mes_promotions() to authenticated;

-- Nombre d'acheteurs qui suivent le fournisseur connecté (ceux qui recevront ses promotions)
create or replace function public.mes_abonnes()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.favori f join public.grossiste g on g.id = f.grossiste_id where g.user_id = auth.uid();
$$;
revoke all on function public.mes_abonnes() from public, anon;
grant execute on function public.mes_abonnes() to authenticated;

-- ---------------------------------------------------------------------------
-- La cloche
-- ---------------------------------------------------------------------------
-- Pour tous : les annonces de LOOHOO. Pour un acheteur : en plus, les promotions en cours des fournisseurs qu'il suit.
-- Renvoie { vu_le, elements: [...] } ; vu_le est null pour un visiteur sans compte (il le garde dans son navigateur).
create or replace function public.ma_cloche(p_limite integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_vendeur uuid := (select id from public.vendeur where user_id = auth.uid());
  v_vu_le timestamptz := (select vu_le from public.cloche_lecture where user_id = auth.uid());
  v_elements jsonb;
begin
  select coalesce(jsonb_agg(x order by x.date_publication desc), '[]'::jsonb) into v_elements
  from (
    select a.id, a.type, a.titre, a.texte, a.lien, a.date_publication, g.nom as fournisseur, g.badge_verifie
    from public.annonce a
    left join public.grossiste g on g.id = a.grossiste_id
    where not a.retiree
      and a.date_publication <= now() and a.date_publication > now() - interval '120 days'
      and (a.date_fin is null or a.date_fin > now())
      and (a.grossiste_id is null
           or (v_vendeur is not null and g.statut = 'publie' and not g.est_test
               and exists (select 1 from public.favori f where f.vendeur_id = v_vendeur and f.grossiste_id = a.grossiste_id)))
    order by a.date_publication desc
    limit least(greatest(coalesce(p_limite, 20), 1), 100)
  ) x;
  return jsonb_build_object('vu_le', v_vu_le, 'elements', v_elements);
end;
$$;
revoke all on function public.ma_cloche(integer) from public;
grant execute on function public.ma_cloche(integer) to anon, authenticated;

create or replace function public.marquer_cloche_lue()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  insert into public.cloche_lecture (user_id, vu_le) values (auth.uid(), now())
  on conflict (user_id) do update set vu_le = excluded.vu_le;
end;
$$;
revoke all on function public.marquer_cloche_lue() from public, anon;
grant execute on function public.marquer_cloche_lue() to authenticated;
