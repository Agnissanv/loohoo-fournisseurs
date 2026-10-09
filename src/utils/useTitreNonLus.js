import { useEffect } from 'react';

// Affiche « (3) » devant le titre de l'onglet tant qu'il y a des messages non lus, même quand la page change de titre.
// Important : on ne touche au titre que s'il doit vraiment changer. Réécrire le même titre déclenche l'observateur
// (surtout dans Firefox), qui le réécrit à son tour : une boucle sans fin qui gèle la page.
export function useTitreNonLus(nonLus) {
  useEffect(() => {
    const balise = document.querySelector('title');
    if (!balise) return undefined;
    const nettoye = (t) => t.replace(/^\(\d+\) /, '');
    const appliquer = () => {
      const base = nettoye(document.title);
      const voulu = nonLus > 0 ? `(${nonLus}) ${base}` : base;
      if (document.title !== voulu) document.title = voulu;
    };
    appliquer();
    const obs = new MutationObserver(appliquer);
    obs.observe(balise, { childList: true, characterData: true, subtree: true });
    return () => {
      obs.disconnect();
      const propre = nettoye(document.title);
      if (document.title !== propre) document.title = propre;
    };
  }, [nonLus]);
}
