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
    .select('id, nom, categorie, ville, commune, pays, origine, est_fabricant, badge_verifie, statut, horaires_ouverture, grossiste_photo(url, ordre), produit(id, nom, description, poids_grammes, prix_gros_fcfa, moq, photo_url, date_ajout)')
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
const CLE_INSCRIPTION_EN_ATTENTE = 'loohoo_inscription_fournisseur';

async function creerProfilFournisseur({ nom, categorie, ville, commune, telephone, estFabricant, origine, stockConfirme }) {
  const { error } = await supabase.rpc('creer_profil_fournisseur', {
    p_nom: nom, p_categorie: categorie, p_ville: ville, p_commune: commune || null,
    p_telephone: telephone, p_est_fabricant: !!estFabricant,
  });
  if (error) throw error;
  // Champs que la fonction SQL ne prend pas encore en paramètre : mise à jour séparée, non bloquante
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.from('grossiste')
      .update({ origine: origine || 'local', stock_confirme: !!stockConfirme })
      .eq('user_id', session.user.id);
  }
}

// Renvoie { confirmationRequise } : si Supabase exige la confirmation de l'e-mail, il n'y a pas encore de session
// et le profil ne peut pas être créé. On garde les infos sur l'appareil et on les envoie à la première connexion.
export async function inscrireFournisseur({ email, password, ...profil }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) {
    try { localStorage.setItem(CLE_INSCRIPTION_EN_ATTENTE, JSON.stringify(profil)); } catch { /* stockage indisponible */ }
    return { confirmationRequise: true };
  }
  await creerProfilFournisseur(profil);
  return { confirmationRequise: false };
}

