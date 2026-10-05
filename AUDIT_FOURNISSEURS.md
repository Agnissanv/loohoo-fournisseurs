# LOOHOO Fournisseurs — Audit métier et parcours (2026-10-05)

Sources : fiche technique client (PDF, 13 p.), briefing de passation, lecture du code de `loohoo-fournisseurs`.
Tout ce qui est écrit ici a été vérifié dans le code, sauf mention « à vérifier côté Supabase ».

## 1. Le constat en une phrase

La **technique** est solide (recherche, chat, vérification par produit, médiathèque, stats).
Ce qui manque, c'est la **boucle métier** : le produit est une suite de pages fonctionnelles, pas un parcours qui amène un fournisseur à s'inscrire, à être publié, à recevoir des demandes et à répondre. Et pas un parcours qui amène un vendeur à trouver, à faire confiance, à contacter et à revenir.

Le risque numéro 1 n'est pas visuel : **un vendeur écrit à un fournisseur, et le fournisseur n'est jamais prévenu.** Sans notification, la plateforme perd ses premières demandes, et le client conclut que « ça ne marche pas ».

## 2. Ce que le PDF demandait vs. l'état réel

| Exigence du PDF | État |
|---|---|
| Téléphone jamais public | OK (table `grossiste_contact` séparée) |
| Recherche sur nom produit, tags, description (jamais le nom du fournisseur) | OK côté RPC `rechercher_produits` (à re-tester avec des données) |
| Cartes avec nom, catégorie, ville, badge, nb de produits | Remplacé par la vue produit (décision client). Plus de liste de fournisseurs |
| Profil fournisseur = catalogue complet | OK |
| Bouton « Contacter » sur le profil fournisseur | **ABSENT** : seule la fiche produit a le bouton |
| Stock confirmé demandé à l'inscription | **ABSENT** du formulaire (case à cocher plus tard dans le tableau de bord) |
| `origine` (local / étranger installé en CI) | **Jamais demandée** à l'inscription |
| 1 à 3 photos réelles minimum | Facultatives, non bloquantes côté interface |
| Capture e-mail à l'intention de sortie | OK, mais seulement sur l'accueil et le profil fournisseur |
| Journal des mises en relation | OK (`mise_en_relation`) |
| Indicateurs §6 (recherches par catégorie/ville, taux de retour) | **Rien n'est mesuré** : aucune trace des recherches, aucun outil d'analyse |
| Consentement e-mail à la collecte | Mention en bas des formulaires, **sans case à cocher** |
| Admin : vérifier, badge, stats | Fait (hors périmètre, autre développeur) |
| « Frais fixe de mise en avant/vérification payé par le grossiste » | Pas décidé, rien de codé |

## 3. Parcours FOURNISSEUR — ce qui casse

### 3.1 Découverte et acquisition (quasi inexistant)
- Il n'existe **aucune page « Devenir fournisseur »** : pas de promesse, pas d'avantages, pas d'explication de la vérification, pas de tarif, pas de FAQ.
- Le seul accès public est un `mailto:` dans le pied de page (« Vous êtes fournisseur ? »). La page `/inscription` n'est atteignable que depuis la page Connexion.
- Le PDF veut une acquisition discrète (qualité avant volume). Mais discret ne veut pas dire invisible : il faut une page dédiée, par exemple `/devenir-fournisseur`, liée depuis le pied de page, et utilisable dans une démarche commerciale directe auprès des grossistes.

### 3.2 Inscription
- Catégorie et ville sont en **texte libre** : « Textile », « textile », « Textiles » créent trois filtres différents. La recherche et les statistiques deviennent incohérentes.
- Pas de `origine`, pas de case stock confirmé, pas d'acceptation explicite des conditions.
- Téléphone libre, sans validation de format (le placeholder demande `2250700000000`).
- Si la confirmation d'e-mail est active dans Supabase, `signUp` ne crée pas de session, puis l'appel `creer_profil_fournisseur` échoue : **compte créé, profil absent**. À vérifier côté Supabase.
- Après l'inscription : redirection directe vers le tableau de bord, sans message d'accueil ni « et maintenant ? ».
- Pas de « mot de passe oublié » **nulle part** (ni fournisseur, ni vendeur). Le premier oubli sera un appel au support.

