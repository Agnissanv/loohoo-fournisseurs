-- 0017 — Prix de gros par paliers de quantité
--
-- Exemple : prix de base 5 000 F à partir de 10 pièces (MOQ), puis 4 500 F dès 50, puis 4 000 F dès 200.
-- Le prix de base (prix_gros_fcfa) reste celui du MOQ. Les paliers sont stockés dans produit.paliers :
--   [{"min": 50, "prix": 4500}, {"min": 200, "prix": 4000}]
-- La base refuse les paliers incohérents : au plus 4 paliers, quantités strictement croissantes et supérieures au MOQ,
-- prix strictement décroissants et inférieurs au prix de base.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

alter table public.produit add column if not exists paliers jsonb not null default '[]'::jsonb;

create or replace function public.produit_verifier_paliers()
returns trigger
language plpgsql
as $$
declare
  p jsonb;
  qte_prec bigint := coalesce(new.moq, 1);
  prix_prec numeric := new.prix_gros_fcfa;
begin
  if new.paliers is null then
    new.paliers := '[]'::jsonb;
  end if;
  if jsonb_typeof(new.paliers) <> 'array' then
    raise exception 'Les paliers de prix doivent former une liste.';
  end if;
  if jsonb_array_length(new.paliers) > 4 then
    raise exception 'Quatre paliers de prix au maximum.';
  end if;
  for p in select * from jsonb_array_elements(new.paliers) loop
    if jsonb_typeof(p -> 'min') <> 'number' or jsonb_typeof(p -> 'prix') <> 'number' then
      raise exception 'Chaque palier doit avoir une quantité et un prix.';
    end if;
    if (p ->> 'min')::numeric <> trunc((p ->> 'min')::numeric) or (p ->> 'prix')::numeric <> trunc((p ->> 'prix')::numeric) then
      raise exception 'Quantités et prix des paliers : nombres entiers uniquement.';
    end if;
    if (p ->> 'min')::bigint <= qte_prec then
      raise exception 'Chaque palier doit commencer à une quantité supérieure au précédent (et au minimum de commande).';
    end if;
    if (p ->> 'prix')::numeric >= prix_prec or (p ->> 'prix')::numeric < 0 then
      raise exception 'Le prix d''un palier doit être inférieur au prix du palier précédent.';
    end if;
    qte_prec := (p ->> 'min')::bigint;
    prix_prec := (p ->> 'prix')::numeric;
  end loop;
  return new;
end;
$$;

drop trigger if exists produit_verifier_paliers on public.produit;
create trigger produit_verifier_paliers
  before insert or update on public.produit
  for each row execute function public.produit_verifier_paliers();

-- Si les droits de la table sont donnés colonne par colonne, ceux-ci ouvrent la nouvelle colonne (sans effet sinon)
grant select (paliers) on public.produit to anon, authenticated;
grant insert (paliers), update (paliers) on public.produit to authenticated;
