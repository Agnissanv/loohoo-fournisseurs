import { useEffect } from 'react';

const TITRE_PAR_DEFAUT = 'LOOHOO Fournisseurs — Trouvez un fournisseur vérifié';
const DESCRIPTION_PAR_DEFAUT = "Trouvez un grossiste ou fabricant vérifié en Côte d'Ivoire, consultez son catalogue au prix de gros et demandez un devis.";

function majDescription(texte) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
  meta.content = texte;
}

// Titre et description propres à chaque page (onglet du navigateur, partage, référencement)
export function useTitre(titre, description) {
  useEffect(() => {
    if (!titre) return undefined;
    document.title = `${titre} | LOOHOO Fournisseurs`;
    if (description) majDescription(description);
    return () => { document.title = TITRE_PAR_DEFAUT; majDescription(DESCRIPTION_PAR_DEFAUT); };
  }, [titre, description]);
}
