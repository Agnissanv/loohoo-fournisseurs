import { useEffect } from 'react';
import { langueActive } from '../i18n/langueActive.js';

const anglais = () => langueActive() === 'en';
export const titreParDefaut = () => (anglais() ? 'LOOHOO Suppliers — Find a verified supplier' : 'LOOHOO Fournisseurs — Trouvez un fournisseur vérifié');
const descriptionParDefaut = () => (anglais()
  ? "Find a verified wholesaler or manufacturer in Côte d'Ivoire, browse their catalogue at wholesale prices and ask for a quote."
  : "Trouvez un grossiste ou fabricant vérifié en Côte d'Ivoire, consultez son catalogue au prix de gros et demandez un devis.");

function majDescription(texte) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
  meta.content = texte;
}

// Titre et description propres à chaque page (onglet du navigateur, partage, référencement)
export function useTitre(titre, description) {
  useEffect(() => {
    if (!titre) return undefined;
    document.title = `${titre} | ${anglais() ? 'LOOHOO Suppliers' : 'LOOHOO Fournisseurs'}`;
    if (description) majDescription(description);
    return () => { document.title = titreParDefaut(); majDescription(descriptionParDefaut()); };
  }, [titre, description]);
}
