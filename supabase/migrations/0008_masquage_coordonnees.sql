-- 0008 — Masquage des coordonnées dans les messages et contrôle des contenus publics
--
-- Objectif : personne ne doit pouvoir joindre un fournisseur ou un acheteur en dehors de LOOHOO.
--
-- 1) Dans les messages : numéros de téléphone, e-mails, liens, pseudos et numéros écrits en toutes lettres sont remplacés
--    par « [coordonnées masquées] » AVANT d'être enregistrés. Le message est marqué « signalé ». Le texte d'origine est gardé
--    dans une table lisible uniquement par l'admin (supervision).
--    Les simples mentions « WhatsApp », « Telegram »... ne modifient pas le message : il est seulement signalé.
-- 2) Dans les contenus publics (nom, description, mots-clés des produits; nom et présentation des fournisseurs) : si une
--    coordonnée est détectée, l'élément est marqué (drapeau_coordonnees) et repasse en vérification pour l'admin.
--
-- Limite à connaître : on ne peut pas tout détecter (un numéro écrit avec des mots détournés passe). Le masquage réduit le
-- contournement, la supervision admin et les conditions d'utilisation font le reste.
--
-- Hypothèses : table message(id, conversation_id, expediteur, contenu, ...), fonction is_admin(), tables produit et grossiste.
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run. Sans danger si relancé.

-- ---------------------------------------------------------------------------
-- A. Détection et masquage
-- ---------------------------------------------------------------------------
create or replace function public.masquer_coordonnees(p_texte text, out texte_masque text, out motifs text[])
language plpgsql
immutable
as $$
declare
  v text := coalesce(p_texte, '');
  m text;
  masque constant text := '[coordonnées masquées]';
  trouves text[] := '{}';
begin
  -- e-mails (y compris « nom (at) domaine.com », « nom arobase domaine.com »)
  if v ~* '[a-z0-9._%+\-]+\s*(@|\(at\)|\[at\]|\sarobase\s)\s*[a-z0-9.\-]+\.[a-z]{2,}' then
    v := regexp_replace(v, '[a-z0-9._%+\-]+\s*(@|\(at\)|\[at\]|\sarobase\s)\s*[a-z0-9.\-]+\.[a-z]{2,}', masque, 'gi');
    trouves := array_append(trouves, 'email');
  end if;

  -- liens et noms de domaine
  if v ~* '(https?://|www\.)[^\s]+|\m(wa\.me|t\.me|bit\.ly|linktr\.ee)/[^\s]*|\m[a-z0-9\-]{2,}\.(com|net|org|ci|fr|io|me|shop|store|app)\M(/[^\s]*)?' then
    v := regexp_replace(v, '(https?://|www\.)[^\s]+|\m(wa\.me|t\.me|bit\.ly|linktr\.ee)/[^\s]*|\m[a-z0-9\-]{2,}\.(com|net|org|ci|fr|io|me|shop|store|app)\M(/[^\s]*)?', masque, 'gi');
    trouves := array_append(trouves, 'lien');
  end if;

  -- pseudos de réseaux sociaux (@nom)
  if v ~* '(^|\s)@[a-z0-9._]{3,}' then
    v := regexp_replace(v, '(^|\s)@[a-z0-9._]{3,}', '\1' || masque, 'gi');
    trouves := array_append(trouves, 'pseudo');
  end if;

  -- numéros écrits en chiffres : au moins 8 chiffres, séparateurs courants autorisés.
  -- Les montants (« 25 000 000 ») et les dates (« 12-10-2026 ») ne sont pas considérés comme des numéros.
  for m in select (regexp_matches(v, '(\+?\d[\d ().\-]{6,}\d)', 'g'))[1] loop
    if length(regexp_replace(m, '\D', '', 'g')) >= 8
       and m !~ '^\d{1,3}([ .]\d{3})+$'
       and m !~ '^\d{1,2}[-. ]\d{1,2}[-. ]\d{2,4}$' then
      v := replace(v, m, masque);
      trouves := array_append(trouves, 'telephone');
    end if;
  end loop;

  -- numéros écrits en toutes lettres (six chiffres ou plus à la suite)
  if v ~* '\m(z[eé]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)([\s,.\-]+(z[eé]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)){5,}\M' then
    v := regexp_replace(v, '\m(z[eé]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)([\s,.\-]+(z[eé]ro|un|deux|trois|quatre|cinq|six|sept|huit|neuf)){5,}\M', masque, 'gi');
    trouves := array_append(trouves, 'telephone_en_lettres');
  end if;

  -- mentions qui annoncent un échange hors plateforme : signalées sans modifier le texte
  if v ~* '(whats?app|telegram|signal|snapchat|instagram|facebook|messenger|appelle[\s-]?moi|mon (num[eé]ro|t[eé]l[eé]phone|t[eé]l|mail|e-?mail)|contactez[\s-]moi (au|sur))' then
    trouves := array_append(trouves, 'mention');
  end if;

  texte_masque := v;
  motifs := (select coalesce(array_agg(distinct x), '{}') from unnest(trouves) as x);
