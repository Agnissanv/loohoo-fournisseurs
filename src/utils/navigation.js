// Adresse de retour acceptée seulement si elle reste dans le site (jamais de lien externe)
export function retourSur(retour) {
  return typeof retour === 'string' && retour.startsWith('/') && !retour.startsWith('//') ? retour : null;
}
