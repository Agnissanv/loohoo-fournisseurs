import { useEffect } from 'react';

// Affiche « (3) » devant le titre de l'onglet tant qu'il y a des messages non lus, même quand la page change de titre
export function useTitreNonLus(nonLus) {
  useEffect(() => {
    const balise = document.querySelector('title');
    if (!balise) return undefined;
    const nettoye = (t) => t.replace(/^\(\d+\) /, '');
    let enCours = false;
    const appliquer = () => {
      if (enCours) return;
      enCours = true;
      const base = nettoye(document.title);
      document.title = nonLus > 0 ? `(${nonLus}) ${base}` : base;
      enCours = false;
    };
    appliquer();
    const obs = new MutationObserver(appliquer);
    obs.observe(balise, { childList: true, characterData: true, subtree: true });
    return () => { obs.disconnect(); document.title = nettoye(document.title); };
  }, [nonLus]);
}
