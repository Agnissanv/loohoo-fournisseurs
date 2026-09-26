import { supabase } from '../supabaseClient.js';

// Liste filtrée (le téléphone n'est jamais renvoyé, il n'existe pas dans ces tables publiques)
export async function rechercherGrossistes({ q = '', categorie = '', ville = '', commune = '' } = {}) {
  const { data, error } = await supabase.rpc('rechercher_grossistes', {
    p_q: q.trim() || null,
    p_categorie: categorie || null,
    p_ville: ville || null,
    p_commune: commune || null,
  });
  if (error) throw error;
  return data;
}

// Valeurs des listes déroulantes, déduites des grossistes publiés
export async function recupererFiltres() {
  const { data, error } = await supabase.from('grossiste').select('categorie, ville, commune');
  if (error) throw error;
  const uniques = (cle) =>
    [...new Set(data.map((ligne) => ligne[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  return { categories: uniques('categorie'), villes: uniques('ville'), communes: uniques('commune') };
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


// ---- Compte fournisseur ----
export async function inscrireFournisseur({ email, password, nom, categorie, ville, commune, telephone, estFabricant }) {
  const { error: erreurCompte } = await supabase.auth.signUp({ email, password });
  if (erreurCompte) throw erreurCompte;

  const { error: erreurProfil } = await supabase.rpc('creer_profil_fournisseur', {
    p_nom: nom, p_categorie: categorie, p_ville: ville, p_commune: commune || null,
    p_telephone: telephone, p_est_fabricant: !!estFabricant,
  });
  if (erreurProfil) throw erreurProfil;
}

export async function connecterFournisseur(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function deconnecterFournisseur() {
  await supabase.auth.signOut();
}

// callback(session | null). Renvoie une fonction pour se désabonner.
export function suivreSession(callback) {
  supabase.auth.getSession().then(({ data }) => callback(data.session));
  const { data: abonnement } = supabase.auth.onAuthStateChange((_evt, session) => callback(session));
  return () => abonnement.subscription.unsubscribe();
}

export async function recupererMonProfil(userId) {
  const { data, error } = await supabase
    .from('grossiste')
    .select('*, grossiste_contact(telephone), grossiste_photo(id, url, ordre), produit(*)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function mettreAJourProfil(id, champs) {
  const { error } = await supabase.from('grossiste').update(champs).eq('id', id);
  if (error) throw error;
}

export async function ajouterProduit(grossisteId, produit) {
  const { error } = await supabase.from('produit').insert({ grossiste_id: grossisteId, ...produit });
  if (error) throw error;
}

export async function supprimerProduit(id) {
  const { error } = await supabase.from('produit').delete().eq('id', id);
  if (error) throw error;
}