### 3.3 Onboarding et publication
- Le tableau de bord affiche un texte (« dès qu'une photo et un contact sont renseignés… ») mais **aucune checklist**, aucune barre de progression, aucun bouton « Soumettre pour vérification ».
- Le fournisseur ne sait pas : ce qui bloque, combien de temps ça prend, comment obtenir le badge « Vérifié », ni ce que la vérification change pour lui.
- Statut « Suspendu » sans motif. Statut produit « Rejeté » avec motif (bien), mais pas de moyen de corriger puis de resoumettre sans tout recréer.

### 3.4 Gestion du catalogue
- **Pas d'édition de produit** (déjà identifié). Corriger un prix = supprimer et recréer, donc perdre photos, stats et ancienneté.
- Suppression **sans confirmation**.
- Le champ « actif » ne se change plus après création.
- Le formulaire d'ajout est collé sous la liste, long, sans enregistrement d'un brouillon.
- Pas de duplication, pas de recherche dans son catalogue, pas de changement de prix groupé. Un grossiste avec 80 références ne tiendra pas.
- Catégories libres (même problème que l'inscription).
- Aucun feedback sur la qualité de la fiche : pas d'avertissement « photo manquante », « description trop courte ».

### 3.5 Messagerie (le point critique)
- **Aucune notification** (ni e-mail, ni WhatsApp, ni SMS) quand un vendeur écrit. Le fournisseur doit se connecter pour découvrir sa demande. Le briefing le signale comme « amélioration possible » : c'est en réalité **bloquant pour le lancement**.
- L'en-tête d'une conversation dit seulement « Conversation » : pas le nom de l'interlocuteur, pas le produit concerné, pas la date des messages, pas l'activité du vendeur.
- Pas de réponse rapide, pas de modèles de réponse, pas de statut (nouveau / répondu / conclu), pas d'archivage.
- Un message envoyé n'apparaît que via Realtime. Si Realtime n'est pas activé sur la table `message`, l'expéditeur ne voit pas son propre message avant de recharger. À vérifier côté Supabase.
- Aucun délai de réponse mesuré. C'est pourtant le principal signal de confiance côté vendeur (« répond en moins de 2 h »).

### 3.6 Statistiques
- Honnêtes (pas de chiffre d'affaires inventé), mais sans lecture : aucune explication, aucun conseil.
- Vues du profil seulement. Pas de vues par produit, donc impossible d'établir un entonnoir **vues, puis demandes, puis réponses**.
- Pas de comparaison avec la période précédente.

### 3.7 Profil
- Les horaires sont saisis mais **jamais affichés** publiquement (le briefing disait « publics »).
- Pas de champ « À propos / présentation de l'entreprise », pas d'année de création, pas de spécialités. C'est ce qui rassure un acheteur.
- Les documents de vérification sont facultatifs et sans lien visible avec l'obtention du badge.

### 3.8 Argent et commission
Le briefing pose la règle « LOOHOO doit rester le seul chemin vers le fournisseur ». Aujourd'hui rien n'empêche un vendeur ou un fournisseur d'écrire un numéro de téléphone dans le chat. Il faut en être conscient : la protection est **commerciale** (le service rendu justifie de rester), pas technique. Deux pistes : détecter et masquer les numéros dans les messages avant la monétisation, ou, mieux, rendre le chat plus utile qu'un WhatsApp (devis, commandes, suivi).

## 4. Parcours VENDEUR / VISITEUR — ce qui casse

### 4.1 Accueil
- La page est un titre, une recherche, des filtres, puis une grille. Il manque tout ce qui crée la confiance : explication en 3 étapes, ce que « vérifié » signifie, chiffres (« X fournisseurs vérifiés, Y produits »), catégories à explorer, fournisseurs à la une.
- **Rien à parcourir sans savoir quoi chercher** : pas de grille de catégories, pas de tri (prix, récent, pertinence), pas de pagination (tous les résultats sont chargés d'un coup).
- Résultats vides : un simple texte. C'est l'occasion de capter une **demande de sourcing** (« dites-nous ce que vous cherchez, on vous prévient »). Aujourd'hui la demande est perdue.
- Aucun moyen de **parcourir les fournisseurs** : il n'existe plus de liste de fournisseurs.

### 4.2 Fiche produit
- N'affiche toujours pas : tags, sous-catégorie, stock, dimensions, prix unitaire de référence, poids (le poids est chargé mais non affiché).
- Pas de fil d'Ariane, pas de « autres produits de ce fournisseur », pas de « produits similaires ».
- Pas de partage (WhatsApp, lien), pas de favoris.

### 4.3 Page fournisseur
- **Aucun bouton « Contacter »**. L'acheteur doit retourner sur une fiche produit.
- Pas de présentation, pas d'horaires, pas d'ancienneté, pas de délai de réponse, pas de nombre de demandes traitées.
- Le catalogue n'a ni recherche ni filtre.

### 4.4 Contact
- Pour écrire, un visiteur doit renseigner : nom, téléphone, activité, e-mail, **mot de passe**, message. C'est 6 champs avant d'envoyer, un mur pour un premier contact. Le faire en deux temps (message d'abord, compte créé ensuite via lien magique par e-mail) convertirait mieux.
- Un message libre ne suffit pas en B2B : il manque **quantité souhaitée, destination/ville de livraison, budget, délai**. Une demande structurée donne au fournisseur de quoi répondre vite et chiffré.
- Après envoi : aucune promesse de délai, aucune notification e-mail au vendeur quand le fournisseur répond.

### 4.5 Espace vendeur
- Liste de conversations seulement. Pas de favoris, pas de fournisseurs déjà contactés, pas de profil modifiable, pas de demandes envoyées.

### 4.6 Transversal
- **SEO** : l'application est une page unique, sans titre ni description par page, et `sitemap.xml` / `robots.txt` pointent vers `looh-oo.com` (domaine de la landing) au lieu de `fournisseurs.looh-oo.com`, sans aucune page produit ni fournisseur listée. Les produits ne seront pas indexés par Google.
- **Mesure** : aucun outil d'analyse. Les indicateurs du PDF §6 (catégories les plus cherchées, taux de retour) ne peuvent pas être calculés.
- **Performance** : un seul paquet JS de 489 Ko, aucun chargement différé des pages. Important sur mobile en Afrique de l'Ouest.
- **Fiabilité** : si un chargement échoue, le message est générique et sans bouton « Réessayer ».
- **Légal** : pages légales avec repères `[À COMPLÉTER]` (infos du client). Pas de case de consentement e-mail.
- **Dette technique** : fichiers en double (`src/api/stockagePhotos.js`, `src/api/nettoyer-conversations.js` vide), fonctions mortes, schéma Supabase non versionné, cron sans secret.

## 5. Les 5 décisions à prendre avec le client

1. **Notifications** : quel canal pour prévenir un fournisseur ? E-mail (simple, gratuit, fiable) en premier, WhatsApp (plus efficace en Côte d'Ivoire, mais API payante) ensuite ?
2. **Monétisation** : abonnement fournisseur, ou frais par mise en relation, ou mise en avant payante ? Cela change ce qu'on met dans le tableau de bord.
3. **Catégories** : une liste fermée gérée par LOOHOO. Le client peut-il la fournir ?
4. **Compte vendeur** : accepte-t-on d'envoyer un premier message avant de créer un compte (confirmation par e-mail) ?
5. **Mali** : on garde seulement la mention « Bientôt au Mali » (recommandé), pas de fonctionnalité.

## 6. Plan proposé, par ordre de valeur

### Lot 1 — Fermer la boucle (indispensable avant tout lancement)
1. Notification e-mail au fournisseur à chaque nouveau message (fonction serverless + e-mail transactionnel, SMTP à configurer : Resend ou Brevo).
2. Notification e-mail au vendeur quand le fournisseur répond.
3. Bouton « Contacter » sur la page fournisseur.
4. Conversation lisible : interlocuteur, produit, dates, activité du vendeur.
5. « Mot de passe oublié ».
6. Édition de produit, confirmation de suppression, bascule actif/inactif.

### Lot 2 — Le parcours fournisseur devient guidé
1. Page marketing « Devenir fournisseur ».
2. Inscription en étapes (entreprise, stock et origine, contact), catégories en liste fermée, consentement.
3. Checklist de publication sur le tableau de bord, avec statut clair et délai annoncé, et explication du badge « Vérifié ».
4. Page fournisseur enrichie : présentation, horaires, ancienneté.
5. Fiche produit complète (tags, stock, dimensions, produits du même fournisseur).

### Lot 3 — La confiance et la conversion côté vendeur
1. Accueil : étapes, chiffres, catégories, fournisseurs à la une, tri, pagination.
2. Demande de contact structurée (quantité, ville, délai).
3. Demande de sourcing quand il n'y a aucun résultat.
4. Contact sans mot de passe immédiat (lien magique).
5. Favoris et historique côté vendeur.

### Lot 4 — Visibilité et mesure
1. SEO : titre/description par page, sitemap dynamique du bon domaine, données structurées produit.
2. Journal des recherches et outil d'analyse.
3. Délai de réponse moyen affiché sur le profil.
4. Chargement différé des pages, tests mobile.

### Lot 5 — Hygiène technique
Nettoyage des doublons, migrations SQL versionnées dans le dépôt, `CRON_SECRET`, tests de parcours.

## 7. Précautions de travail

- Toute modification de base (colonnes, RPC, triggers) sera livrée sous forme de **fichiers SQL numérotés dans `supabase/migrations/`**, avec une requête de vérification, à exécuter par vous dans Supabase. Je ne peux pas atteindre la base moi-même.
- Pas de modification de `loohoo-admin` ni de `loohoo` sans demande explicite. Si un changement ici impose une adaptation côté admin (nouveaux champs à modérer), je la décrirai dans une note à transmettre à l'autre développeur.

## 8. Avancement

### Fait le 2026-10-05 (code prêt, build OK, non testé en conditions réelles)
- Bouton « Contacter ce fournisseur » sur la page fournisseur, plus affichage des horaires (masqués si aucun n'est renseigné).
- Conversation lisible : nom de l'interlocuteur, activité du vendeur, lien vers le produit ou le fournisseur, heures, séparateurs par jour, message affiché immédiatement à l'envoi, sans doublon avec Realtime, Entrée pour envoyer.
- Catalogue : modification d'un produit, activer/désactiver, confirmation avant suppression.
- `supabase/migrations/0001_protection_moderation_produit.sql` : à exécuter dans Supabase (empêche l'auto-publication, remet en vérification un produit publié dont le contenu change, permet de resoumettre un produit rejeté).

### Fait ensuite (2026-10-05, build OK, rendu des pages vérifié, parcours non testé avec Supabase)
- Migration 0001 appliquée par Isaac.
- « Mot de passe oublié » (/mot-de-passe-oublie, /nouveau-mot-de-passe), lien depuis la connexion. Nécessite le sous-domaine branché et ajouté dans Supabase > Authentication > URL Configuration.
- Page marketing /devenir-fournisseur (liée depuis le pied de page et la connexion). Aucune mention de tarif, la monétisation n'étant pas décidée.
- Inscription guidée : 3 blocs, type d'entreprise (local / étranger), stock confirmé, téléphone normalisé, case conditions obligatoire, gestion de la confirmation d'e-mail (profil créé à la première connexion).
- Catégories en liste fermée (src/data/categories.js, liste de départ à valider par le client) à l'inscription, au profil et sur les produits.

### Intégration des 4 maquettes validées par le client (option A : pas de commandes ni de chiffre d'affaires)
- Étape 1 faite : cadre de l'espace fournisseur (barre du haut, menu latéral, cloche de notifications avec liste des nouveaux messages, menu utilisateur, version mobile en tiroir). Les routes /tableau-de-bord, /produits, /mediatheque, /profil, /statistiques, /conversations utilisent ce cadre; un vendeur garde l'en-tête public.
- Étape 2 faite : nouveau tableau de bord (bandeau + indicateurs réels, checklist de publication, produits récents, dernières demandes, graphique des demandes, messages non lus). L'ancienne page est devenue /produits.
- Étape 3 faite (code, build OK, non testé connecté) : liste Mes produits (onglets par statut, recherche, état vide) et formulaire produit selon la maquette 1 (/produits/nouveau et /produits/:id/modifier : deux colonnes, glisser-déposer, sous-catégories, mots-clés en pastilles, poids en kg, interrupteur actif, encart Vérification, barre d'actions fixe).
- Étape 4 faite (code, build OK, non testé connecté) : page Paramètres et profil selon la maquette 2 (carte d'identité avec logo et présentation, tableau d'informations modifiable ligne par ligne, documents avec statuts, statistiques du profil sans note, horaires, réseaux privés, photos, bannière). Nécessite la migration 0002 pour la présentation; elle s'affiche aussi sur la page publique du fournisseur.
- Étape 5 faite (code, build OK, non testé connecté) : « Demandes et messages » (statuts Nouvelle / En attente de réponse / Répondue, filtres) et Statistiques selon la maquette 4 en version adaptée (période 7/30/90 j avec comparaison, taux de réponse, délai de réponse médian, courbe, anneau de répartition, produits les plus demandés, export CSV). Origine des visites et produits les plus vus : nécessitent la migration 0003 (suivi anonyme des visites).
- Étape 6 faite (code, build OK, non testé connecté) : refonte de la messagerie (liste à gauche et fil à droite sur ordinateur, écrans séparés sur mobile; recherche et filtre « non lus »; fil avec fiche produit, logo et badge du fournisseur côté acheteur, activité de l'acheteur côté fournisseur, messages groupés avec heures, « Envoyé / Vu », envoi immédiat avec « Réessayer » en cas d'échec, réponses rapides côté fournisseur et côté acheteur, avertissement doux si un numéro ou un e-mail est écrit, relève automatique toutes les 20 s si le temps réel est coupé). Demande de devis structurée à la place du message libre (produit, quantité, ville de livraison, délai, précisions) affichée comme une carte dans le fil.
- À décider avec le client : masquer ou bloquer les numéros de téléphone et e-mails dans les messages (aujourd'hui : simple avertissement), pièces jointes (photos, devis PDF), statut manuel de la demande (conclue, archivée), signalement d'abus, notifications par e-mail (domaine requis).
- Reste : performance par ville (dépend de la demande de devis structurée avec ville de livraison), puis la logique Alibaba côté acheteur.
- Équivalences retenues : Commandes devient Demandes; chiffre d'affaires devient demandes reçues; panier moyen devient délai de réponse moyen; taux de conversion devient taux de réponse; note moyenne reportée après le lancement.
- Logique Alibaba à appliquer côté acheteur : catégories à parcourir, demande de devis structurée (quantité, ville de livraison, délai), page entreprise, fournisseurs vérifiés mis en avant.

### Reporté (dépend du nom de domaine / registrar)
Brevo (authentification DNS, expéditeur), SMTP personnalisé Supabase, adresse contact@, Search Console, branchement de fournisseurs.looh-oo.com et boutique.looh-oo.com, puis réglage Site URL / Redirect URLs dans Supabase.
