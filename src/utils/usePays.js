import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { PAYS_PAR_DEFAUT } from './pays.js';

// Liste des pays LOOHOO (ouverts et à venir), lue une fois dans la base puis gardée en mémoire.
let cache = null;
let promesse = null;

export function chargerPays() {
  if (cache) return Promise.resolve(cache);
  if (!promesse) {
    promesse = supabase.from('pays_loohoo').select('code, nom, dans, indicatif, devise, actif, ordre').order('ordre')
      .then(({ data, error }) => {
        cache = !error && data?.length ? data : PAYS_PAR_DEFAUT;
        return cache;
      })
      .catch(() => { cache = PAYS_PAR_DEFAUT; return cache; });
  }
  return promesse;
}

// { tous, ouverts, parCode }
export function usePays() {
  const [liste, setListe] = useState(cache || PAYS_PAR_DEFAUT);
  useEffect(() => { chargerPays().then(setListe); }, []);
  return {
    tous: liste,
    ouverts: liste.filter((p) => p.actif),
    parCode: Object.fromEntries(liste.map((p) => [p.code, p])),
  };
}
