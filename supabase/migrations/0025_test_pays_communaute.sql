-- 0025 — Retours du client (13 oct. 2026) : statut « test », pays affichés, liens de la communauté
--
-- 1) Statut « test » : un fournisseur ou un produit marqué test reste visible de son propriétaire et de l'équipe,
--    mais pas du public, et ne compte pas dans les chiffres.
--      update public.grossiste set est_test = true where nom = 'THE ULCERE';
-- 2) Pays : Côte d'Ivoire (ouvert), Sénégal et Cameroun (bientôt) ; les autres pays restent prêts mais masqués.
--      select public.admin_statut_pays('SN', 'actif');   -- 'actif' | 'bientot' | 'masque'
-- 3) Liens « Rejoignez la communauté » (WhatsApp, TikTok, Facebook, YouTube, Instagram, LinkedIn, Snapchat) :
--    réglés par l'équipe, lisibles par tous ; un lien vide ne s'affiche pas.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

-- ---------------------------------------------------------------------------
-- 1) Statut « test »
-- ---------------------------------------------------------------------------
alter table public.grossiste add column if not exists est_test boolean not null default false;
alter table public.produit add column if not exists est_test boolean not null default false;

-- Fonctions d'appui (security definer : pas de conflit avec les règles de lecture des tables)
create or replace function public.grossiste_cache(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select est_test from public.grossiste where id = p_id), false);
$$;

create or replace function public.est_mon_grossiste(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.grossiste where id = p_id and user_id = auth.uid());
$$;
grant execute on function public.grossiste_cache(uuid) to anon, authenticated;
grant execute on function public.est_mon_grossiste(uuid) to anon, authenticated;

-- Règles « restrictives » : elles s'ajoutent aux règles de lecture existantes sans les remplacer
drop policy if exists grossiste_masquer_test on public.grossiste;
create policy grossiste_masquer_test on public.grossiste as restrictive for select to anon, authenticated
  using (not est_test or user_id = auth.uid() or public.is_admin());

drop policy if exists produit_masquer_test on public.produit;
create policy produit_masquer_test on public.produit as restrictive for select to anon, authenticated
  using ((not est_test and not public.grossiste_cache(grossiste_id)) or public.est_mon_grossiste(grossiste_id) or public.is_admin());

grant select (est_test) on public.grossiste to anon, authenticated;
grant select (est_test) on public.produit to anon, authenticated;

-- Seule l'équipe marque un fournisseur ou un produit comme test
create or replace function public.proteger_est_test()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.est_test := case when tg_op = 'UPDATE' then old.est_test else false end;
  end if;
  return new;
end;
$$;
drop trigger if exists grossiste_proteger_est_test on public.grossiste;
create trigger grossiste_proteger_est_test before insert or update on public.grossiste for each row execute function public.proteger_est_test();
drop trigger if exists produit_proteger_est_test on public.produit;
create trigger produit_proteger_est_test before insert or update on public.produit for each row execute function public.proteger_est_test();

-- Les fonctions publiques ignorent les données de test
create or replace function public.chiffres_publics()
returns table (fournisseurs integer, verifies integer, produits integer, pays integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::int from public.grossiste where statut = 'publie' and not est_test),
    (select count(*)::int from public.grossiste where statut = 'publie' and badge_verifie and not est_test),
    (select count(*)::int from public.produit p join public.grossiste g on g.id = p.grossiste_id
       where p.statut = 'publie' and p.actif and not p.est_test and g.statut = 'publie' and not g.est_test),
    (select count(distinct nullif(btrim(pays), ''))::int from public.grossiste where statut = 'publie' and not est_test);
$$;

