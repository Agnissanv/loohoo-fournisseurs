# Mettre LOOHOO en ligne sur Cloudflare Pages (gratuit)

Les trois sites (plateforme fournisseurs, site officiel, administration) sont des sites React/Vite : Cloudflare Pages les
construit et les publie directement depuis GitHub, comme Vercel. Rien à changer dans le code des pages.

Offre gratuite de Cloudflare Pages : usage commercial autorisé, 500 publications par mois, 100 projets, pages servies
sans limite de bande passante. Les fonctions serveur (aperçus WhatsApp, plan du site, vidéos YouTube) sont dans le dossier
`functions/` et comptent dans le quota gratuit de Cloudflare Workers (100 000 requêtes par jour).

## 1. Créer le compte (une seule fois)
Sur https://dash.cloudflare.com/sign-up, avec l'adresse de l'agence (ou celle de LOOHOO si le client veut en être propriétaire).

## 2. Créer un projet par site
Workers & Pages > Create > Pages > Connect to Git > autoriser GitHub > choisir le dépôt, puis :

| Réglage | Valeur |
|---|---|
| Framework preset | Vite (ou « None ») |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

Variables d'environnement (Settings > Variables and Secrets, pour « Production » et « Preview ») :

| Projet | Variable | Valeur |
|---|---|---|
| tous | `VITE_SUPABASE_URL` | la même que dans `.env.local` |
| tous | `VITE_SUPABASE_PUBLISHABLE_KEY` | la même que dans `.env.local` |
| tous | `NODE_VERSION` | `20` |
| loohoo (site officiel) | `VITE_URL_FOURNISSEURS` | l'adresse du projet fournisseurs, par ex. `https://loohoo-fournisseurs.pages.dev` |

Puis « Save and Deploy ». L'adresse obtenue ressemble à `https://loohoo-fournisseurs.pages.dev`.

Nom des projets conseillé : `loohoo` (site officiel), `loohoo-fournisseurs`, `loohoo-admin`.

## 3. Autoriser les nouvelles adresses dans Supabase (indispensable)
Supabase > Authentication > URL Configuration :
- **Site URL** : `https://loohoo-fournisseurs.pages.dev`
- **Redirect URLs** : ajouter `https://loohoo-fournisseurs.pages.dev/**` et `https://loohoo-admin.pages.dev/**`

Sans cela, les liens de confirmation d'e-mail et de mot de passe oublié renverraient vers l'ancienne adresse Vercel.

## 4. Vérifier
- La page d'accueil, une fiche produit, une page fournisseur, la connexion.
- Aperçu WhatsApp : envoyer le lien d'un produit dans une discussion ; la photo et le prix doivent s'afficher.
- `https://loohoo-fournisseurs.pages.dev/sitemap.xml` doit lister les fournisseurs et les produits.

## Ce qui ne suit pas (pour l'instant)
- La tâche quotidienne `api/nettoyer-conversations` (suppression des conversations de plus de 90 jours) était un « cron » Vercel.
  Rien d'urgent : à refaire plus tard dans Supabase (pg_cron) ou avec un Worker Cloudflare.
- Administration : la fonction `api/boutiques-stats.js` (statistiques des boutiques) est propre à Vercel ; le reste de
  l'administration fonctionne.

## Retour éventuel sur Vercel
Les fichiers Vercel (`api/`, `vercel.json`) restent dans le dépôt : chaque hébergeur ignore les fichiers de l'autre.
Rappel : l'offre gratuite de Vercel (Hobby) est réservée aux projets personnels, non commerciaux.
