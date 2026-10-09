-- 0021 — Lien de profil partageable : looh-oo.com/f/kone-textiles
--
-- Chaque fournisseur reçoit une adresse courte et lisible, générée à partir de son nom (accents retirés, tirets, suffixe -2, -3…
-- en cas de nom identique). Il la partage sur WhatsApp, Facebook, etc. L'adresse ne change plus ensuite, même si le nom change :
-- un lien déjà partagé continue de marcher. Seule l'équipe peut la modifier.
--   slug_fournisseur(texte)        : fabrique l'adresse à partir d'un nom
--   grossiste_id_par_slug(slug)    : retrouve un fournisseur PUBLIÉ à partir de son adresse (lecture publique)
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

create or replace function public.slug_fournisseur(p_nom text)
returns text
language sql
immutable
as $$
  select coalesce(nullif(
    regexp_replace(
      regexp_replace(
        lower(translate(coalesce(p_nom, ''),
          'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖòóôõöÙÚÛÜùúûüÝŸýÿŒœÆæ',
          'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOoooooUUUUuuuuYYyyOoAa')),
        '[^a-z0-9]+', '-', 'g'),
      '^-+|-+$', '', 'g'),
    ''), 'fournisseur');
$$;

alter table public.grossiste add column if not exists slug text;

-- Remplissage des fournisseurs existants : le plus ancien garde l'adresse simple, les suivants reçoivent -2, -3…
with numerotes as (
  select id, public.slug_fournisseur(nom) as base,
         row_number() over (partition by public.slug_fournisseur(nom) order by date_ajout nulls last, id) as rang
  from public.grossiste
  where slug is null
)
update public.grossiste g
set slug = case when n.rang = 1 then n.base else n.base || '-' || n.rang end
from numerotes n
where g.id = n.id
  and not exists (select 1 from public.grossiste x where x.slug = case when n.rang = 1 then n.base else n.base || '-' || n.rang end);

create unique index if not exists grossiste_slug_idx on public.grossiste (slug);

create or replace function public.grossiste_attribuer_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidat text;
  n integer := 1;
begin
  if tg_op = 'UPDATE' then
    -- L'adresse ne bouge pas : seuls l'équipe et l'éditeur SQL peuvent la changer
    if current_user in ('anon', 'authenticated') and not public.is_admin() then
      new.slug := old.slug;
    end if;
    if new.slug is not null then
      return new;
    end if;
  end if;
  if new.slug is null or btrim(new.slug) = '' then
    base := public.slug_fournisseur(new.nom);
    candidat := base;
    while exists (select 1 from public.grossiste where slug = candidat and id is distinct from new.id) loop
      n := n + 1;
      candidat := base || '-' || n;
    end loop;
    new.slug := candidat;
  end if;
  return new;
end;
$$;

drop trigger if exists grossiste_attribuer_slug on public.grossiste;
create trigger grossiste_attribuer_slug
  before insert or update on public.grossiste
  for each row execute function public.grossiste_attribuer_slug();

create or replace function public.grossiste_id_par_slug(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.grossiste where slug = lower(btrim(p_slug)) and statut = 'publie';
$$;
revoke all on function public.grossiste_id_par_slug(text) from public;
grant execute on function public.grossiste_id_par_slug(text) to anon, authenticated;

-- Si les droits de la table sont donnés colonne par colonne : lecture publique de l'adresse (sans effet sinon)
grant select (slug) on public.grossiste to anon, authenticated;