create or replace function public.fournisseurs_a_la_une(p_limite integer default 4)
returns table (
  id uuid, nom text, ville text, categorie text, logo_url text, badge_verifie boolean, est_fabricant boolean,
  nb_avis integer, note numeric, prix_min bigint, moq_prix_min integer
)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.nom, g.ville, g.categorie, g.logo_url, g.badge_verifie, g.est_fabricant,
         coalesce(av.nb, 0), av.moyenne, pm.prix::bigint, pm.moq::int
  from public.grossiste g
  join lateral (
    select p.prix_gros_fcfa as prix, p.moq
    from public.produit p
    where p.grossiste_id = g.id and p.statut = 'publie' and p.actif and not p.est_test
    order by p.prix_gros_fcfa asc
    limit 1
  ) pm on true
  left join lateral (
    select count(*)::int as nb, round(avg(a.note)::numeric, 1) as moyenne
    from public.avis a
    where a.grossiste_id = g.id and a.statut = 'publie'
  ) av on true
  where g.statut = 'publie' and not g.est_test
  order by g.badge_verifie desc, av.moyenne desc nulls last, g.date_ajout desc nulls last
  limit least(coalesce(p_limite, 4), 12);
$$;

create or replace function public.grossiste_id_par_slug(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.grossiste
  where slug = lower(btrim(p_slug)) and statut = 'publie' and (not est_test or user_id = auth.uid() or public.is_admin());
$$;

-- ---------------------------------------------------------------------------
-- 2) Pays affichés
-- ---------------------------------------------------------------------------
alter table public.pays_loohoo add column if not exists visible boolean not null default true;

insert into public.pays_loohoo (code, nom, dans, indicatif, devise, actif, ordre) values
  ('CM', 'Cameroun', 'au Cameroun', '237', 'XAF', false, 3)
on conflict (code) do nothing;

-- Une seule fois : Côte d'Ivoire, Sénégal, Cameroun visibles ; les autres masqués
do $$
begin
  if not exists (select 1 from public.parametre where cle = 'pays_affichage_initialise') then
    update public.pays_loohoo set visible = code in ('CI', 'SN', 'CM');
    update public.pays_loohoo set ordre = case code when 'CI' then 1 when 'SN' then 2 when 'CM' then 3 else ordre + 10 end;
    insert into public.parametre (cle, valeur) values ('pays_affichage_initialise', 'true'::jsonb);
  end if;
end $$;

create or replace function public.admin_statut_pays(p_code text, p_statut text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('actif', 'bientot', 'masque') then
    raise exception 'Statut inconnu : actif, bientot ou masque.';
  end if;
  update public.pays_loohoo
  set actif = (p_statut = 'actif'), visible = (p_statut <> 'masque')
  where code = upper(p_code);
  if not found then
    raise exception 'Pays inconnu.';
  end if;
  if auth.uid() is not null then
    perform public.journaliser('pays_statut', 'pays', upper(p_code), jsonb_build_object('statut', p_statut));
  end if;
end;
$$;
revoke all on function public.admin_statut_pays(text, text) from public, anon;
grant execute on function public.admin_statut_pays(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Liens de la communauté
-- ---------------------------------------------------------------------------
insert into public.parametre (cle, valeur) values ('liens_communaute', '{
  "whatsapp": "", "whatsapp_chaine": "", "tiktok": "", "facebook": "", "facebook_groupe": "",
  "youtube": "", "instagram": "", "linkedin": "", "snapchat": ""
}'::jsonb)
on conflict (cle) do nothing;

create or replace function public.liens_communaute()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select valeur from public.parametre where cle = 'liens_communaute'), '{}'::jsonb);
$$;
revoke all on function public.liens_communaute() from public;
grant execute on function public.liens_communaute() to anon, authenticated;

-- Exemple : select public.admin_definir_lien_communaute('youtube', 'https://www.youtube.com/@loohoo');
create or replace function public.admin_definir_lien_communaute(p_reseau text, p_lien text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_reseau not in ('whatsapp', 'whatsapp_chaine', 'tiktok', 'facebook', 'facebook_groupe', 'youtube', 'instagram', 'linkedin', 'snapchat') then
    raise exception 'Réseau inconnu.';
  end if;
  if coalesce(btrim(p_lien), '') <> '' and btrim(p_lien) !~* '^https://' then
    raise exception 'Le lien doit commencer par https://';
  end if;
  update public.parametre
  set valeur = jsonb_set(valeur, array[p_reseau], to_jsonb(coalesce(btrim(p_lien), ''))), maj = now()
  where cle = 'liens_communaute';
end;
$$;
revoke all on function public.admin_definir_lien_communaute(text, text) from public, anon;
grant execute on function public.admin_definir_lien_communaute(text, text) to authenticated;
