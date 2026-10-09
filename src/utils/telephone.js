import { FORMATS } from './pays.js';

// Indicatifs des pays LOOHOO (le plus long d'abord pour la reconnaissance)
const INDICATIFS = { CI: '225', ML: '223', SN: '221', BF: '226', BJ: '229', TG: '228', NE: '227' };

// Garde les chiffres et ajoute l'indicatif du pays : « 07 00 00 00 00 » (CI) devient 2250700000000.
// Un numéro saisi avec son indicatif (+223…, 00223…) est gardé tel quel.
export function normaliserTelephone(saisie, codePays = 'CI') {
  const brut = String(saisie || '').trim();
  const chiffres = brut.replace(/\D/g, '');
  if (brut.startsWith('+')) return chiffres;
  if (chiffres.startsWith('00')) return chiffres.slice(2);
  const indicatif = INDICATIFS[codePays] || '225';
  const longueur = FORMATS[codePays]?.longueur || 10;
  if (chiffres.length === longueur) return `${indicatif}${chiffres}`;
  return chiffres;
}

// Le numéro normalisé est-il complet (indicatif + numéro national à la bonne longueur) ?
export function telephoneComplet(numero) {
  const n = String(numero || '');
  return Object.entries(INDICATIFS).some(([code, ind]) => n.startsWith(ind) && n.length === ind.length + (FORMATS[code]?.longueur || 0));
}

// 2250700000000 devient +225 07 00 00 00 00
export function formaterTelephone(numero) {
  const n = String(numero || '').replace(/\D/g, '');
  const trouve = Object.entries(INDICATIFS).find(([code, ind]) => n.startsWith(ind) && n.length === ind.length + (FORMATS[code]?.longueur || 0));
  if (!trouve) return numero || '';
  const national = n.slice(trouve[1].length);
  // 9 chiffres (Sénégal) : 77 123 45 67 ; sinon par paires
  const groupe = national.length === 9 ? national.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4') : national.replace(/(\d{2})(?=\d)/g, '$1 ');
  return `+${trouve[1]} ${groupe}`;
}

// Téléphone enregistré d'un profil fournisseur. La base renvoie la ligne de contact soit en liste, soit en objet seul
// (un seul numéro par fournisseur) : on accepte les deux formes.
export function telephoneDuProfil(profil) {
  const contact = profil?.grossiste_contact;
  return (Array.isArray(contact) ? contact[0] : contact)?.telephone || '';
}

// Données privées du profil (téléphone, adresse, site web, réseaux) : lues dans la ligne de contact,
// avec repli sur les anciennes colonnes de la table publique tant que la migration 0007 n'a pas été exécutée.
export function contactDuProfil(profil) {
  const brut = profil?.grossiste_contact;
  const contact = (Array.isArray(brut) ? brut[0] : brut) || {};
  return {
    telephone: contact.telephone || '',
    adresse: contact.adresse ?? profil?.adresse ?? '',
    site_web: contact.site_web ?? profil?.site_web ?? '',
    reseaux_sociaux: contact.reseaux_sociaux ?? profil?.reseaux_sociaux ?? {},
    motif_statut: contact.motif_statut || '',
  };
}
