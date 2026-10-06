-- 0014 — Correctif : publier ou suspendre un fournisseur échouait (« violates check constraint grossiste_contact_telephone_check »)
--
-- Cause : la décision de l'administrateur essayait d'enregistrer le motif dans la table des contacts en y créant une ligne
-- avec un téléphone vide, ce que la base refuse (un téléphone valide est obligatoire).
--
-- Correction : le motif d'une décision (suspension, mise en attente) a sa propre table privée, indépendante du téléphone.
-- Elle est lisible par le fournisseur concerné et par l'admin, et modifiable seulement par la fonction de décision.
--
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.
-- Prérequis : migrations 0011 à 0013.

create table if not exists public.grossiste_decision (
  grossiste_id uuid primary key,
  motif text,
  maj timestamptz not null default now()
);

-- Reprend les motifs éventuellement déjà enregistrés dans la table des contacts
insert into public.grossiste_decision (grossiste_id, motif)
select grossiste_id, motif_statut from public.grossiste_contact where motif_statut is not null
on conflict (grossiste_id) do nothing;

-- Propriétaire d'un profil fournisseur (fonction sécurisée : ne dépend pas des règles de lecture de la table grossiste)
create or replace function public.est_proprietaire_grossiste(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.grossiste g where g.id = p_id and g.user_id = auth.uid());
$$;
revoke all on function public.est_proprietaire_grossiste(uuid) from public, anon;
grant execute on function public.est_proprietaire_grossiste(uuid) to authenticated;

alter table public.grossiste_decision enable row level security;
revoke all on public.grossiste_decision from anon, authenticated;
grant select on public.grossiste_decision to authenticated;

drop policy if exists grossiste_decision_lecture on public.grossiste_decision;
create policy grossiste_decision_lecture on public.grossiste_decision for select to authenticated
  using (public.is_admin() or public.est_proprietaire_grossiste(grossiste_id));

-- Décision de l'administrateur sur un fournisseur (remplace la version de la migration 0011)
create or replace function public.admin_decider_fournisseur(
  p_id uuid, p_statut text, p_motif text default null, p_badge boolean default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administrateur' using errcode = '42501';
  end if;
  if p_statut not in ('publie', 'en_attente', 'suspendu') then
    raise exception 'Statut inconnu : %', p_statut;
  end if;
  if p_statut = 'suspendu' and coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un motif est obligatoire pour suspendre un fournisseur.';
  end if;

  update public.grossiste
  set statut = p_statut,
      badge_verifie = coalesce(p_badge, badge_verifie)
  where id = p_id;
  if not found then
    raise exception 'Fournisseur introuvable';
  end if;

  -- Motif : effacé quand le fournisseur est publié, enregistré sinon (le dernier motif remplace le précédent)
  if p_statut = 'publie' then
    delete from public.grossiste_decision where grossiste_id = p_id;
  elsif nullif(btrim(p_motif), '') is not null then
    insert into public.grossiste_decision (grossiste_id, motif) values (p_id, btrim(p_motif))
    on conflict (grossiste_id) do update set motif = excluded.motif, maj = now();
  end if;
end;
$$;
revoke all on function public.admin_decider_fournisseur(uuid, text, text, boolean) from public, anon;
grant execute on function public.admin_decider_fournisseur(uuid, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION : dans l'administration, ouvrir la fiche d'un fournisseur et cliquer sur « Publier ce fournisseur » :
-- plus d'erreur rouge, le statut passe à « Publié ». Suspendre avec un motif : le fournisseur le voit sur son tableau de bord.
