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

## Vérifié

Les migrations 0001 à 0010 ont été exécutées de bout en bout sur un moteur PostgreSQL de test, avec un schéma qui imite
la base. Confirmé : masquage des numéros, e-mails, liens, pseudos et numéros écrits en lettres (montants et dates intacts),
retour en vérification d'un produit contenant une coordonnée, refus de l'auto-publication, retrait du « stock vérifié »
quand le fournisseur change le stock, vidage automatique des données privées de la table publique, refus de lecture du
téléphone d'un acheteur par un compte connecté.
Ce test n'est PAS fait sur la vraie base : en cas de message d'erreur à l'exécution, ne passez pas à la suivante et envoyez-le.
