import { supabase } from '../supabaseClient.js';

// Valeurs des listes déroulantes, déduites des grossistes publiés
export async function recupererFiltres() {
  // pays_code (migration 0024) lu en premier, avec repli tant que la migration n'est pas exécutée
  let { data, error } = await supabase.from('grossiste').select('id, categorie, ville, commune, pays_code');
  if (error) ({ data, error } = await supabase.from('grossiste').select('id, categorie, ville, commune'));
  if (error) throw error;
  const uniques = (lignes, cle) =>
    [...new Set(lignes.map((ligne) => ligne[cle]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
  const paysParGrossiste = Object.fromEntries(data.map((l) => [l.id, l.pays_code || 'CI']));
  const villesParPays = {};
  data.forEach((l) => { const c = l.pays_code || 'CI'; (villesParPays[c] ||= []).push(l); });
  Object.keys(villesParPays).forEach((c) => { villesParPays[c] = uniques(villesParPays[c], 'ville'); });
  return { categories: uniques(data, 'categorie'), villes: uniques(data, 'ville'), communes: uniques(data, 'commune'), paysParGrossiste, villesParPays };
}



// Profil complet d'un grossiste publié (photos + catalogue). Renvoie null s'il n'existe pas ou n'est pas publié.
export async function recupererGrossiste(id) {
  const produits = 'produit(id, nom, description, tags, categorie, poids_grammes, prix_gros_fcfa, moq, unite, photo_url, date_ajout, statut, actif)';
  const base = `id, nom, categorie, ville, commune, pays, origine, est_fabricant, badge_verifie, statut, horaires_ouverture, grossiste_photo(url, ordre), ${produits}`;
  const requete = (colonnes) => supabase.from('grossiste').select(colonnes).eq('id', id).maybeSingle();
  // logo, bannière et date d'inscription : lus d'abord, avec repli si les droits de la base ne les exposent pas
  // l'adresse courte (slug, migration 0021) est lue en premier, avec repli tant que la migration n'est pas exécutée
  let { data, error } = await requete(`${base}, logo_url, banniere_url, date_ajout, slug`);
  if (error) ({ data, error } = await requete(`${base}, logo_url, banniere_url, date_ajout`));
  if (error) ({ data, error } = await requete(base));
  if (error) throw error;
  if (!data) return null;
  // Seuls les produits publiés et actifs sont montrés aux acheteurs
  const visibles = (data.produit || []).filter((p) => (p.statut === undefined || p.statut === 'publie') && p.actif !== false);
  return {
    ...data,
    photos: [...data.grossiste_photo].sort((a, b) => a.ordre - b.ordre).map((p) => p.url),
    produits: visibles.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  };
}

// ---- Compte fournisseur ----
// ---- Inscription (fournisseur, acheteur, demande de devis) ----
// Avec la confirmation d'e-mail activée dans Supabase, signUp ne donne pas de session : le profil ne peut pas être
// créé tout de suite. On range donc ce qu'il faut (profil, et au besoin la demande de devis) dans les métadonnées du
// compte ; dès que la personne a confirmé son e-mail et se connecte, on termine le travail (finaliserInscriptionEnAttente).
// Ça marche même si elle confirme depuis un autre appareil, et la demande de devis n'est jamais perdue.

function traduireErreurAuth(erreur) {
  const m = erreur?.message || '';
  if (/rate limit/i.test(m)) return new Error("Trop d'e-mails de confirmation envoyés pour l'instant. Réessayez dans quelques minutes.");
  if (/already registered|already been registered/i.test(m)) return new Error('Un compte existe déjà avec cet e-mail. Connectez-vous, ou utilisez « Mot de passe oublié ».');
  return erreur;
}

async function ouvrirCompte(email, password, attente) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { loohoo: attente } } });
  if (error) throw traduireErreurAuth(error);
  // E-mail déjà utilisé : Supabase répond sans erreur mais sans identité
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Un compte existe déjà avec cet e-mail. Connectez-vous, ou utilisez « Mot de passe oublié ».');
  }
  return data.session ? { confirmationRequise: false } : { confirmationRequise: true };
}

