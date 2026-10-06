-- 0013 — Rôles d'administrateur et catégories gérées depuis l'administration
--
-- 1) Deux rôles :
--      super_admin : tout, y compris le taux de commission, le suivi des commissions, l'équipe d'administration et les catégories.
--      moderateur  : valide, rejette, suspend, vérifie les stocks, lit les conversations. Aucun accès aux sujets d'argent
--                    ni à la gestion de l'équipe.
--    Les administrateurs déjà en place deviennent super_admin. Un super_admin peut en ajouter d'autres (la personne doit
--    déjà avoir un compte sur le site), changer un rôle ou retirer un accès. Il reste toujours au moins un super_admin.
-- 2) Catégories et sous-catégories stockées en base (lisibles par tous, modifiables par un super_admin), à la place de la
--    liste écrite dans le code du site. Renommer une catégorie met aussi à jour les fournisseurs et produits concernés.
--
-- Prérequis : migrations 0001 à 0012, table admins(user_id), fonctions is_admin(), journaliser().
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

-- ---------------------------------------------------------------------------
-- 1) Rôles
-- ---------------------------------------------------------------------------
alter table public.admins add column if not exists role text not null default 'super_admin';
alter table public.admins add column if not exists date_ajout timestamptz not null default now();
alter table public.admins drop constraint if exists admins_role_valide;
alter table public.admins add constraint admins_role_valide check (role in ('super_admin', 'moderateur'));

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'super_admin');
$$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- Les sujets d'argent passent sous le contrôle d'un super_admin
create or replace function public.admin_definir_taux(p_pourcent numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avant numeric;
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if p_pourcent is null or p_pourcent < 0 or p_pourcent > 100 then
    raise exception 'Le taux doit être compris entre 0 et 100.';
  end if;
  avant := public.taux_commission_actuel();
  insert into public.parametre (cle, valeur) values ('taux_commission', jsonb_build_object('pourcent', p_pourcent))
  on conflict (cle) do update set valeur = excluded.valeur, maj = now();
  perform public.journaliser('taux_commission', 'parametre', 'taux_commission', jsonb_build_object('avant', avant, 'apres', p_pourcent));
end;
$$;

create or replace function public.admin_statut_commission(p_affaire_id uuid, p_statut text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  avant text;
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('a_facturer', 'facturee', 'payee', 'annulee') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;
  select statut into avant from public.commission where affaire_id = p_affaire_id;
  if not found then
    raise exception 'Commission introuvable (l''affaire n''est pas confirmée).';
  end if;
  update public.commission
  set statut = p_statut, note = coalesce(nullif(btrim(p_note), ''), note), maj = now()
  where affaire_id = p_affaire_id;
  perform public.journaliser('commission_statut', 'affaire', p_affaire_id::text, jsonb_build_object('avant', avant, 'apres', p_statut));
end;
$$;

-- Arbitrer une affaire contestée touche à la commission : réservé aux super_admin
create or replace function public.admin_trancher_affaire(p_id uuid, p_statut text, p_montant bigint default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  v_taux numeric;
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('confirmee', 'annulee') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;
  select * into a from public.affaire where id = p_id for update;
  if not found then
    raise exception 'Affaire introuvable';
  end if;

  update public.affaire
  set statut = p_statut, montant_fcfa = coalesce(p_montant, montant_fcfa), date_reponse = coalesce(date_reponse, now())
  where id = p_id;

  if p_statut = 'confirmee' then
    v_taux := public.taux_commission_actuel();
    insert into public.commission (affaire_id, taux_pourcent, montant_fcfa)
    values (p_id, v_taux, round(coalesce(p_montant, a.montant_fcfa) * v_taux / 100))
    on conflict (affaire_id) do update
      set montant_fcfa = round(coalesce(p_montant, a.montant_fcfa) * public.commission.taux_pourcent / 100), maj = now();
  else
    update public.commission set statut = 'annulee', maj = now() where affaire_id = p_id;
  end if;

  perform public.journaliser('affaire_statut', 'affaire', p_id::text,
    jsonb_build_object('avant', a.statut, 'apres', p_statut, 'montant', coalesce(p_montant, a.montant_fcfa),
                       'fournisseur', a.grossiste_nom, 'acheteur', a.vendeur_nom));
end;
$$;

-- Équipe d'administration (super_admin seulement)
create or replace function public.admin_liste_admins()
returns table (user_id uuid, email text, role text, date_ajout timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  return query
    select a.user_id, u.email::text, a.role, a.date_ajout
    from public.admins a join auth.users u on u.id = a.user_id
    order by a.date_ajout;
end;
$$;

create or replace function public.admin_ajouter_admin(p_email text, p_role text default 'moderateur')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if p_role not in ('super_admin', 'moderateur') then
    raise exception 'Rôle inconnu : %', p_role;
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'Aucun compte avec cet e-mail : la personne doit d''abord créer un compte sur le site.';
  end if;
  insert into public.admins (user_id, role) values (v_user, p_role)
  on conflict (user_id) do update set role = excluded.role;
  perform public.journaliser('admin_ajout', 'admin', v_user::text, jsonb_build_object('email', p_email, 'role', p_role));
end;
$$;

create or replace function public.admin_changer_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if p_role not in ('super_admin', 'moderateur') then
    raise exception 'Rôle inconnu : %', p_role;
  end if;
  if p_role = 'moderateur'
     and (select role from public.admins where user_id = p_user_id) = 'super_admin'
     and (select count(*) from public.admins where role = 'super_admin') <= 1 then
    raise exception 'Il doit rester au moins un super-administrateur.';
  end if;
  update public.admins set role = p_role where user_id = p_user_id;
  if not found then
    raise exception 'Administrateur introuvable';
  end if;
  perform public.journaliser('admin_role', 'admin', p_user_id::text, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_retirer_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Vous ne pouvez pas retirer votre propre accès.';
  end if;
  if (select role from public.admins where user_id = p_user_id) = 'super_admin'
     and (select count(*) from public.admins where role = 'super_admin') <= 1 then
    raise exception 'Il doit rester au moins un super-administrateur.';
  end if;
  delete from public.admins where user_id = p_user_id;
  if not found then
    raise exception 'Administrateur introuvable';
  end if;
  perform public.journaliser('admin_retrait', 'admin', p_user_id::text, '{}'::jsonb);
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'admin_definir_taux(numeric)', 'admin_statut_commission(uuid, text, text)', 'admin_trancher_affaire(uuid, text, bigint)',
    'admin_liste_admins()', 'admin_ajouter_admin(text, text)', 'admin_changer_role(uuid, text)', 'admin_retirer_admin(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Catégories
-- ---------------------------------------------------------------------------
create table if not exists public.categorie (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  ordre integer not null default 0,
  active boolean not null default true
);
create table if not exists public.sous_categorie (
  id uuid primary key default gen_random_uuid(),
  categorie_id uuid not null references public.categorie(id) on delete cascade,
  nom text not null,
  ordre integer not null default 0,
  active boolean not null default true,
  unique (categorie_id, nom)
);

alter table public.categorie enable row level security;
alter table public.sous_categorie enable row level security;
revoke all on public.categorie, public.sous_categorie from anon, authenticated;
grant select on public.categorie, public.sous_categorie to anon, authenticated;
grant insert, update, delete on public.categorie, public.sous_categorie to authenticated;

-- Règles séparées par rôle : un visiteur anonyme n'évalue jamais is_admin()
drop policy if exists categorie_lecture on public.categorie;
drop policy if exists categorie_lecture_visiteur on public.categorie;
create policy categorie_lecture_visiteur on public.categorie for select to anon using (active);
drop policy if exists categorie_lecture_connecte on public.categorie;
create policy categorie_lecture_connecte on public.categorie for select to authenticated using (active or public.is_admin());
drop policy if exists categorie_ecriture on public.categorie;
create policy categorie_ecriture on public.categorie for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists sous_categorie_lecture on public.sous_categorie;
drop policy if exists sous_categorie_lecture_visiteur on public.sous_categorie;
create policy sous_categorie_lecture_visiteur on public.sous_categorie for select to anon
  using (active and exists (select 1 from public.categorie c where c.id = sous_categorie.categorie_id and c.active));
drop policy if exists sous_categorie_lecture_connecte on public.sous_categorie;
create policy sous_categorie_lecture_connecte on public.sous_categorie for select to authenticated
  using (public.is_admin() or (active and exists (select 1 from public.categorie c where c.id = sous_categorie.categorie_id and c.active)));
drop policy if exists sous_categorie_ecriture on public.sous_categorie;
create policy sous_categorie_ecriture on public.sous_categorie for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Liste de départ : celle déjà utilisée par le site (aucun doublon si relancé)
do $$
declare
  c record;
  v_id uuid;
  v_ordre integer := 0;
  s text;
  v_so integer;
  liste jsonb := $json$[
    ["Textile et pagnes", ["Pagnes wax", "Tissus africains", "Tissus unis", "Dentelle et broderie", "Fils et mercerie"]],
    ["Mode et accessoires", ["Vêtements femme", "Vêtements homme", "Vêtements enfant", "Bijoux", "Sacs et accessoires", "Perruques et extensions"]],
    ["Chaussures et maroquinerie", ["Chaussures femme", "Chaussures homme", "Sandales et claquettes", "Sacs en cuir"]],
    ["Beauté et cosmétiques", ["Soins du visage", "Soins du corps", "Soins des cheveux", "Maquillage", "Parfums", "Savons"]],
    ["Santé et bien-être", ["Tisanes et thés de soin", "Compléments alimentaires", "Hygiène", "Matériel médical"]],
    ["Alimentation et boissons", ["Céréales et farines", "Huiles", "Épices et condiments", "Boissons", "Conserves", "Produits surgelés"]],
    ["Agriculture et agro-transformation", ["Cacao et café", "Fruits et légumes", "Noix et amandes", "Produits transformés"]],
    ["Électroménager", ["Réfrigération", "Cuisson", "Climatisation et ventilation", "Petit électroménager"]],
    ["Électronique et téléphonie", ["Téléphones", "Accessoires téléphone", "Audio", "Télévision", "Énergie solaire"]],
    ["Informatique et bureau", ["Ordinateurs", "Imprimantes", "Accessoires", "Mobilier de bureau"]],
    ["Maison et décoration", ["Cuisine", "Literie", "Décoration", "Rangement", "Éclairage"]],
    ["Quincaillerie et bâtiment", ["Outillage", "Plomberie", "Électricité", "Peinture", "Carrelage"]],
    ["Emballage et papeterie", ["Sachets et sacs", "Cartons", "Étiquettes", "Papeterie"]],
    ["Jouets et enfants", ["Jouets", "Puériculture", "Fournitures scolaires"]],
    ["Auto et moto", ["Pièces détachées", "Pneus", "Accessoires", "Huiles et entretien"]],
    ["Autre", []]
  ]$json$::jsonb;
begin
  for c in select value from jsonb_array_elements(liste) loop
    v_ordre := v_ordre + 1;
    insert into public.categorie (nom, ordre) values (c.value->>0, v_ordre)
    on conflict (nom) do nothing;
    select id into v_id from public.categorie where nom = c.value->>0;
    v_so := 0;
    for s in select jsonb_array_elements_text(c.value->1) loop
      v_so := v_so + 1;
      insert into public.sous_categorie (categorie_id, nom, ordre) values (v_id, s, v_so)
      on conflict (categorie_id, nom) do nothing;
    end loop;
  end loop;
end $$;

-- Renommer une catégorie : met aussi à jour les fournisseurs et les produits qui l'utilisent
create or replace function public.admin_renommer_categorie(p_ancien text, p_nouveau text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if coalesce(btrim(p_nouveau), '') = '' then
    raise exception 'Le nouveau nom est obligatoire.';
  end if;
  if exists (select 1 from public.categorie where nom = btrim(p_nouveau) and nom <> p_ancien) then
    raise exception 'Une catégorie porte déjà ce nom.';
  end if;
  update public.categorie set nom = btrim(p_nouveau) where nom = p_ancien;
  if not found then
    raise exception 'Catégorie introuvable';
  end if;
  update public.grossiste set categorie = btrim(p_nouveau) where categorie = p_ancien;
  update public.produit set categorie = btrim(p_nouveau) where categorie = p_ancien;
  perform public.journaliser('categorie_renommee', 'categorie', p_ancien, jsonb_build_object('avant', p_ancien, 'apres', btrim(p_nouveau)));
end;
$$;

create or replace function public.admin_renommer_sous_categorie(p_categorie text, p_ancien text, p_nouveau text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Réservé à un super-administrateur' using errcode = '42501';
  end if;
  if coalesce(btrim(p_nouveau), '') = '' then
    raise exception 'Le nouveau nom est obligatoire.';
  end if;
  update public.sous_categorie sc set nom = btrim(p_nouveau)
  from public.categorie c
  where sc.categorie_id = c.id and c.nom = p_categorie and sc.nom = p_ancien;
  if not found then
    raise exception 'Sous-catégorie introuvable';
  end if;
  update public.produit set sous_categorie = btrim(p_nouveau) where categorie = p_categorie and sous_categorie = p_ancien;
  perform public.journaliser('categorie_renommee', 'categorie', p_categorie, jsonb_build_object('avant', p_ancien, 'apres', btrim(p_nouveau), 'sous_categorie', true));
end;
$$;

revoke all on function public.admin_renommer_categorie(text, text) from public, anon;
grant execute on function public.admin_renommer_categorie(text, text) to authenticated;
revoke all on function public.admin_renommer_sous_categorie(text, text, text) from public, anon;
grant execute on function public.admin_renommer_sous_categorie(text, text, text) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION :
--   select email, role from public.admins a join auth.users u on u.id = a.user_id;   -> vos admins, tous super_admin
--   select count(*) from public.categorie;                                           -> 16
-- Un visiteur doit pouvoir lire les catégories :  GET /rest/v1/categorie?select=nom (sans connexion).