end;
$$;

-- Vrai si le texte contient une coordonnée (les simples mentions ne comptent pas)
create or replace function public.contient_coordonnees(p_texte text)
returns boolean
language sql
immutable
as $$
  select (select texte_masque from public.masquer_coordonnees(p_texte)) is distinct from coalesce(p_texte, '');
$$;

-- ---------------------------------------------------------------------------
-- B. Messages
-- ---------------------------------------------------------------------------
alter table public.message add column if not exists signale boolean not null default false;

-- Texte d'origine des messages masqués : lisible uniquement par l'admin
create table if not exists public.message_masque (
  id bigint generated always as identity primary key,
  message_id text not null,
  contenu_original text not null,
  motifs text[] not null default '{}',
  date_masquage timestamptz not null default now()
);
create index if not exists message_masque_message_idx on public.message_masque (message_id);

alter table public.message_masque enable row level security;
revoke all on public.message_masque from anon, authenticated;
grant select on public.message_masque to authenticated;

drop policy if exists message_masque_admin_lecture on public.message_masque;
create policy message_masque_admin_lecture on public.message_masque
  for select to authenticated
  using (public.is_admin());

create or replace function public.message_masquer_coordonnees()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select * into r from public.masquer_coordonnees(new.contenu);
  if cardinality(r.motifs) > 0 then
    new.signale := true;
    if r.texte_masque is distinct from new.contenu then
      insert into public.message_masque (message_id, contenu_original, motifs)
      values (new.id::text, new.contenu, r.motifs);
      new.contenu := r.texte_masque;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists message_masquer_coordonnees on public.message;
create trigger message_masquer_coordonnees
  before insert on public.message
  for each row execute function public.message_masquer_coordonnees();

-- ---------------------------------------------------------------------------
-- C. Contenus publics : drapeau et retour en vérification
-- ---------------------------------------------------------------------------
alter table public.produit add column if not exists drapeau_coordonnees boolean not null default false;
alter table public.grossiste add column if not exists drapeau_coordonnees boolean not null default false;

create or replace function public.produit_controle_contenu()
returns trigger
language plpgsql
as $$
begin
  new.drapeau_coordonnees := public.contient_coordonnees(
    coalesce(new.nom, '') || ' ' || coalesce(new.description, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '') || ' ' || coalesce(new.sku, '')
  );
  if new.drapeau_coordonnees and new.statut = 'publie' and current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.statut := 'en_attente';
  end if;
  return new;
end;
$$;

drop trigger if exists produit_controle_contenu on public.produit;
create trigger produit_controle_contenu
  before insert or update on public.produit
  for each row execute function public.produit_controle_contenu();

create or replace function public.grossiste_controle_contenu()
returns trigger
language plpgsql
as $$
begin
  new.drapeau_coordonnees := public.contient_coordonnees(coalesce(new.nom, '') || ' ' || coalesce(new.description, ''));
  if new.drapeau_coordonnees and new.statut = 'publie' and current_user in ('anon', 'authenticated') and not public.is_admin() then
    new.statut := 'en_attente';
  end if;
  return new;
end;
$$;

drop trigger if exists grossiste_controle_contenu on public.grossiste;
create trigger grossiste_controle_contenu
  before insert or update on public.grossiste
  for each row execute function public.grossiste_controle_contenu();

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- VÉRIFICATION (à lancer après, dans le SQL Editor) :
--
-- 1) Le masquage :
--    select * from public.masquer_coordonnees('Appelez-moi au 07 08 09 10 11 ou écrivez à jean@mail.com, merci');
--    -> texte_masque : « Appelez-moi au [coordonnées masquées] ou écrivez à [coordonnées masquées], merci »
--
-- 2) Les montants et dates ne sont pas touchés :
--    select * from public.masquer_coordonnees('Prix 25 000 000 F CFA, livraison le 12-10-2026, 500 pièces');
--    -> texte_masque identique, motifs vide.
--
-- 3) Test dans l'application : envoyer « mon numéro est 0708091011 » dans une conversation : le message s'affiche
--    avec « [coordonnées masquées] ».