async function creerProfilFournisseur({ nom, categorie, ville, commune, telephone, estFabricant, origine, stockConfirme, paysCode }) {
  const { error } = await supabase.rpc('creer_profil_fournisseur', {
    p_nom: nom, p_categorie: categorie, p_ville: ville, p_commune: commune || null,
    p_telephone: telephone, p_est_fabricant: !!estFabricant,
  });
  if (error) throw error;
  // Champs que la fonction SQL ne prend pas encore en paramètre : mise à jour séparée, non bloquante
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await supabase.from('grossiste')
      .update({ origine: origine || 'local', stock_confirme: !!stockConfirme, ...(paysCode ? { pays_code: paysCode } : {}) })
      .eq('user_id', session.user.id);
  }
}

async function creerProfilVendeur({ nom, telephone, activite, paysCode }) {
  const { error } = await supabase.rpc('creer_profil_vendeur', { p_nom: nom, p_telephone: telephone, p_activite: activite || null });
  if (error) throw error;
  await definirPaysAcheteur(paysCode);
}

// Pays de l'acheteur (migration 0024) : jamais bloquant pour l'inscription
async function definirPaysAcheteur(paysCode) {
  if (!paysCode) return;
  await supabase.rpc('definir_mon_pays_acheteur', { p_code: paysCode }).then(() => {}, () => {});
}

// Renvoie { confirmationRequise }
export async function inscrireFournisseur({ email, password, ...profil }) {
  const resultat = await ouvrirCompte(email, password, { type: 'fournisseur', profil });
  if (!resultat.confirmationRequise) await finaliserInscriptionEnAttente();
  return resultat;
}

// Compte acheteur seul (page « Créer un compte »). Renvoie { confirmationRequise }
export async function inscrireVendeur({ email, password, nom, telephone, activite, paysCode }) {
  const resultat = await ouvrirCompte(email, password, { type: 'vendeur', profil: { nom, telephone, activite, paysCode } });
  if (!resultat.confirmationRequise) await finaliserInscriptionEnAttente();
  return resultat;
}

let finalisationEnCours = null;

// À appeler quand un compte connecté porte une inscription en attente. Renvoie false s'il n'y en a pas,
// sinon { type, conversationId } (conversationId si une demande de devis était jointe).
export function finaliserInscriptionEnAttente() {
  if (!finalisationEnCours) finalisationEnCours = executerFinalisation().finally(() => { finalisationEnCours = null; });
  return finalisationEnCours;
}

async function executerFinalisation() {
  const { data: { session } } = await supabase.auth.getSession();
  const attente = session?.user?.user_metadata?.loohoo;
  if (!attente) return false;

  const { role } = await recupererMonRole();
  let conversationId = null;
  if (attente.type === 'fournisseur') {
    if (!role) await creerProfilFournisseur(attente.profil);
  } else {
    if (!role) await creerProfilVendeur(attente.profil);
    if (attente.demande) {
      conversationId = await ouvrirConversation({ ...attente.demande, ...attente.profil });
      await definirPaysAcheteur(attente.profil?.paysCode);
    }
  }
  // Fait : on retire les données de l'inscription du compte
  await supabase.auth.updateUser({ data: { loohoo: null } });
  return { type: attente.type, conversationId };
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
  const requete = (contact) => supabase
    .from('grossiste')
    .select(`*, grossiste_contact(${contact}), grossiste_photo(id, url, ordre), produit(*)`)
    .eq('user_id', userId)
    .maybeSingle();
  let data = null;
  let error = null;
  for (const contact of ['telephone, adresse, site_web, reseaux_sociaux', 'telephone']) {
    ({ data, error } = await requete(contact));
    if (!error) break;
  }
  if (error) throw error;
  return data;
}

// Adresse, site web et réseaux sociaux : privés, rangés avec le téléphone dans la table protégée des contacts
export async function mettreAJourContactPrive(grossisteId, champs) {
  const { data, error } = await supabase.from('grossiste_contact').update(champs).eq('grossiste_id', grossisteId).select('grossiste_id');
  if (error) {
    throw new Error(/column|schema cache/i.test(error.message) ? "Ces informations privées ne peuvent pas encore être enregistrées (migration 0006 à exécuter)." : error.message);
  }
  if (!data || data.length === 0) {
    // La ligne de contact n'existe qu'avec un téléphone valide (obligatoire) : on ne peut pas la créer sans lui
    throw new Error("Renseignez d'abord votre numéro de téléphone, puis complétez ces informations.");
  }
}

