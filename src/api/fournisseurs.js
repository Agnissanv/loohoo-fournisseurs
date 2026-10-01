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



// ---- Rôle du compte connecté (vendeur ou fournisseur) ----
export async function recupererMonRole() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { session: null, role: null };
  const [{ data: g }, { data: v }] = await Promise.all([
    supabase.from('grossiste').select('id').eq('user_id', session.user.id).maybeSingle(),
    supabase.from('vendeur').select('id, nom, telephone').eq('user_id', session.user.id).maybeSingle(),
  ]);
  if (g) return { session, role: 'fournisseur', profil: g };
  if (v) return { session, role: 'vendeur', profil: v };
  return { session, role: null, profil: null };
}

export async function recupererSessionVendeur() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from('vendeur').select('nom, telephone').eq('user_id', session.user.id).maybeSingle();
  return { session, vendeur: data };
}

// ---- Démarrer ou poursuivre une conversation (remplace l'ancien lien WhatsApp) ----
export async function demarrerConversation({ grossisteId, produitId, message, nom, telephone, activite, email, password }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const { error: erreurCompte } = await supabase.auth.signUp({ email, password });
    if (erreurCompte) throw erreurCompte;
  }
  const { data, error } = await supabase.rpc('demarrer_conversation', {
    p_grossiste_id: grossisteId, p_message: message, p_produit_id: produitId || null,
    p_nom: nom || null, p_telephone: telephone || null, p_activite: activite || null,
  });
  if (error) throw error;
  return data;
}

// ---- Conversations ----
export async function recupererMesConversations() {
  const { data, error } = await supabase
    .from('conversation')
    .select('id, derniere_activite, grossiste(id, nom), vendeur(id, nom), produit(nom), message(contenu, date_envoi, expediteur, lu)')
    .order('derniere_activite', { ascending: false });
  if (error) throw error;
  return data;
}

export async function recupererMessages(conversationId) {
  const { data, error } = await supabase
    .from('message').select('id, expediteur, contenu, date_envoi, lu')
    .eq('conversation_id', conversationId).order('date_envoi', { ascending: true });
  if (error) throw error;
  return data;
}

export async function envoyerMessage(conversationId, contenu) {
  const { error } = await supabase.from('message').insert({ conversation_id: conversationId, contenu });
  if (error) throw error;
}

export function suivreMessages(conversationId, callback) {
  const canal = supabase
    .channel(`messages-${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message', filter: `conversation_id=eq.${conversationId}` },
      (payload) => callback(payload.new))
    .subscribe();
  return () => supabase.removeChannel(canal);
}

export async function marquerMessagesLus(conversationId, role) {
  const autre = role === 'vendeur' ? 'fournisseur' : 'vendeur';
  await supabase.from('message').update({ lu: true }).eq('conversation_id', conversationId).eq('expediteur', autre).eq('lu', false);
}



// ---- Médiathèque ----
export async function recupererMedia(grossisteId) {
  const { data, error } = await supabase.from('media').select('*').eq('grossiste_id', grossisteId).order('date_ajout', { ascending: false });
  if (error) throw error;
  return data;
}

export async function ajouterMedia(grossisteId, { url, largeur, hauteur, taille_octets }, nomFichier) {
  const { error } = await supabase.from('media').insert({
    grossiste_id: grossisteId, url, largeur, hauteur, taille_octets, nom: nomFichier,
  });
  if (error) throw error;
}

export async function supprimerMedia(id) {
  const { error } = await supabase.from('media').delete().eq('id', id);
  if (error) throw error;
}

export async function modifierProduitPhoto(produitId, url) {
  const { error } = await supabase.from('produit').update({ photo_url: url }).eq('id', produitId);
  if (error) throw error;
}