import React from 'react';
import { useCategories } from '../utils/useCategories.js';

// Liste fermée de catégories. Si la valeur actuelle est une ancienne saisie libre, elle reste sélectionnable.
export default function SelectCategorie({ valeurActuelle = '', vide = 'Choisir une catégorie', ...props }) {
  const { categories } = useCategories();
  const options = valeurActuelle && !categories.includes(valeurActuelle) ? [valeurActuelle, ...categories] : categories;
  return (
    <select className="champ" {...props}>
      <option value="">{vide}</option>
      {options.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}
