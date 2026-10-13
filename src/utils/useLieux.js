import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { FORMATS } from './pays.js';

// Villes et communes en listes fermées (table lieu, migration 0026), lues une fois puis gardées en mémoire.
// Repli sur les grandes villes connues du site tant que la migration n'est pas exécutée.
let cache = null;
let promesse = null;

function charger() {
  if (cache) return Promise.resolve(cache);
  if (!promesse) {
    promesse = supabase.from('lieu').select('pays_code, ville, commune, ordre').order('ordre')
      .then(({ data, error }) => {
        cache = !error && data?.length
          ? data
          : Object.entries(FORMATS).flatMap(([code, f]) => f.villes.map((ville, i) => ({ pays_code: code, ville, commune: null, ordre: i })));
        return cache;
      })
      .catch(() => { cache = []; return cache; });
  }
  return promesse;
}

export function useLieux() {
  const [lieux, setLieux] = useState(cache || []);
  useEffect(() => { charger().then(setLieux); }, []);
  const villes = (pays) => [...new Set(lieux.filter((l) => !l.commune && (!pays || l.pays_code === pays)).map((l) => l.ville))];
  const communes = (pays, ville) => (ville ? lieux.filter((l) => l.commune && l.ville === ville && (!pays || l.pays_code === pays)).map((l) => l.commune) : []);
  return { villes, communes };
}
