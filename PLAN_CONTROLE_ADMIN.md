# LOOHOO — Plan : contrôle total par l'administrateur et protection des échanges

Rédigé le 2026-10-06 à partir d'un contrôle de la base (accès visiteur anonyme) et du code des deux applications.

## 1. Le principe

Pour que LOOHOO puisse prélever une commission, il faut deux choses :
1. **Personne ne peut joindre un fournisseur en dehors de la plateforme.** Aucune coordonnée privée ne sort, ni par la base, ni par les messages, ni par les fiches.
2. **L'administrateur voit et valide tout** : fournisseurs, produits, documents, stock, échanges.

Limite à connaître : un contrôle technique à 100 % n'existe pas (quelqu'un peut écrire un numéro en toutes lettres). La protection solide est une **combinaison** : masquage automatique, supervision par l'admin, conditions d'utilisation qui interdisent le contournement, et une plateforme assez utile (devis, suivi, confiance, plus tard paiement) pour qu'on n'ait pas envie d'en sortir. Le seul verrou vraiment fort est le paiement dans la plateforme (hors périmètre phase 1).

## 2. Ce qui a été vérifié aujourd'hui (accès visiteur anonyme)

| Donnée | Constat |
|---|---|
| Téléphone du fournisseur (`grossiste_contact`) | Protégé |
| Acheteurs (`vendeur`), conversations, messages, mises en relation, documents, leads, visites, admins | Protégés |
| **Adresse, site web, réseaux sociaux (dont WhatsApp) du fournisseur** | **Lisibles par n'importe qui** : fuite, à corriger |
| Photos d'un produit publié (`produit_photo`) | **Refusées aux visiteurs** : la fiche produit échoue pour un visiteur non connecté (corrigé par la migration 0005) |
| Messages | Les coordonnées écrites dans un message passent aujourd'hui sans filtre |

## 3. Phase 1 — Verrouiller le côté fournisseur (ce dépôt)

1. **Migration 0005** : photos de produit lisibles par les visiteurs (bug visiteur).
2. **Migration 0006 : vie privée des fournisseurs.**
   - Les champs privés (adresse, site web, réseaux sociaux) sont déplacés dans la table déjà protégée des contacts. La table publique `grossiste` ne contient plus aucune donnée privée.
   - Seuls le fournisseur lui-même et l'admin peuvent lire cette table.
   - Le site (page Paramètres) est adapté pour lire et écrire au nouvel endroit.
3. **Migration 0007 : masquage des coordonnées dans les messages.** Un déclencheur remplace automatiquement les numéros de téléphone, e-mails, liens et mentions « WhatsApp » écrits dans un message par « [coordonnées masquées] », et marque le message comme « signalé » pour l'admin. L'interface prévient l'utilisateur avant l'envoi. (Mode « avertir seulement » possible à la place, voir décisions.)
4. **Supervision** : l'admin peut lire toutes les conversations (les conditions d'utilisation l'indiquent, comme sur toute marketplace).
5. **Contrôle du contenu public** : les champs libres (présentation, descriptions, mots-clés, noms) sont analysés à l'enregistrement; s'ils contiennent un numéro, un e-mail ou un lien, l'élément passe en vérification avec un drapeau pour l'admin. Les photos (logo, bannière, produits) sont revues par l'admin avant publication.
6. **Stock vérifié** : le fournisseur déclare son stock; l'admin le confirme (date et nom de l'admin). Les acheteurs voient « Stock vérifié le … » sur les produits concernés.

## 4. Phase 2 — Interface administrateur (dossier loohoo-admin)

Reprise du style des maquettes validées par le client. Modules par ordre de valeur :

1. **Tableau de bord** : à traiter (fournisseurs, produits, documents, signalements), nombre de demandes du jour, taux de réponse global, délai de réponse moyen, mises en relation, nouveaux fournisseurs et acheteurs.
2. **File « À traiter »** : une seule liste unifiée (profils, produits, documents, messages signalés) avec approuver / rejeter + motif obligatoire (modèles de motifs), compteur, filtres.
3. **Fiche fournisseur complète** : toutes les informations privées (téléphone, adresse, site, réseaux), documents (consultation sécurisée), photos de vérification, logo et bannière, tous ses produits, ses statistiques, ses conversations, notes internes de l'équipe, historique des décisions. Actions : publier, suspendre (motif), badge « Vérifié », vérifier le stock.
4. **Produits** : tous les produits, file de validation, publier ou rejeter, dépublier, modifier un champ litigieux.
5. **Acheteurs** : liste, coordonnées, activité, conversations, suspension.
6. **Supervision des conversations** : lecture de toutes les conversations, recherche par mot, messages signalés, détection de contournement.
7. **Journal d'audit** : qui a fait quoi et quand (validations, rejets, suspensions, lectures sensibles). Rôles : super-admin et modérateur.
8. **Catégories** : gestion de la liste (ajout, renommage, sous-catégories) depuis l'admin, au lieu du code.
9. **Leads** : e-mails captés par la landing et par les demandes de sourcing, export CSV.
10. **Mises en relation et commissions** (voir décision 3) : registre des mises en relation, puis des affaires conclues et de la commission due.

## 5. Phase 3 — Synchronisation fournisseur ↔ admin

- Le fournisseur voit en direct le statut de chaque décision (publié, rejeté avec motif, stock vérifié).
- Notifications dans l'application dès qu'une décision est prise (e-mail après branchement du domaine et de Brevo).
- Tout nouveau champ ajouté côté fournisseur apparaît dans la fiche admin (les deux applications partagent la même base).

