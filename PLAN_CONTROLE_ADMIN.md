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
