# Migrations Supabase : ordre d'exécution

À exécuter dans Supabase, SQL Editor, une à la fois, dans l'ordre. Chaque fichier peut être relancé sans danger.
Les fichiers de `supabase/maintenance/` ne sont PAS des migrations (remise à zéro, données de démonstration).

| N° | Rôle | Quand l'exécuter |
|---|---|---|
| 0001 | Protection de la modération des produits (auto-publication impossible) | Fait |
| 0002 | Texte de présentation du fournisseur | Fait |
| 0003 | Suivi anonyme des visites (statistiques d'origine) | Dès que possible |
| 0004 | Droits du fournisseur sur son propre téléphone | Dès que possible |
| 0005 | **Photos de produit lisibles par les visiteurs** (corrige « Produit introuvable » en navigation privée) | **Tout de suite** |
| 0006 | Colonnes privées (adresse, site, réseaux) dans la table protégée des contacts + copie | Avant le déploiement du site |
| — | **Déployer le site** (il lit et écrit les données privées dans la table protégée) | |
| 0007 | Retire les données privées de la table publique `grossiste` | Après le déploiement |
| 0008 | Masquage des coordonnées dans les messages + drapeaux sur les contenus publics | Après le déploiement |
| 0009 | Stock vérifié par LOOHOO + lecture complète pour l'admin | Après le déploiement |
| 0010 | Téléphone et e-mail des acheteurs invisibles pour les autres comptes | En dernier, après avoir vérifié qu'un acheteur peut encore envoyer une demande de devis |
| 0011 | Pouvoirs admin : journal d'audit, décisions motivées, notes internes, documents privés, tableau de bord | Dès que le site admin est déployé (avant d'ouvrir l'administration) |
| 0012 | Affaires conclues et commissions (déclaration, confirmation par l'autre partie, commission visible de l'admin seulement) | Avec 0011 |
| 0013 | Rôles super-admin / modérateur, équipe, catégories gérées depuis l'admin | Après 0011 et 0012 |
| 0014 | **Correctif** : « Publier ce fournisseur » échouait (contrainte du téléphone). Les motifs de décision ont leur propre table | **Tout de suite après 0013** |

Côté site fournisseur, les fonctions liées aux migrations 0012 et 0013 se masquent d'elles-mêmes tant que celles-ci ne sont pas
passées (aucune erreur affichée). Côté ADMINISTRATION, la migration 0011 est indispensable (tableau de bord, décisions, journal),
la 0012 pour la page « Affaires et commissions » et la 0013 pour « Équipe » et « Catégories ».

## Vérifié

Les migrations 0001 à 0013 ont été exécutées de bout en bout sur un moteur PostgreSQL de test, avec un schéma qui imite
la base. Confirmé : masquage des numéros, e-mails, liens, pseudos et numéros écrits en lettres (montants et dates intacts),
retour en vérification d'un produit contenant une coordonnée, refus de l'auto-publication, retrait du « stock vérifié »
quand le fournisseur change le stock, vidage automatique des données privées de la table publique, refus de lecture du
téléphone d'un acheteur par un compte connecté.
Ce test n'est PAS fait sur la vraie base : en cas de message d'erreur à l'exécution, ne passez pas à la suivante et envoyez-le.

## 0015 — Indicateurs de confiance
Ajoute la fonction `indicateurs_confiance` : affaires confirmées, taux et délai de réponse (90 jours, seulement à partir de
3 conversations) et date de dernière vérification du stock, pour les fournisseurs publiés. Aucun nom, montant ni message n'en sort.
Testée sur le moteur de test (0001 à 0015 passent). Affichée sur la page fournisseur et la page produit.

## 0016 — Avis après affaire
Table `avis` et fonctions `deposer_avis`, `avis_publics`, `resume_avis`, `admin_moderer_avis`, `admin_liste_avis`.
Un avis ne peut venir que de l'acheteur d'une affaire confirmée (un seul par affaire), sans coordonnées dans le commentaire,
et n'est visible qu'après validation par l'équipe (page « Avis des acheteurs » de l'admin). Testée sur le moteur de test.