## 6. Décisions à prendre avec le client

1. **Masquage ou avertissement** pour les coordonnées dans les messages. Recommandé : **masquer** (c'est le seul moyen de protéger la commission).
2. **Qui est administrateur** : un seul compte, ou des rôles (super-admin, modérateur) avec journal d'audit. Recommandé : rôles.
3. **Commission** : comment LOOHOO saura qu'une affaire est conclue. Recommandé : bouton « Affaire conclue » dans la conversation, confirmé par les deux parties, avec montant déclaré; l'admin voit le registre et la commission due. Les paiements restent hors plateforme en phase 1.
4. **Dossier admin** : un autre développeur en a la responsabilité. Il faut le prévenir et travailler sur une branche séparée pour éviter les conflits.

## 7. Avancement de la phase 1 (2026-10-06)

Écrit et vérifié sur un moteur PostgreSQL de test (migrations 0001 à 0010 de bout en bout, voir supabase/migrations/LISEZ-MOI.md) :
- 0005 photos de produit publiques (bug visiteur), 0006 et 0007 données privées du fournisseur dans la table protégée,
  0008 masquage des coordonnées dans les messages et drapeaux sur les contenus publics, 0009 stock vérifié et lecture admin,
  0010 vie privée des acheteurs.
- Site adapté : lecture et écriture des données privées dans la table protégée, téléphone de l'acheteur via mon_vendeur(),
  avertissements avant envoi, puce « Coordonnées détectées », bandeau d'alerte sur le profil, « stock vérifié par LOOHOO » sur la fiche produit,
  purge des textes d'origine après 90 jours.
- Reste côté site : rien d'obligatoire. Prochaine étape : le dossier loohoo-admin (phase 2), sur une branche séparée.

## 8. Avancement de la phase 2 : interface administrateur (2026-10-06)

Dossier loohoo-admin, branche `admin-controle-total` (la branche yoann-dev de l'autre développeur est identique à main, aucun conflit à ce jour).
Migration 0011 (pouvoirs admin) écrite et testée sur le moteur de test : journal d'audit automatique, décisions motivées (motif obligatoire pour suspendre ou rejeter),
notes internes, lecture des documents privés, messages signalés « traités », tableau de bord en un seul appel.

Écrans livrés (build OK, non testés connecté) : cadre avec menu latéral et compteur « À traiter », tableau de bord, À traiter (fournisseurs, produits, documents, messages signalés),
Fournisseurs (liste filtrable, export CSV), fiche fournisseur complète (informations privées, documents, photos, produits, stock, conversations, notes, historique),
Produits (validation, rejet motivé, vérification du stock), Acheteurs (coordonnées, conversations, notes), Conversations (supervision en lecture seule, texte d'origine des messages masqués),
Leads (export CSV), Journal d'audit, Boutiques (existant, déplacé dans le cadre). Le pont serveur des boutiques a été déplacé dans api/ pour être réellement déployé par Vercel.

Reste : rôles (super-admin / modérateur), gestion des catégories depuis l'admin, registre des affaires conclues et commissions, notifications au fournisseur après décision (côté fournisseur : afficher le motif de suspension), connexion admin restylée.

## 9. Avancement (2026-10-06, suite)

L'autre développeur a cessé de travailler sur l'admin : travail libre sur loohoo-admin (branche admin-controle-total).

- Côté fournisseur : décisions de l'équipe visibles (suspension avec motif, produits rejetés, documents refusés) dans un bloc du tableau de bord.
- Migration 0012 + écrans : « Déclarer une affaire conclue » dans la conversation (une partie déclare, l'autre confirme ou conteste, annulation possible tant qu'il n'y a pas de réponse),
  chiffre « Affaires conclues » réel dans les statistiques du fournisseur; côté admin, page Affaires et commissions (taux, arbitrage des contestations, facturée / payée / annulée, export).
- Migration 0013 + écrans : rôles super-admin et modérateur, page Équipe, page Catégories (ajout, renommage propagé, activation, ordre), formulaires du site lus depuis la base avec repli sur la liste intégrée.
- Connexion admin restylée.
- Toutes les migrations 0001 à 0013 passent de bout en bout sur le moteur de test; les règles de sécurité sont vérifiées (un fournisseur ne peut pas décider, un modérateur ne touche pas aux commissions, la commission est invisible des participants).

Reste (idées) : notifications par e-mail après une décision (domaine et Brevo requis), mode « avertir seulement » configurable pour les coordonnées, pièces jointes dans les conversations, statuts « conclue / archivée » des demandes, signalement d'abus par les utilisateurs.

## 10. Deux espaces dans l'administration et premiers messages prêts (2026-10-06)

- Administration séparée en deux espaces : Fournisseurs (adresses /f/..., couleurs LOOHOO) et Boutiques (adresses /b/..., teinte vert-bleu), avec un sélecteur en haut, un menu propre à chaque espace, et des pages communes (accueil, journal d'audit, équipe).
  Les anciennes adresses redirigent. Les demandes « créer ma boutique » de la landing (source landing-*) vont dans l'espace Boutiques, les autres leads dans l'espace Fournisseurs.
  L'espace Boutiques affiche sans chiffres inventés ce qui existe (boutiques connectées, demandes d'ouverture) et ce qui est « à venir ».
- Fenêtre de contact : six premiers messages prêts à envoyer (produit) ou quatre (page fournisseur). Acheteur connecté : un clic envoie le message tout de suite. Visiteur : le message est choisi puis validé avec ses coordonnées.
