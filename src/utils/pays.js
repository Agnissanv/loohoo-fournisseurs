// Pays LOOHOO : la liste (et l'ouverture de chaque pays) vit dans la base (table pays_loohoo, migration 0024).
// Ce fichier garde ce qui sert à l'affichage et à la saisie : drapeau, format des numéros, villes principales.

export const PAYS_PAR_DEFAUT = [
  { code: 'CI', nom: "Côte d'Ivoire", dans: "en Côte d'Ivoire", indicatif: '225', devise: 'XOF', actif: true, ordre: 1 },
];

// Longueur du numéro national, exemple affiché dans le champ, grandes villes proposées à la saisie
export const FORMATS = {
  CI: { longueur: 10, exemple: '07 00 00 00 00', villes: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo', 'Man', 'Gagnoa', 'Abengourou', 'Divo'] },
  ML: { longueur: 8, exemple: '70 00 00 00', villes: ['Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Kayes', 'Koutiala', 'Gao', 'Tombouctou'] },
  SN: { longueur: 9, exemple: '77 000 00 00', villes: ['Dakar', 'Touba', 'Thiès', 'Kaolack', 'Saint-Louis', 'Ziguinchor', 'Mbour', 'Rufisque'] },
  BF: { longueur: 8, exemple: '70 00 00 00', villes: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya', 'Kaya'] },
  BJ: { longueur: 10, exemple: '01 97 00 00 00', villes: ['Cotonou', 'Porto-Novo', 'Abomey-Calavi', 'Parakou', 'Bohicon', 'Djougou', 'Natitingou'] },
  TG: { longueur: 8, exemple: '90 00 00 00', villes: ['Lomé', 'Sokodé', 'Kara', 'Atakpamé', 'Kpalimé', 'Tsévié'] },
  NE: { longueur: 8, exemple: '90 00 00 00', villes: ['Niamey', 'Zinder', 'Maradi', 'Tahoua', 'Agadez', 'Dosso'] },
};

const NOMS = {
  CI: "Côte d'Ivoire", ML: 'Mali', SN: 'Sénégal', BF: 'Burkina Faso', BJ: 'Bénin', TG: 'Togo', NE: 'Niger',
  GN: 'Guinée', GH: 'Ghana', NG: 'Nigeria', CM: 'Cameroun', GA: 'Gabon', CG: 'Congo', CD: 'RD Congo', MA: 'Maroc',
  TN: 'Tunisie', DZ: 'Algérie', MR: 'Mauritanie', LR: 'Liberia', SL: 'Sierra Leone', TD: 'Tchad', CN: 'Chine', FR: 'France',
};

const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/’/g, "'");

export const drapeau = (code) => String.fromCodePoint(...[...String(code).toUpperCase()].map((c) => 0x1F1A5 + c.charCodeAt(0)));

// Accepte un code (CI) ou un nom (Côte d'Ivoire). Renvoie { code, nom, drapeau } ou null si inconnu.
export function infosPays(valeur) {
  if (!valeur) return null;
  const v = sansAccent(valeur);
  const trouve = Object.entries(NOMS).find(([code, nom]) => v === code.toLowerCase() || v === sansAccent(nom) || (code === 'CI' && (v === 'cote d ivoire' || v === 'ivory coast')));
  return trouve ? { code: trouve[0], nom: trouve[1], drapeau: drapeau(trouve[0]) } : null;
}