## 0017 — Prix par paliers
Ajoute `produit.paliers` (jusqu'à 4 paliers : quantité de départ et prix) avec contrôle de cohérence par la base :
quantités croissantes au-dessus du minimum de commande, prix strictement décroissants sous le prix de base.
Un fournisseur qui relève son minimum ou baisse son prix de base sous un palier doit d'abord ajuster ses paliers.

## 0018 — Stock mis à jour, seuil de ventes gratuites
Ajoute `produit.stock_maj_le` (rempli automatiquement quand le stock change), le paramètre `seuil_ventes_gratuites` (50 par défaut),
`grossiste.abonnement_actif` et `date_debut_abonnement` (non modifiables par le fournisseur) et la fonction `mon_abonnement()`.
Aucun prix ni facturation : le montant de l'abonnement reste à fixer avec le client.

## 0019 — Accueil public
Ajoute `chiffres_publics()` (fournisseurs, vérifiés, produits, pays : comptés, jamais saisis) et `fournisseurs_a_la_une(n)` (fournisseurs publiés
avec au moins un produit publié, note moyenne des avis validés, prix de gros le plus bas). Rien de privé n'en sort. Testée sur le moteur de test.

## 0020 — Fournisseurs favoris
Table `favori` sans accès direct, et trois fonctions réservées aux comptes acheteurs : `basculer_favori`, `est_favori`, `mes_favoris`.
Seuls les fournisseurs publiés peuvent être suivis. Testée sur le moteur de test (un fournisseur ou un autre acheteur ne peut ni suivre ni lire).

## 0021 — Lien partageable
Ajoute `grossiste.slug` (adresse courte générée depuis le nom, unique, stable, modifiable par l'équipe seulement), le remplissage des fournisseurs
existants et `grossiste_id_par_slug()`. Le site sert la fiche à `/f/<slug>`. Testée sur le moteur de test.

## 0022 — Recherches sans résultat
Table `recherche_sans_resultat` (terme, catégorie, ville, date : rien de personnel), `signaler_recherche_vide()` appelée par le site
et `admin_recherches_vides(jours)` qui donne la synthèse à l'administration (à brancher dans l'écran « Demandes non couvertes »).
Testée sur le moteur de test.

## 0023 — Formules d'abonnement
Seuil gratuit passé à 20 ventes confirmées (sauf s'il a déjà été modifié), prix des niveaux 1 à 3 (mensuel et annuel) dans `parametre`,
et `formules_abonnement()` lisible par tous. Aucun paiement n'est encaissé par le site. Testée sur le moteur de test.

## 0024 — Multi-pays
Table `pays_loohoo` (Côte d'Ivoire ouverte ; Mali, Sénégal, Burkina Faso, Bénin, Togo, Niger prêts), `grossiste.pays_code`
(choisi à l'inscription, modifiable tant que le profil est en attente, verrouillé ensuite ; la colonne `pays` suit automatiquement),
`vendeur.pays_code`, `definir_mon_pays_acheteur()` et `admin_ouvrir_pays(code, ouvert)`.
Ouvrir un pays depuis l'éditeur SQL : `select public.admin_ouvrir_pays('ML', true);`. Testée sur le moteur de test.

## 0025 — Statut test, pays affichés, communauté
- `est_test` sur fournisseurs et produits : visibles seulement par leur propriétaire et l'équipe, exclus des chiffres et de « à la une ».
  Exemple : `update public.grossiste set est_test = true where nom = 'THE ULCERE';`
- Pays : Côte d'Ivoire ouverte, Sénégal et Cameroun « bientôt », les autres masqués. `select public.admin_statut_pays('SN', 'actif');`
- Liens de la communauté : `select public.admin_definir_lien_communaute('youtube', 'https://www.youtube.com/@…');`
Testée sur le moteur de test.

## 0026 — Recherche, villes et communes, date de vérification
- `lieu` : villes (et communes d'Abidjan) en listes fermées pour la Côte d'Ivoire, le Sénégal et le Cameroun ; les villes et communes
  déjà saisies à la main sont remises à la forme officielle (« abidjan » → « Abidjan », « ADJAME » → « Adjamé »).
- `grossiste.verifie_le` : date d'attribution du badge « vérifié ».
- `rechercher_catalogue()` et `categories_catalogue()` : la recherche de l'accueil (filtres, tris, pagination, prix des paliers, données de test exclues).
- `fournisseurs_a_la_une()` renvoie aussi la date d'inscription, la date de vérification et l'adresse courte.
À exécuter après 0024 et 0025. Testée sur le moteur de test.

## 0027 — Fiche produit (lot 3)
- Publication immédiate : un produit ajouté par le fournisseur est en ligne tout de suite. L'équipe le retire après coup (statut
  « rejeté » + motif) ; un produit rejeté puis corrigé repasse « en vérification ». Les anciens produits en attente sont publiés une fois
  (sauf ceux qui contiennent une coordonnée).
- Contrôle à l'envoi : nom, description, mots-clés, usage et référence sont refusés s'ils contiennent un numéro, un e-mail, un lien,
  ou une promesse de santé, de résultat ou de livraison. Le fournisseur voit la raison.
- Caractéristiques : usage, pièces et poids du carton, origine, délai de préparation, matière, marque, modèle, variantes,
  capacité mensuelle, personnalisation, échantillon (et son prix).
- Paliers : trois prix au maximum (le prix de base + deux paliers dégressifs).
- Favoris produits (`basculer_favori_produit`, `mes_produits_favoris`), certificats (`ajouter_certificat`, `certificats_produit`,
  `admin_certificats`, `admin_verifier_certificat(id, 'verifie' | 'rejete')`), signalements (`signaler_produit`, `admin_signalements_produits`).
  Vérifier un certificat depuis l'éditeur SQL : `select * from public.admin_certificats();` puis le fichier est dans Storage > documents.
À exécuter après 0026. Testée sur le moteur de test.
Les produits déjà en ligne ne sont pas modifiés. Pour repérer ceux qui contiennent une promesse interdite (à corriger ou retirer) :
`select id, nom from public.produit where cardinality(public.promesses_interdites(nom || ' ' || coalesce(description, ''))) > 0;`

## 0028 — Site officiel (looh-oo.com)
- « Nos premiers fournisseurs vérifiés » : `grossiste.afficher_site_officiel` (le fournisseur donne son accord dans son profil, carte
  « Site officiel LOOHOO ») + table `photo_terrain` (photos prises par l'équipe lors de la visite, réutilisées par le profil public).
  La section apparaît sur le site officiel à partir de 4 fournisseurs vérifiés, d'accord et avec une photo terrain.
  Ajouter une photo terrain depuis l'éditeur SQL (après l'avoir envoyée dans Storage > photos > dossier `terrain/`) :
  `select public.admin_ajouter_photo_terrain('<id du fournisseur>', '<adresse publique de la photo>');`
- « Le marché en direct » : `marche_en_direct()` renvoie l'activité réelle des 30 derniers jours (fournisseur vérifié, nouveau produit,
  fournisseur qui ajoute des produits), sans les données de test. Le bandeau reste caché sous 3 événements.
À exécuter après 0027. Testée sur le moteur de test.

## 0029 — Profil public du fournisseur (lot 4)
- Publication immédiate : un fournisseur qui s'inscrit est en ligne tout de suite ; les profils en attente sont publiés une fois
  (sauf ceux qui contiennent une coordonnée). Seul le badge « vérifié » reste humain. Le pays se verrouille au badge.
- Contrôle à l'envoi : nom, présentation, vitrine et FAQ refusés s'ils contiennent un numéro, un e-mail, un lien ou une promesse
  de santé, de résultat ou de livraison (comme les produits).
- Types neutres (`type_entreprise` : fabricant, grossiste, importateur, producteur ; `est_fabricant` suit automatiquement),
  origine de l'entreprise (`pays_origine` + `afficher_origine`), langues parlées, et la vitrine : année de création, spécialités,
  emplacement, zones d'expédition, moyens de paiement, vidéo, champs selon le type, FAQ (12 questions). Présentation : 5 000 caractères.
- `documents_verifies()` (types seulement, jamais le numéro ni le fichier), `origines_fournisseurs()` et le filtre `p_origine`
  de `rechercher_catalogue()`.
À exécuter après 0028. Testée sur le moteur de test.

## 0030 — Communauté et cloche de notifications (lot 5)
- Table `annonce` : nouveautés et annonces de l'équipe, ouverture d'un pays (créée toute seule quand un pays passe « actif »),
  promotions des fournisseurs (reçues par les acheteurs qui les suivent). Les vidéos YouTube sont lues sur la chaîne réglée dans
  « Rejoignez la communauté » (api/videos-youtube.js, sans clé d'API) : rien à stocker.
- Publier une annonce depuis l'éditeur SQL (en attendant l'écran d'administration) :
  `select public.admin_publier_annonce('nouveaute', 'Nouveau : prix par paliers', 'Jusqu''à trois prix selon la quantité.', '/');`
  Types : `nouveaute`, `annonce`, `pays`. Retirer (aussi une promotion) : `select public.admin_retirer_annonce('<id>');`
  Tout voir : `select * from public.admin_annonces();`
- Promotions : depuis l'espace fournisseur (menu « Promotions »), 3 par semaine au plus, 60 jours au plus, même contrôle à l'envoi
  que les produits.
- `ma_cloche()` et `marquer_cloche_lue()` : la cloche de l'en-tête et ses non lus.
À exécuter après 0029. Testée sur le moteur de test.

## 0031 — Compléments du cahier v3 (promotions, statut spécial, stock, alertes, tendances)
- Promotions (§15bis) : `promotions_en_cours()` alimente la rangée « Promotions en cours » de l'accueil, la page du fournisseur
  et le bandeau de la fiche produit ; `rechercher_catalogue()` renvoie `en_promotion` (badge « Promo » sur les cartes).
  La cloche prévient aussi les acheteurs qui ont déjà écrit au fournisseur, plus seulement ses abonnés.
- Statut spécial (§4) : « Membre fondateur » ou « Fournisseur prioritaire », mis en avant dans les résultats et « À la une ».
  Seul LOOHOO l'accorde, depuis l'éditeur SQL en attendant l'écran d'administration :
  `select public.admin_definir_statut_special('<id du fournisseur>', 'fondateur', null);` (null = sans fin ;
  ou une date : `now() + interval '6 months'`). Retirer : `select public.admin_definir_statut_special('<id>', null, null);`
- Stock (§8) : la déclaration d'affaire accepte une quantité ; à la confirmation par l'acheteur, le stock du produit de la
  conversation baisse d'autant (jamais sous zéro).
- Cloche : nouveau fournisseur vérifié dans les catégories de l'acheteur, produit de retour en stock (enregistré ou fournisseur
  suivi), et pour le fournisseur, certificat qui expire dans 30 jours.
- `tendances_semaine()` (§16) : produits les plus vus et contactés sur 7 jours (rangée affichée à partir de 4 produits).
À exécuter après 0030. Testée sur le moteur de test. Le site fonctionne avant son exécution (les nouveautés restent masquées).