// Motif de la dernière décision de l'équipe sur ce profil (suspension, mise en attente). Vide si aucun ou si la fonction n'est pas activée.
export async function recupererMotifDecision(grossisteId) {
  const { data, error } = await supabase.from('grossiste_decision').select('motif').eq('grossiste_id', grossisteId).maybeSingle();
  if (error) return '';
  return data?.motif || '';
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
    supabase.from('vendeur').select('id, nom').eq('user_id', session.user.id).maybeSingle(),
  ]);
  if (g) return { session, role: 'fournisseur', profil: g };
  if (v) return { session, role: 'vendeur', profil: v };
  return { session, role: null, profil: null };
}

export async function recupererSessionVendeur() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  // L'acheteur relit son propre téléphone par une fonction réservée (migration 0010); repli sur la lecture directe avant celle-ci
  const { data: lignes, error } = await supabase.rpc('mon_vendeur');
  if (!error) return { session, vendeur: (Array.isArray(lignes) ? lignes[0] : lignes) || null };
  const { data } = await supabase.from('vendeur').select('nom, telephone').eq('user_id', session.user.id).maybeSingle();
  return { session, vendeur: data };
}

// ---- Démarrer ou poursuivre une conversation (remplace l'ancien lien WhatsApp) ----
// Un acheteur connecté démarre la conversation tout de suite. Sans session, on crée son compte en rangeant la demande de devis
// dans le compte : elle part automatiquement dès que l'e-mail est confirmé. Renvoie { conversationId } ou { confirmationRequise }.
export async function demarrerConversation({ grossisteId, produitId, message, nom, telephone, activite, email, password, paysCode }) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const resultat = await ouvrirCompte(email, password, {
      type: 'vendeur',
      profil: { nom, telephone, activite, paysCode },
      demande: { grossisteId, produitId: produitId || null, message },
    });
    if (resultat.confirmationRequise) return { confirmationRequise: true };
    const fini = await finaliserInscriptionEnAttente();
    return { conversationId: fini?.conversationId || null };
  }
  const conversationId = await ouvrirConversation({ grossisteId, produitId, message, nom, telephone, activite });
  await definirPaysAcheteur(paysCode);
  return { conversationId };
}

async function ouvrirConversation({ grossisteId, produitId, message, nom, telephone, activite }) {
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
  // Relecture : si la base accepte l'écriture mais refuse la lecture (droits manquants), on le dit au lieu de faire croire que c'est enregistré
  const { data } = await supabase.from('grossiste_contact').select('telephone').eq('grossiste_id', grossisteId).maybeSingle();
  if (!data?.telephone) {
    throw new Error("Le numéro n'a pas pu être relu après l'enregistrement : les droits de lecture manquent sur la base (migration 0004 à exécuter).");
  }
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
  const base = `id, nom, description, tags, categorie, sous_categorie, video_url,
      prix_gros_fcfa, prix_unitaire_fcfa, moq, unite, poids_grammes,
      produit_photo(url, ordre),
      grossiste(id, nom, badge_verifie, est_fabricant, ville, commune, statut, logo_url)`;
  const requete = (colonnes) => supabase.from('produit').select(colonnes)
    .eq('id', id).eq('statut', 'publie').eq('actif', true).maybeSingle();
  // Stock, dimensions et référence : lus d'abord, avec repli si les droits de la base ne les exposent pas
  let data = null;
  let error = null;
  for (const extra of [', paliers, stock_disponible, longueur_cm, largeur_cm, hauteur_cm, sku, stock_verifie_le', ', stock_disponible, longueur_cm, largeur_cm, hauteur_cm, sku, stock_verifie_le', ', stock_disponible, longueur_cm, largeur_cm, hauteur_cm, sku', '']) {
    ({ data, error } = await requete(`${base}${extra}`));
    if (!error) break;
  }
  if (error) throw error;
  if (!data || data.grossiste?.statut !== 'publie') return null;
  return { ...data, photos: [...(data.produit_photo || [])].sort((a, b) => a.ordre - b.ordre).map((p) => p.url) };
}

