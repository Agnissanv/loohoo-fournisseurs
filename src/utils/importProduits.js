// Import de produits depuis un fichier CSV (Excel : « Enregistrer sous » > CSV). Tout est vérifié dans le navigateur
// avant l'envoi : le fournisseur voit ligne par ligne ce qui sera importé et ce qui doit être corrigé.

export const COLONNES = ['nom', 'categorie', 'sous_categorie', 'description', 'prix_gros_fcfa', 'moq', 'unite', 'stock', 'mots_cles'];
export const UNITES = ['pièce', 'carton', 'kg', 'litre', 'sac', 'rouleau', 'paquet', 'mètre', 'lot'];
export const MAX_LIGNES = 200;

// Modèle téléchargeable : séparateur « ; » et BOM UTF-8, pour que l'Excel français l'ouvre sans abîmer les accents
export function modeleCsv(categorie = '') {
  const lignes = [
    COLONNES.join(';'),
    `Pagne wax 6 yards;${categorie};;Pagne 100 % coton, motifs variés;5000;10;pièce;300;pagne, wax`,
  ];
  return '﻿' + lignes.join('\r\n') + '\r\n';
}

// Lecture CSV simple : guillemets, séparateur « ; » ou « , » ou tabulation (détecté sur la 1re ligne)
export function lireCsv(texte) {
  const brut = texte.replace(/^﻿/, '');
  const premiere = brut.split(/\r?\n/, 1)[0] || '';
  const sep = [';', '\t', ','].map((s) => [s, premiere.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const lignes = [];
  let ligne = [];
  let champ = '';
  let guillemets = false;
  for (let i = 0; i < brut.length; i += 1) {
    const c = brut[i];
    if (guillemets) {
      if (c === '"' && brut[i + 1] === '"') { champ += '"'; i += 1; } else if (c === '"') guillemets = false; else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && brut[i + 1] === '\n') i += 1;
      ligne.push(champ); champ = '';
      if (ligne.some((x) => x.trim() !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  ligne.push(champ);
  if (ligne.some((x) => x.trim() !== '')) lignes.push(ligne);
  return lignes;
}

const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
const entier = (v) => (/^\d+$/.test(String(v).replace(/[\s ]/g, '')) ? Number(String(v).replace(/[\s ]/g, '')) : null);

// Renvoie { lignes: [{ numero, produit | null, erreurs: [] }], erreurGlobale }
export function validerCsv(texte, categories, sousCategories) {
  const donnees = lireCsv(texte);
  if (donnees.length < 2) return { lignes: [], erreurGlobale: 'Le fichier ne contient aucune ligne de produit.' };
  const entete = donnees[0].map(sansAccent);
  const manquantes = ['nom', 'prix_gros_fcfa'].filter((c) => !entete.includes(c));
  if (manquantes.length) return { lignes: [], erreurGlobale: `Colonne obligatoire absente : ${manquantes.join(', ')}. Utilisez le modèle à télécharger.` };
  if (donnees.length - 1 > MAX_LIGNES) return { lignes: [], erreurGlobale: `Maximum ${MAX_LIGNES} produits par fichier. Découpez-le en plusieurs fichiers.` };

  const col = (ligne, nom) => { const i = entete.indexOf(nom); return i >= 0 ? (ligne[i] || '').trim() : ''; };
  const categorieDe = (v) => categories.find((c) => sansAccent(c) === sansAccent(v));

  const lignes = donnees.slice(1).map((l, idx) => {
    const erreurs = [];
    const nom = col(l, 'nom');
    if (!nom) erreurs.push('Nom manquant');
    const prix = entier(col(l, 'prix_gros_fcfa'));
    if (prix === null) erreurs.push('Prix de gros : nombre entier attendu (ex. 5000)');
    const moqBrut = col(l, 'moq');
    const moq = moqBrut === '' ? 1 : entier(moqBrut);
    if (moq === null || moq < 1) erreurs.push('Quantité minimale : nombre entier d\'au moins 1');
    const catBrute = col(l, 'categorie');
    const categorie = catBrute ? categorieDe(catBrute) : null;
    if (catBrute && !categorie) erreurs.push(`Catégorie inconnue « ${catBrute} »`);
    const sousBrute = col(l, 'sous_categorie');
    let sous = null;
    if (sousBrute) {
      sous = categorie ? (sousCategories[categorie] || []).find((s) => sansAccent(s) === sansAccent(sousBrute)) : null;
      if (!sous) erreurs.push(`Sous-catégorie inconnue « ${sousBrute} »`);
    }
    const uniteBrute = col(l, 'unite');
    const unite = uniteBrute ? UNITES.find((u) => sansAccent(u) === sansAccent(uniteBrute)) : null;
    if (uniteBrute && !unite) erreurs.push(`Unité inconnue « ${uniteBrute} » (${UNITES.join(', ')})`);
    const stockBrut = col(l, 'stock');
    const stock = stockBrut === '' ? null : entier(stockBrut);
    if (stockBrut !== '' && stock === null) erreurs.push('Stock : nombre entier attendu');

    const produit = erreurs.length ? null : {
      nom,
      categorie: categorie || null,
      sous_categorie: sous,
      description: col(l, 'description') || null,
      prix_gros_fcfa: prix,
      moq,
      unite,
      stock_disponible: stock,
      tags: col(l, 'mots_cles').split(/[,|]/).map((t) => t.trim()).filter(Boolean).slice(0, 10),
    };
    return { numero: idx + 2, nom, produit, erreurs };
  });
  return { lignes, erreurGlobale: '' };
}
