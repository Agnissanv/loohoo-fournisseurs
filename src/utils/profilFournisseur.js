import { langueActive } from '../i18n/langueActive.js';

// Petits calculs d'affichage pour l'espace fournisseur : rien n'est stocké, tout est recalculé à l'affichage.

// « 3 jours » sous un mois, « 5 mois » sous un an, « 2 ans » au-delà
export function anciennete(dateIso) {
  if (!dateIso) return null;
  const debut = new Date(dateIso);
  if (Number.isNaN(debut.getTime())) return null;
  const jours = Math.max(0, Math.floor((Date.now() - debut.getTime()) / 86400000));
  const en = langueActive() === 'en';
  if (jours < 30) return en ? `${jours} day${jours > 1 ? 's' : ''}` : jours <= 1 ? `${jours} jour` : `${jours} jours`;
  const mois = Math.floor(jours / 30.4375);
  if (mois < 12) return en ? `${mois} month${mois > 1 ? 's' : ''}` : `${mois} mois`;
  const ans = Math.floor(mois / 12);
  if (en) return ans === 1 ? '1 year' : `${ans} years`;
  return ans === 1 ? '1 an' : `${ans} ans`;
}

// Score de complétude du profil : 10 critères de 10 points. Renvoie { pourcent, manquants: [{ texte, vers }] }
export function completudeProfil(profil, documents = [], telephone = '') {
  const produits = profil.produit || [];
  const criteres = [
    [!!profil.logo_url, 'Ajouter votre logo', '/profil'],
    [!!(profil.description && profil.description.trim()), 'Décrire votre entreprise', '/profil'],
    [(profil.grossiste_photo || []).length >= 1, 'Ajouter une photo de votre entreprise', '/profil'],
    [!!telephone, 'Renseigner votre téléphone (privé)', '/profil'],
    [!!profil.horaires_ouverture && Object.values(profil.horaires_ouverture).some(Boolean), "Indiquer vos horaires d'ouverture", '/profil'],
    [produits.length >= 1, 'Ajouter un premier produit', '/produits'],
    [produits.length >= 5, 'Avoir au moins 5 produits au catalogue', '/produits'],
    [produits.some((p) => p.photo_url), 'Mettre une photo sur au moins un produit', '/produits'],
    [!!profil.stock_confirme, 'Confirmer que votre stock est disponible', '/tableau-de-bord'],
    [documents.length >= 1, 'Envoyer un document pour la vérification', '/profil'],
  ];
  const faits = criteres.filter(([ok]) => ok).length;
  return {
    pourcent: Math.round((faits / criteres.length) * 100),
    manquants: criteres.filter(([ok]) => !ok).map(([, texte, vers]) => ({ texte, vers })),
  };
}

// « Aujourd'hui », « Il y a 3 jours »…
export function ilYa(dateIso) {
  if (!dateIso) return null;
  const jours = Math.floor((Date.now() - new Date(dateIso).getTime()) / 86400000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  return `il y a ${jours} jours`;
}

// Clé de jour locale (AAAA-MM-JJ) pour regrouper des dates
export const cleJour = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// Les 30 derniers jours, du plus ancien au plus récent
export function trenteDerniersJours() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - (29 - i));
    return cleJour(d);
  });
}

// ---- Profil public (lot 4) ----
// Types neutres demandés par le client : on ne parle plus de « grossiste étranger »
export const TYPES_ENTREPRISE = {
  fabricant: 'Fabricant local',
  grossiste: 'Grossiste',
  importateur: 'Importateur',
  producteur: 'Producteur',
};

export const LANGUES = {
  fr: 'Français', en: 'Anglais', zh: 'Chinois', ar: 'Arabe', tr: 'Turc', hi: 'Hindi', pt: 'Portugais', es: 'Espagnol',
  dioula: 'Dioula', baoule: 'Baoulé', wolof: 'Wolof', ha: 'Haoussa', yo: 'Yoruba', bm: 'Bambara',
};

export const MOYENS_PAIEMENT = {
  mobile_money: 'Mobile Money', especes: 'Espèces', virement: 'Virement bancaire', carte: 'Carte bancaire', cheque: 'Chèque',
};

// Documents affichés publiquement (jamais le numéro ni le fichier)
export const DOCUMENTS_PUBLICS = {
  rccm: 'Registre de commerce vérifié',
  piece_identite: "Pièce d'identité du responsable vérifiée",
  attestation_residence: 'Adresse vérifiée',
  certificat_conformite: 'Certificat de conformité vérifié',
};

// Questions proposées pour démarrer la FAQ du fournisseur
export const QUESTIONS_SUGGEREES = [
  "Quel est votre délai de préparation d'une commande ?",
  'Proposez-vous des échantillons ?',
  'Quels moyens de paiement acceptez-vous ?',
  "Expédiez-vous vers d'autres pays ?",
];

// Le fournisseur fabrique (ou produit) lui-même : on montre l'atelier ; sinon, d'où vient la marchandise
export const estProducteur = (type) => type === 'fabricant' || type === 'producteur';

// Statut spécial réglé par l'équipe (migration 0031) : badge et priorité d'affichage, tant qu'il n'a pas expiré
export const STATUTS_SPECIAUX = { fondateur: 'Membre fondateur', prioritaire: 'Fournisseur prioritaire' };
export function statutSpecialActif(g) {
  if (!g?.statut_special || !STATUTS_SPECIAUX[g.statut_special]) return null;
  if (g.statut_special_expiration && new Date(g.statut_special_expiration) <= new Date()) return null;
  return g.statut_special;
}
