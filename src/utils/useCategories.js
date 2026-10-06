import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { CATEGORIES, SOUS_CATEGORIES } from '../data/categories.js';

// Catégories gérées depuis l'administration (migration 0013). Tant qu'elles ne sont pas en base, ou si la lecture échoue,
// on utilise la liste intégrée au site : les formulaires fonctionnent toujours.
let cache = null;
let promesse = null;

function charger() {
  if (!promesse) {
    promesse = supabase
      .from('categorie')
      .select('nom, ordre, sous_categorie(nom, ordre)')
      .eq('active', true)
      .order('ordre')
      .then(({ data, error }) => {
        if (error || !data?.length) return null;
        return {
          categories: data.map((c) => c.nom),
          sous: Object.fromEntries(data.map((c) => [c.nom, [...(c.sous_categorie || [])].sort((a, b) => a.ordre - b.ordre).map((s) => s.nom)])),
        };
      })
      .catch(() => null)
      .then((resultat) => { cache = resultat; return resultat; });
  }
  return promesse;
}

export function useCategories() {
  const [donnees, setDonnees] = useState(cache);
  useEffect(() => {
    if (!cache) charger().then((r) => { if (r) setDonnees(r); });
  }, []);
  return donnees || { categories: CATEGORIES, sous: SOUS_CATEGORIES };
}
