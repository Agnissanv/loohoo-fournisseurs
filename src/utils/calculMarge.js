// Calculateur de marge : du prix d'achat au prix de vente conseillé. Calcul fait dans le navigateur, rien n'est enregistré.
//
//  coût de revient d'une pièce = prix d'achat + (dépenses totales ÷ quantité achetée)
//  prix de vente conseillé     = coût de revient + bénéfice voulu (en % du coût de revient, ou en montant fixe par pièce)
// Le prix est arrondi aux 25 F CFA supérieurs : un prix lisible en caisse, et la marge ne descend jamais sous l'objectif.

const nombre = (v) => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

export function calculerPrixVente({ prixAchat, quantite = 1, depenses = [], mode = 'pourcent', marge }) {
  const achat = nombre(prixAchat);
  const qte = Math.max(1, Math.floor(nombre(quantite)) || 1);
  const cible = nombre(marge);
  if (!(achat > 0) || !(cible >= 0)) return null;

  const totalDepenses = depenses.reduce((n, d) => n + (nombre(d.montant) > 0 ? nombre(d.montant) : 0), 0);
  const cout = achat + totalDepenses / qte;
  const benefice = mode === 'montant' ? cible : (cout * cible) / 100;
  const prixExact = cout + benefice;
  const prix = Math.ceil(prixExact / 25) * 25;
  const beneficeReel = prix - cout;
  return {
    quantite: qte,
    totalDepenses,
    cout,
    prix,
    beneficeUnitaire: beneficeReel,
    margeSurCout: (beneficeReel / cout) * 100,
    margeSurVente: (beneficeReel / prix) * 100,
    beneficeTotal: beneficeReel * qte,
    chiffreAffaires: prix * qte,
  };
}
