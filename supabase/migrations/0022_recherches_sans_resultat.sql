-- 0022 — Recherches sans résultat : le signal de la demande non couverte
--
-- Chaque recherche qui ne trouve aucun produit est notée (terme, catégorie, ville, date) : c'est la façon la plus directe de savoir
-- quelle catégorie ou quelle ville manque de fournisseurs, donc où recruter. Rien de personnel n'est enregistré
-- (ni compte, ni adresse IP). L'écran d'administration lit la synthèse avec admin_recherches_vides().
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

create table if not exists public.recherche_sans_resultat (
  id bigint generated always as identity primary key,
  terme text,
  categorie text,
  ville text,
  date_recherche timestamptz not null default now()
);
create index if not exists recherche_vide_date_idx on public.recherche_sans_resultat (date_recherche desc);

alter table public.recherche_sans_resultat enable row level security;
revoke all on public.recherche_sans_resultat from anon, authenticated;

-- Enregistre une recherche vide (appelée par le site). Tout est nettoyé et borné : pas de texte long, pas d'enregistrement vide.
create or replace function public.signaler_recherche_vide(p_terme text default null, p_categorie text default null, p_ville text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text := left(lower(btrim(coalesce(p_terme, ''))), 80);
  c text := left(btrim(coalesce(p_categorie, '')), 60);
  v text := left(btrim(coalesce(p_ville, '')), 60);
begin
  if t = '' and c = '' and v = '' then
    return;
  end if;
  insert into public.recherche_sans_resultat (terme, categorie, ville)
  values (nullif(t, ''), nullif(c, ''), nullif(v, ''));
end;
$$;
revoke all on function public.signaler_recherche_vide(text, text, text) from public;
grant execute on function public.signaler_recherche_vide(text, text, text) to anon, authenticated;

-- Synthèse pour l'administration : les demandes non couvertes les plus fréquentes sur les N derniers jours
create or replace function public.admin_recherches_vides(p_jours integer default 30)
returns table (terme text, categorie text, ville text, nombre integer, derniere timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  return query
    select r.terme, r.categorie, r.ville, count(*)::int, max(r.date_recherche)
    from public.recherche_sans_resultat r
    where r.date_recherche >= now() - make_interval(days => greatest(coalesce(p_jours, 30), 1))
    group by r.terme, r.categorie, r.ville
    order by count(*) desc, max(r.date_recherche) desc
    limit 100;
end;
$$;
revoke all on function public.admin_recherches_vides(integer) from public, anon;
grant execute on function public.admin_recherches_vides(integer) to authenticated;
