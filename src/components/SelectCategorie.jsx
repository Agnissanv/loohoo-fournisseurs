import React from 'react';
import { CATEGORIES } from '../data/categories.js';

// Liste fermée de catégories. Si la valeur actuelle est une ancienne saisie libre, elle reste sélectionnable.
export default function SelectCategorie({ valeurActuelle = '', vide = 'Choisir une catégorie', ...props }) {
  const options = valeurActuelle && !CATEGORIES.includes(valeurActuelle) ? [valeurActuelle, ...CATEGORIES] : CATEGORIES;
  return (
    <select className="champ" {...props}>
      <option value="">{vide}</option>
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