// À appeler quand un compte connecté n'a pas encore de profil fournisseur. Renvoie true si un profil a été créé.
export async function finaliserInscriptionEnAttente() {
  let brut = null;
  try { brut = localStorage.getItem(CLE_INSCRIPTION_EN_ATTENTE); } catch { /* stockage indisponible */ }
  if (!brut) return false;
  await creerProfilFournisseur(JSON.parse(brut));
  try { localStorage.removeItem(CLE_INSCRIPTION_EN_ATTENTE); } catch { /* ignoré */ }
  return true;
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

// Renvoie l'id du produit créé (pour y rattacher ses photos)
export async function ajouterProduit(grossisteId, produit) {
  const { data, error } = await supabase.from('produit').insert({ grossiste_id: grossisteId, ...produit }).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function modifierProduit(id, champs) {
  const { error } = await supabase.from('produit').update(champs).eq('id', id);
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
    supabase.from('grossiste').select('id, nom').eq('user_id', session.user.id).maybeSingle(),
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

// Renvoie le message créé (id, expediteur, contenu, date_envoi, lu) pour l'afficher sans attendre Realtime
export async function envoyerMessage(conversationId, contenu) {
  const { data, error } = await supabase
    .from('message').insert({ conversation_id: conversationId, contenu })
    .select('id, expediteur, contenu, date_envoi, lu').single();
  if (error) throw error;
  return data;
}

// En-tête d'une conversation : qui parle à qui, à propos de quel produit
export async function recupererConversation(id) {
  const requete = (colonnesVendeur) => supabase
    .from('conversation')
    .select(`id, grossiste(id, nom), vendeur(${colonnesVendeur}), produit(id, nom)`)
    .eq('id', id).maybeSingle();
  let { data, error } = await requete('id, nom, activite');
  if (error) ({ data, error } = await requete('id, nom'));
  if (error) throw error;
  return data;
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


// ---- Profil complet (vue privée du fournisseur) ----
export async function mettreAJourProfilComplet(id, champs) {
  const { error } = await supabase.from('grossiste').update(champs).eq('id', id);
  if (error) throw error;
}

// ---- Documents administratifs ----
export async function recupererDocuments(grossisteId) {
  const { data, error } = await supabase.from('document_fournisseur').select('*').eq('grossiste_id', grossisteId).order('date_ajout', { ascending: false });
  if (error) throw error;
  return data;
}

export async function televerserDocument(grossisteId, type, fichier) {
  if (!['image/jpeg', 'image/png', 'application/pdf'].includes(fichier.type)) {
    throw new Error('Formats acceptés : JPG, PNG, PDF');
  }
  if (fichier.size > 10 * 1024 * 1024) throw new Error('Fichier trop volumineux (10 Mo max)');

  const chemin = `${grossisteId}/${Date.now().toString(36)}-${fichier.name}`;
  const { error: erreurUpload } = await supabase.storage.from('documents').upload(chemin, fichier);
  if (erreurUpload) throw erreurUpload;

  const { error } = await supabase.from('document_fournisseur').insert({
    grossiste_id: grossisteId, type, chemin, nom_fichier: fichier.name,
  });
  if (error) throw error;
}

export async function supprimerDocument(id, chemin) {
  await supabase.storage.from('documents').remove([chemin]);
  const { error } = await supabase.from('document_fournisseur').delete().eq('id', id);
  if (error) throw error;
}

export async function obtenirLienDocument(chemin) {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(chemin, 300); // valable 5 minutes
  if (error) throw error;
  return data.signedUrl;
}


export async function capturerLead(email, recherche) {
  const { error } = await supabase.rpc('capturer_lead', { p_email: email, p_recherche: recherche || null });
  if (error) throw error;
}

export async function incrementerVueProfil(id) {
  await supabase.rpc('incrementer_vue_profil', { p_id: id }).catch(() => {}); // jamais bloquant
}

export async function recupererMesStats() {
  const { data, error } = await supabase.rpc('stats_mon_profil');
  if (error) throw error;
  return data;
}


export async function compterMessagesNonLus(role) {
  const autre = role === 'vendeur' ? 'fournisseur' : 'vendeur';
  const { count, error } = await supabase
    .from('message')
    .select('id', { count: 'exact', head: true })
    .eq('expediteur', autre)
    .eq('lu', false);
  if (error) return 0;
  return count || 0;
}


// ---- Téléphone et photos du profil (celles qui bloquent la publication) ----
export async function mettreAJourTelephone(grossisteId, telephone) {
  const { error } = await supabase.from('grossiste_contact').upsert({ grossiste_id: grossisteId, telephone }, { onConflict: 'grossiste_id' });
  if (error) throw error;
}

export async function ajouterPhotoProfil(grossisteId, url, ordre) {
  const { error } = await supabase.from('grossiste_photo').insert({ grossiste_id: grossisteId, url, ordre });
  if (error) throw error;
}

export async function supprimerPhotoProfil(id) {
  const { error } = await supabase.from('grossiste_photo').delete().eq('id', id);
  if (error) throw error;
}


// ---- Recherche de produits (nouvelle page d'accueil de l'annuaire) ----
export async function rechercherProduits({ q = '', categorie = '', ville = '', commune = '' } = {}) {
  const { data, error } = await supabase.rpc('rechercher_produits', {
    p_q: q.trim() || null, p_categorie: categorie || null, p_ville: ville || null, p_commune: commune || null,
  });
  if (error) throw error;
  return data;
}

// Fiche produit publique complète (galerie, vidéo, infos du fournisseur)
export async function recupererProduitPublic(id) {
  const { data, error } = await supabase
    .from('produit')
    .select(`
      id, nom, description, tags, categorie, sous_categorie, video_url,
      prix_gros_fcfa, prix_unitaire_fcfa, moq, unite, poids_grammes,
      produit_photo(url, ordre),
      grossiste(id, nom, badge_verifie, est_fabricant, ville, commune, statut, logo_url)
    `)
    .eq('id', id).eq('statut', 'publie').eq('actif', true)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.grossiste?.statut !== 'publie') return null;
  return { ...data, photos: [...(data.produit_photo || [])].sort((a, b) => a.ordre - b.ordre).map((p) => p.url) };
}

// ---- Galerie et vidéo d'un produit (gérées par le fournisseur) ----
export async function recupererGaleriePhotosProduit(produitId) {
  const { data, error } = await supabase.from('produit_photo').select('*').eq('produit_id', produitId).order('ordre');
  if (error) throw error;
  return data;
}

export async function ajouterPhotoProduit(produitId, url, ordre) {
  const { error } = await supabase.from('produit_photo').insert({ produit_id: produitId, url, ordre });
  if (error) throw error;
}

export async function supprimerPhotoProduit(id) {
  const { error } = await supabase.from('produit_photo').delete().eq('id', id);
  if (error) throw error;
}

export async function mettreAJourVideoProduit(produitId, videoUrl) {
  const { error } = await supabase.from('produit').update({ video_url: videoUrl }).eq('id', produitId);
  if (error) throw error;
}


export async function inscrireVendeur({ email, password, nom, telephone, activite }) {
  const { error: erreurCompte } = await supabase.auth.signUp({ email, password });
  if (erreurCompte) throw erreurCompte;
  const { error } = await supabase.rpc('creer_profil_vendeur', { p_nom: nom, p_telephone: telephone, p_activite: activite || null });
  if (error) throw error;
}
// ---- Mot de passe oublié ----
// Le lien reçu par e-mail ramène sur /nouveau-mot-de-passe, déjà connecté (session de récupération).
// L'adresse doit figurer dans Supabase > Authentication > URL Configuration > Redirect URLs.
export async function demanderReinitialisation(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/nouveau-mot-de-passe`,
  });
  if (error) throw error;
}

export async function changerMotDePasse(motDePasse) {
  const { error } = await supabase.auth.updateUser({ password: motDePasse });
  if (error) throw error;
}


// ---- Cadre de l'espace fournisseur ----
// Identité légère (sans le catalogue) : sert au menu, à l'avatar et à la détection du rôle
export async function recupererIdentiteFournisseur(userId) {
  const { data, error } = await supabase
    .from('grossiste')
    .select('id, nom, logo_url, statut, badge_verifie, est_fabricant, stock_confirme, date_ajout')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Prévient dès qu'un message est reçu ou lu (pour la pastille du menu et la cloche)
export function suivreActiviteMessages(callback) {
  const canal = supabase
    .channel(`activite-messages-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message' }, () => callback())
    .subscribe();
  return () => supabase.removeChannel(canal);
}

// Conversations ayant au moins un message non lu de l'autre camp, les plus récentes d'abord
export async function recupererNotifications(role) {
  const autre = role === 'vendeur' ? 'fournisseur' : 'vendeur';
  const { data, error } = await supabase
    .from('conversation')
    .select('id, derniere_activite, vendeur(nom), grossiste(nom), produit(nom), message(contenu, date_envoi, expediteur, lu)')
    .order('derniere_activite', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data
    .map((c) => {
      const nonLus = c.message.filter((m) => !m.lu && m.expediteur === autre)
        .sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi));
      return { id: c.id, auteur: role === 'fournisseur' ? c.vendeur?.nom : c.grossiste?.nom, produit: c.produit?.nom, nonLus: nonLus.length, dernier: nonLus[0] };
    })
    .filter((n) => n.nonLus > 0)
    .slice(0, 6);
}
