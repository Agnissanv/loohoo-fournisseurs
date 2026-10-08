// Petits calculs d'affichage pour l'espace fournisseur : rien n'est stocké, tout est recalculé à l'affichage.

// « 3 jours » sous un mois, « 5 mois » sous un an, « 2 ans » au-delà
export function anciennete(dateIso) {
  if (!dateIso) return null;
  const debut = new Date(dateIso);
  if (Number.isNaN(debut.getTime())) return null;
  const jours = Math.max(0, Math.floor((Date.now() - debut.getTime()) / 86400000));
  if (jours < 30) return jours <= 1 ? `${jours} jour` : `${jours} jours`;
  const mois = Math.floor(jours / 30.4375);
  if (mois < 12) return `${mois} mois`;
  const ans = Math.floor(mois / 12);
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
