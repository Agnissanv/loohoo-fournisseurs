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



// Profil complet d'un grossiste publié (photos + catalogue). Renvoie null s'il n'existe pas ou n'est pas publié.
export async function recupererGrossiste(id) {
  const { data, error } = await supabase
    .from('grossiste')
    .select('*, grossiste_photo(url, ordre), produit(id, nom, description, poids_grammes, prix_gros_fcfa, moq, photo_url, date_ajout)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    photos: [...data.grossiste_photo].sort((a, b) => a.ordre - b.ordre).map((p) => p.url),
    produits: [...data.produit].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  };
}

// Enregistre le vendeur + la mise en relation et renvoie le lien WhatsApp déjà construit par la base
export async function contacterGrossiste({ nom, telephone, email, activite, grossisteId, produitId = null }) {
  const { data, error } = await supabase.rpc('contacter_grossiste', {
    p_nom: nom,
    p_telephone: telephone,
    p_email: email,
    p_activite: activite || null,
    p_grossiste_id: grossisteId,
    p_produit_id: produitId,
  });
  if (error) throw error;
  return data;
}