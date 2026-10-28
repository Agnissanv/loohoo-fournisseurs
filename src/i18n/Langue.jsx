import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en.js';
import { definirLangueActive } from './langueActive.js';
import { titreParDefaut } from '../utils/useTitre.js';

// Le site est écrit en français ; chaque texte affiché passe par t('Texte en français').
// En anglais, t() cherche la traduction dans en.js et garde le français si elle manque encore.
// Valeurs variables : t('Bonjour {nom}', { nom }).
export const LANGUES = [
  { code: 'fr', libelle: 'FR', nom: 'Français' },
  { code: 'en', libelle: 'EN', nom: 'English' },
];
const CLE = 'loo-langue';
const CODES = LANGUES.map((l) => l.code);

function langueDeDepart() {
  try {
    const demandee = new URLSearchParams(window.location.search).get('lang');
    if (CODES.includes(demandee)) return demandee;
    const gardee = localStorage.getItem(CLE);
    if (CODES.includes(gardee)) return gardee;
  } catch { /* stockage indisponible */ }
  return (navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
}

export function traduire(langue, texte, valeurs) {
  let s = langue === 'en' ? (en[texte] ?? texte) : texte;
  if (valeurs) s = s.replace(/\{(\w+)\}/g, (m, k) => (valeurs[k] ?? m));
  return s;
}

const Contexte = createContext({ langue: 'fr', setLangue: () => {}, t: (s, v) => traduire('fr', s, v) });

export function FournisseurLangue({ children }) {
  const [langue, setLangueEtat] = useState(langueDeDepart);
  definirLangueActive(langue); // avant le rendu des enfants : prix et quantités suivent la langue

  useEffect(() => {
    document.documentElement.lang = langue;
    if (/^LOOHOO (Fournisseurs|Suppliers) — /.test(document.title)) document.title = titreParDefaut(); // titre d'accueil
    try { localStorage.setItem(CLE, langue); } catch { /* indisponible */ }
  }, [langue]);

  // Les liens vers le site officiel (autre site, autre mémoire du navigateur) emportent la langue : ?lang=en
  useEffect(() => {
    const surClic = (e) => {
      const a = e.target.closest?.('a[href]');
      if (!a) return;
      let url;
      try { url = new URL(a.href); } catch { return; }
      if (url.origin === window.location.origin || !/(^|\.)looh-oo\.com$/.test(url.hostname)) return;
      url.searchParams.set('lang', langue);
      a.href = url.toString();
    };
    document.addEventListener('click', surClic, true);
    document.addEventListener('auxclick', surClic, true);
    return () => { document.removeEventListener('click', surClic, true); document.removeEventListener('auxclick', surClic, true); };
  }, [langue]);

  const setLangue = useCallback((l) => { if (CODES.includes(l)) setLangueEtat(l); }, []);
  const t = useCallback((texte, valeurs) => traduire(langue, texte, valeurs), [langue]);
  const valeur = useMemo(() => ({ langue, setLangue, t }), [langue, setLangue, t]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export const useLangue = () => useContext(Contexte);

// Bouton FR / EN de l'en-tête
export function ChoixLangue({ className = '' }) {
  const { langue, setLangue } = useLangue();
  const autre = LANGUES.find((l) => l.code !== langue);
  return (
    <button type="button" className={`choix-langue ${className}`.trim()} onClick={() => setLangue(autre.code)}
      aria-label={langue === 'fr' ? 'Switch to English' : 'Passer en français'} title={autre.nom}>
      {autre.libelle}
    </button>
  );
}
