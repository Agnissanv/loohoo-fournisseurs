// Langue choisie, lisible hors des composants (prix, quantités, durées). Tenue à jour par FournisseurLangue.
let courante = 'fr';
export const langueActive = () => courante;
export function definirLangueActive(langue) { courante = langue; }
