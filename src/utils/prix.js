// Affichage des prix et des quantités, écrit de la même façon partout : « 7 000 F CFA », « 13 pièces ».
// En anglais : « 7,000 F CFA », « 13 pieces ».
import { langueActive } from '../i18n/langueActive.js';

const anglais = () => langueActive() === 'en';
export const nombre = (n) => (Number(n) || 0).toLocaleString(anglais() ? 'en-US' : 'fr-FR');
export const prixCFA = (n) => `${nombre(Math.round(Number(n) || 0))} F CFA`;

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
  return bas < haut ? `${nombre(bas)} ${anglais() ? 'to' : 'à'} ${prixCFA(haut)}` : prixCFA(haut);
}

const INVARIABLES = ['kg', 'g', 'l', 'ml', 'm'];
const UNITES_EN = {
  pièce: ['piece', 'pieces'], carton: ['carton', 'cartons'], litre: ['litre', 'litres'], sac: ['bag', 'bags'],
  rouleau: ['roll', 'rolls'], paquet: ['pack', 'packs'], mètre: ['metre', 'metres'], lot: ['lot', 'lots'],
};

// « pièce » ou « pièces » selon le nombre (kg, l, m restent invariables)
export function uniteAccordee(n, unite = 'pièce') {
  const u = unite || 'pièce';
  const en = anglais() && UNITES_EN[u.toLowerCase()];
  if (en) return Number(n) <= 1 ? en[0] : en[1];
  if (Number(n) <= 1 || INVARIABLES.includes(u.toLowerCase()) || /[sx]$/.test(u)) return u;
  return /(eau|eu)$/.test(u) ? `${u}x` : `${u}s`;
}

// « 1 pièce », « 13 pièces », « 5 kg »
export function quantite(n, unite = 'pièce') {
  return `${nombre(n)} ${uniteAccordee(Number(n) || 0, unite)}`;
}

// Nom de l'unité seule (« pièce », « piece »), pour « 7 000 F CFA / pièce »
export const nomUnite = (unite) => uniteAccordee(1, unite);

// Produit ajouté il y a moins de 30 jours
export const estNouveau = (date) => !!date && Date.now() - new Date(date).getTime() < 30 * 86400000;
