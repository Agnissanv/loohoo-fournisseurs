import { supabase } from '../supabaseClient.js';

// Liste filtrée (le téléphone n'est jamais renvoyé, il n'existe pas dans ces tables publiques)
export async function rechercherGrossistes({ q = '', categorie = '', ville = '' } = {}) {
  const { data, error } = await supabase.rpc('rechercher_grossistes', {
    p_q: q.trim() || null,
    p_categorie: categorie || null,
    p_ville: ville || null,
  });
  if (error) throw error;
  return data;
}

// Valeurs des deux listes déroulantes, déduites des grossistes publiés
export async function recupererFiltres() {
  const { data, error } = await supabase.from('grossiste').select('categorie, ville');
  if (error) throw error;
  const uniques = (cle) =>
    [...new Set(data.map((ligne) => ligne[cle]))].sort((a, b) => a.localeCompare(b, 'fr'));
  return { categories: uniques('categorie'), villes: uniques('ville') };
}