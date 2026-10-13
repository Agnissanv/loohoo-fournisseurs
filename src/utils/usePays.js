import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { PAYS_PAR_DEFAUT } from './pays.js';

// Liste des pays LOOHOO (ouverts et à venir), lue une fois dans la base puis gardée en mémoire.
let cache = null;
let promesse = null;

export function chargerPays() {
  if (cache) return Promise.resolve(cache);
  if (!promesse) {
    // visible (migration 0025) lu en premier, avec repli tant que la migration n'est pas exécutée
    promesse = supabase.from('pays_loohoo').select('code, nom, dans, indicatif, devise, actif, visible, ordre').order('ordre')
      .then((r) => (r.error ? supabase.from('pays_loohoo').select('code, nom, dans, indicatif, devise, actif, ordre').order('ordre') : r))
      .then(({ data, error }) => {
        cache = !error && data?.length ? data.filter((p) => p.visible !== false) : PAYS_PAR_DEFAUT;
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
