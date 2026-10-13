// Affichage des prix et des quantités, écrit de la même façon partout : « 7 000 F CFA », « 13 pièces ».

export const prixCFA = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F CFA`;

// Prix le plus bas d'un produit : celui du dernier palier s'il y en a, sinon le prix de gros
export function prixMin(p) {
  if (p.prix_min != null) return Number(p.prix_min);
  const paliers = Array.isArray(p.paliers) ? p.paliers : [];
  return paliers.length ? Math.min(Number(p.prix_gros_fcfa), ...paliers.map((x) => Number(x.prix))) : Number(p.prix_gros_fcfa);
}

// « 6 000 à 7 000 F CFA » s'il y a des paliers, sinon « 7 000 F CFA »
export function fourchettePrix(p) {
  const bas = prixMin(p);
  const haut = Number(p.prix_gros_fcfa);
  return bas < haut ? `${bas.toLocaleString('fr-FR')} à ${prixCFA(haut)}` : prixCFA(haut);
}

const INVARIABLES = ['kg', 'g', 'l', 'ml', 'm'];

// « 1 pièce », « 13 pièces », « 5 kg »
export function quantite(n, unite = 'pièce') {
  const u = unite || 'pièce';
  const nombre = Number(n) || 0;
  const accord = nombre > 1 && !INVARIABLES.includes(u.toLowerCase()) && !/s$|x$/.test(u) ? `${u}s` : u;
  return `${nombre.toLocaleString('fr-FR')} ${accord}`;
}

// Produit ajouté il y a moins de 30 jours
export const estNouveau = (date) => !!date && Date.now() - new Date(date).getTime() < 30 * 86400000;
