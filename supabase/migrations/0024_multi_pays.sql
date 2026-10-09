-- 0024 — Multi-pays : la liste des pays LOOHOO et le pays de chaque fournisseur et acheteur
--
-- pays_loohoo : pays gérés (code ISO, nom, « en Côte d'Ivoire / au Mali », indicatif, devise, ouvert ou non).
--   La Côte d'Ivoire est ouverte ; les autres pays de la zone franc CFA (UEMOA) sont prêts et s'ouvrent d'un clic :
--     select public.admin_ouvrir_pays('ML', true);
--   Tant qu'un pays n'est pas ouvert, on ne peut pas s'y inscrire comme fournisseur ; le site l'affiche « bientôt ».
-- grossiste.pays_code : pays du fournisseur. Choisi à l'inscription ; modifiable par le fournisseur tant que son profil est
--   en attente de vérification, puis verrouillé (seule l'équipe peut le changer, après preuve de localisation).
--   La colonne texte « pays » reste remplie automatiquement avec le nom du pays.
-- vendeur.pays_code : pays de l'acheteur (sert à l'affichage et, plus tard, aux alertes par zone).
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

create table if not exists public.pays_loohoo (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  nom text not null,
  dans text not null,
  indicatif text not null,
  devise text not null default 'XOF',
  actif boolean not null default false,
  ordre integer not null default 100
);

insert into public.pays_loohoo (code, nom, dans, indicatif, devise, actif, ordre) values
  ('CI', 'Côte d''Ivoire', 'en Côte d''Ivoire', '225', 'XOF', true, 1),
  ('ML', 'Mali', 'au Mali', '223', 'XOF', false, 2),
  ('SN', 'Sénégal', 'au Sénégal', '221', 'XOF', false, 3),
  ('BF', 'Burkina Faso', 'au Burkina Faso', '226', 'XOF', false, 4),
  ('BJ', 'Bénin', 'au Bénin', '229', 'XOF', false, 5),
  ('TG', 'Togo', 'au Togo', '228', 'XOF', false, 6),
  ('NE', 'Niger', 'au Niger', '227', 'XOF', false, 7)
on conflict (code) do nothing;

alter table public.pays_loohoo enable row level security;
revoke all on public.pays_loohoo from anon, authenticated;
grant select on public.pays_loohoo to anon, authenticated;
drop policy if exists pays_loohoo_lecture on public.pays_loohoo;
create policy pays_loohoo_lecture on public.pays_loohoo for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Pays du fournisseur
-- ---------------------------------------------------------------------------
alter table public.grossiste add column if not exists pays_code text references public.pays_loohoo (code);

-- Fournisseurs existants : on retrouve le code à partir du nom déjà enregistré (Côte d'Ivoire par défaut)
update public.grossiste g
set pays_code = coalesce(
  (select p.code from public.pays_loohoo p where upper(btrim(g.pays)) = p.code or lower(btrim(g.pays)) = lower(p.nom)),
  case when g.pays is null or g.pays ilike '%ivoire%' then 'CI' end,
  'CI')
where g.pays_code is null;

alter table public.grossiste alter column pays_code set default 'CI';

create or replace function public.grossiste_pays()
returns trigger
language plpgsql
as $$
declare
  equipe boolean := current_user not in ('anon', 'authenticated') or public.is_admin();
begin
  if new.pays_code is null then
    new.pays_code := case when tg_op = 'UPDATE' then coalesce(old.pays_code, 'CI') else 'CI' end;
  end if;
  new.pays_code := upper(new.pays_code);

  if not equipe then
    if tg_op = 'UPDATE' and new.pays_code is distinct from old.pays_code and old.statut is distinct from 'en_attente' then
      -- Profil déjà vérifié : le pays est verrouillé
      new.pays_code := old.pays_code;
    elsif (tg_op = 'INSERT' or new.pays_code is distinct from old.pays_code)
      and not exists (select 1 from public.pays_loohoo where code = new.pays_code and actif) then
      raise exception 'LOOHOO n''est pas encore ouvert dans ce pays.' using errcode = '22023';
    end if;
  end if;

  new.pays := (select nom from public.pays_loohoo where code = new.pays_code);
  return new;
end;
$$;

drop trigger if exists grossiste_pays on public.grossiste;
create trigger grossiste_pays
  before insert or update on public.grossiste
  for each row execute function public.grossiste_pays();

grant select (pays_code) on public.grossiste to anon, authenticated;
grant insert (pays_code), update (pays_code) on public.grossiste to authenticated;

-- ---------------------------------------------------------------------------
-- Pays de l'acheteur
-- ---------------------------------------------------------------------------
alter table public.vendeur add column if not exists pays_code text references public.pays_loohoo (code) default 'CI';
update public.vendeur set pays_code = 'CI' where pays_code is null;
grant select (pays_code) on public.vendeur to authenticated;

create or replace function public.definir_mon_pays_acheteur(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.pays_loohoo where code = upper(p_code)) then
    raise exception 'Pays inconnu.' using errcode = '22023';
  end if;
  update public.vendeur set pays_code = upper(p_code) where user_id = auth.uid();
end;
$$;
revoke all on function public.definir_mon_pays_acheteur(text) from public, anon;
grant execute on function public.definir_mon_pays_acheteur(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Ouvrir ou fermer un pays (équipe LOOHOO)
-- ---------------------------------------------------------------------------
create or replace function public.admin_ouvrir_pays(p_code text, p_ouvert boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Depuis le site : administrateur uniquement. Depuis l'éditeur SQL de Supabase (aucun compte connecté) : autorisé.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  update public.pays_loohoo set actif = p_ouvert where code = upper(p_code);
  if not found then
    raise exception 'Pays inconnu.';
  end if;
  if auth.uid() is not null then
    perform public.journaliser(case when p_ouvert then 'pays_ouvert' else 'pays_ferme' end, 'pays', upper(p_code), '{}'::jsonb);
  end if;
end;
$$;
revoke all on function public.admin_ouvrir_pays(text, boolean) from public, anon;
grant execute on function public.admin_ouvrir_pays(text, boolean) to authenticated;