// Autres produits publiés d'un fournisseur (pour « Du même fournisseur »)
export async function recupererAutresProduitsFournisseur(grossisteId, sauf) {
  const { data, error } = await supabase
    .from('produit')
    .select('id, nom, photo_url, prix_gros_fcfa, moq, unite')
    .eq('grossiste_id', grossisteId).eq('statut', 'publie').eq('actif', true)
    .neq('id', sauf).limit(10);
  if (error) return [];
  return data;
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


// Présentation publique du fournisseur. Lecture à part et tolérante : tant que la migration 0002
// n'est pas exécutée, la colonne n'existe pas et on renvoie simplement null.
export async function recupererDescriptionGrossiste(id) {
  const { data, error } = await supabase.from('grossiste').select('description').eq('id', id).maybeSingle();
  if (error) return null;
  return data?.description || null;
}


// Visites du fournisseur connecté (origine, jours, produits les plus vus). Renvoie null tant que la migration 0003
// n'est pas exécutée, pour que la page Statistiques affiche « bientôt disponible » au lieu d'une erreur.
export async function recupererStatsVisites(jours = 30) {
  const { data, error } = await supabase.rpc('stats_visites', { p_jours: jours });
  if (error) return null;
  return data;
}


// ---- Messagerie (liste + fil) ----
// Liste riche : logo et badge du fournisseur, activité de l'acheteur, produit avec photo et prix.
// Si un champ n'est pas lisible selon les droits de la base, on retombe sur la sélection de base.
export async function recupererConversationsRiches() {
  const requete = (grossiste, vendeur, produit) => supabase
    .from('conversation')
    .select(`id, derniere_activite, grossiste(${grossiste}), vendeur(${vendeur}), produit(${produit}), message(id, contenu, date_envoi, expediteur, lu)`)
    .order('derniere_activite', { ascending: false });
  let { data, error } = await requete('id, nom, logo_url, badge_verifie, ville', 'id, nom, activite', 'id, nom, photo_url, prix_gros_fcfa, moq, unite');
  if (error) ({ data, error } = await requete('id, nom', 'id, nom', 'id, nom'));
  if (error) throw error;
  return data;
}

// Messages d'un fil : INSERT (nouveau message) et UPDATE (message marqué lu)
export function suivreFil(conversationId, { onInsert, onUpdate }) {
  const canal = supabase
    .channel(`fil-${conversationId}-${Math.random().toString(36).slice(2, 7)}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert?.(payload.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onUpdate?.(payload.new))
    .subscribe();
  return () => supabase.removeChannel(canal);
}

// ---- Affaires conclues (migration 0012) ----
// Renvoie null tant que la migration n'est pas exécutée : l'interface masque alors la fonction au lieu d'afficher une erreur.
export async function recupererAffaires(conversationId) {
  const { data, error } = await supabase
    .from('affaire')
    .select('id, montant_fcfa, description, declaree_par, statut, date_declaration, date_reponse')
    .eq('conversation_id', conversationId)
    .order('date_declaration', { ascending: false });
  if (error) return null;
  return data;
}

export async function recupererMesAffairesConfirmees() {
  const { data, error } = await supabase.from('affaire').select('montant_fcfa, date_reponse').eq('statut', 'confirmee');
  if (error) return null;
  return data;
}

export async function declarerAffaire(conversationId, montant, description) {
  const { data, error } = await supabase.rpc('declarer_affaire', { p_conversation_id: conversationId, p_montant: montant, p_description: description || null });
  if (error) throw error;
  return data;
}

export async function repondreAffaire(id, accepter) {
  const { error } = await supabase.rpc('repondre_affaire', { p_id: id, p_accepter: accepter });
  if (error) throw error;
}

export async function annulerAffaire(id) {
  const { error } = await supabase.rpc('annuler_affaire', { p_id: id });
  if (error) throw error;
}

// Chiffres de confiance d'un fournisseur publié (affaires confirmées, délai de réponse, stock vérifié) : agrégats uniquement
export async function recupererIndicateursConfiance(grossisteId) {
  const { data, error } = await supabase.rpc('indicateurs_confiance', { p_ids: [grossisteId] });
  if (error) throw error;
  return data?.[0] || null;
}

// ---- Avis après affaire confirmée (migration 0016) ----
export async function deposerAvis(affaireId, note, commentaire) {
  const { error } = await supabase.rpc('deposer_avis', { p_affaire_id: affaireId, p_note: note, p_commentaire: commentaire || null });
  if (error) throw error;
}

// Avis déjà donnés par l'acheteur connecté (null si la migration n'est pas exécutée)
export async function recupererMesAvis(affaireIds) {
  if (!affaireIds.length) return [];
  const { data, error } = await supabase.from('avis').select('affaire_id, note, statut, motif_rejet').in('affaire_id', affaireIds);
  if (error) return null;
  return data;
}

export async function recupererAvisPublics(grossisteId) {
  const [liste, resume] = await Promise.all([
    supabase.rpc('avis_publics', { p_grossiste_id: grossisteId, p_limite: 20 }),
    supabase.rpc('resume_avis', { p_grossiste_id: grossisteId }),
  ]);
  if (liste.error || resume.error) return null;
  return { avis: liste.data || [], nombre: resume.data?.[0]?.nombre || 0, moyenne: Number(resume.data?.[0]?.moyenne) || 0 };
}

// Ventes confirmées, seuil gratuit et état de l'abonnement du fournisseur connecté (null tant que la migration 0018 n'est pas exécutée)
export async function recupererMonAbonnement() {
  const { data, error } = await supabase.rpc('mon_abonnement');
  if (error) return null;
  return data?.[0] || null;
}

// Affaires confirmées du fournisseur connecté, avec montant et date (pour les ventes et la courbe)
export async function recupererMesVentes() {
  const { data, error } = await supabase.from('affaire').select('montant_fcfa, date_reponse').eq('statut', 'confirmee').not('date_reponse', 'is', null);
  if (error) return [];
  return data;
}

// ---- Accueil public (migration 0019) : chiffres réels et fournisseurs à la une. Vides tant que la migration n'est pas exécutée.
export async function recupererChiffresPublics() {
  const { data, error } = await supabase.rpc('chiffres_publics');
  if (error) return null;
  return data?.[0] || null;
}

export async function recupererFournisseursALaUne(n = 4) {
  const { data, error } = await supabase.rpc('fournisseurs_a_la_une', { p_limite: n });
  if (error) return [];
  return data || [];
}

// ---- Fournisseurs favoris de l'acheteur (migration 0020) ----
export async function estFavori(grossisteId) {
  const { data, error } = await supabase.rpc('est_favori', { p_grossiste_id: grossisteId });
  return !error && data === true;
}

// Renvoie true si le fournisseur est maintenant en favori, false s'il vient d'être retiré
export async function basculerFavori(grossisteId) {
  const { data, error } = await supabase.rpc('basculer_favori', { p_grossiste_id: grossisteId });
  if (error) throw error;
  return data === true;
}

export async function recupererMesFavoris() {
  const { data, error } = await supabase.rpc('mes_favoris');
  if (error) return [];
  return data || [];
}

// ---- Lien partageable (migration 0021) ----
// Retrouve l'identifiant d'un fournisseur publié à partir de son adresse courte (looh-oo.com/f/kone-textiles). null si inconnu.
export async function grossisteIdParSlug(slug) {
  const { data, error } = await supabase.rpc('grossiste_id_par_slug', { p_slug: slug });
  if (error) return null;
  return data || null;
}

// ---- Recherches sans résultat (migration 0022) : jamais bloquant ----
export async function signalerRechercheVide({ q, categorie, ville }) {
  try { await supabase.rpc('signaler_recherche_vide', { p_terme: q || null, p_categorie: categorie || null, p_ville: ville || null }); } catch { /* sans importance */ }
}

// Seuil gratuit et prix des formules (migration 0023). null tant que la migration n'est pas exécutée.
export async function recupererFormulesAbonnement() {
  const { data, error } = await supabase.rpc('formules_abonnement');
  if (error || !data) return null;
  return data;
}
