// Pays d'un fournisseur : accepte un code (CI) ou un nom (Côte d'Ivoire). Renvoie { nom, drapeau } ou null si inconnu.
const PAYS = [
  ['CI', "Côte d'Ivoire"], ['ML', 'Mali'], ['SN', 'Sénégal'], ['BF', 'Burkina Faso'], ['BJ', 'Bénin'], ['TG', 'Togo'],
  ['GN', 'Guinée'], ['NE', 'Niger'], ['GH', 'Ghana'], ['NG', 'Nigeria'], ['CM', 'Cameroun'], ['GA', 'Gabon'],
  ['CG', 'Congo'], ['CD', 'RD Congo'], ['MA', 'Maroc'], ['TN', 'Tunisie'], ['DZ', 'Algérie'], ['MR', 'Mauritanie'],
  ['LR', 'Liberia'], ['SL', 'Sierra Leone'], ['TD', 'Tchad'], ['CN', 'Chine'], ['FR', 'France'],
];

const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/’/g, "'");

const drapeau = (code) => String.fromCodePoint(...[...code].map((c) => 0x1F1A5 + c.charCodeAt(0)));

export function infosPays(valeur) {
  if (!valeur) return null;
  const v = sansAccent(valeur);
  const trouve = PAYS.find(([code, nom]) => v === code.toLowerCase() || v === sansAccent(nom) || (v === 'cote d ivoire' && code === 'CI') || (v === 'ivory coast' && code === 'CI'));
  return trouve ? { nom: trouve[1], drapeau: drapeau(trouve[0]) } : null;
}
