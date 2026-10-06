// Garde les chiffres uniquement ; « 07 00 00 00 00 » devient 2250700000000
export function normaliserTelephone(saisie) {
  const chiffres = String(saisie || '').replace(/\D/g, '').replace(/^00/, '');
  if (chiffres.length === 10) return `225${chiffres}`;
  return chiffres;
}

// 2250700000000 devient +225 07 00 00 00 00
export function formaterTelephone(numero) {
  const n = String(numero || '').replace(/\D/g, '');
  if (n.length === 13 && n.startsWith('225')) return `+225 ${n.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  return numero || '';
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
  };
}
