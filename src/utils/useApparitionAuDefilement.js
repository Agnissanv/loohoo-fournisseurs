import { useEffect } from 'react';

// Les sections apparaissent en douceur quand elles entrent dans l'écran. Sans animation si la personne a réglé
// son appareil sur « moins d'animations », ou si le navigateur ne sait pas observer l'écran : tout reste visible.
export function useApparitionAuDefilement(cle) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const cibles = [...document.querySelectorAll('.section > .container, .loo-apparition')].filter((e) => !e.classList.contains('loo-visible'));
    const obs = new IntersectionObserver((entrees) => {
      entrees.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('loo-visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    cibles.forEach((e) => { e.classList.add('loo-apparition'); obs.observe(e); });
    return () => obs.disconnect();
  }, [cle]);
}
