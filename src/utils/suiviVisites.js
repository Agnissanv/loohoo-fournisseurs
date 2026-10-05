import { supabase } from '../supabaseClient.js';

// Suivi anonyme des visites : aucune donnée personnelle, une seule visite comptée par page et par session.
// La « source » dit d'où vient le visiteur. Tant que la migration 0003 n'est pas exécutée, l'appel échoue
// en silence : le site n'est jamais ralenti ni cassé par le suivi.

let pagePrecedente = null; // dernière page vue dans l'application (navigation interne)

function classerReferent() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = (params.get('utm_source') || '').toLowerCase();
    const ref = (document.referrer || '').toLowerCase();
    const texte = `${utm} ${ref}`;
    if (/whatsapp|wa\.me/.test(texte)) return 'whatsapp';
    if (/facebook|fb\.com|fb\.me/.test(texte)) return 'facebook';
    if (/instagram/.test(texte)) return 'instagram';
    if (/google\./.test(texte)) return 'google';
    if (!ref && !utm) return 'lien_direct';
    // Venu de looh-oo.com ou d'un sous-domaine : c'est de la navigation LOOHOO
    if (/looh-oo\.com|localhost/.test(ref)) return 'recherche_loohoo';
    return 'autre';
  } catch {
    return 'autre';
  }
}

export function noterVisite({ grossisteId, produitId = null }) {
  if (!grossisteId) return;
  try {
    const cle = `visite:${grossisteId}:${produitId || ''}`;
    const dejaVu = sessionStorage.getItem(cle);
    // Navigation depuis une autre page de l'application = parcours dans la recherche LOOHOO
    const source = pagePrecedente ? 'recherche_loohoo' : classerReferent();
    pagePrecedente = window.location.pathname;
    if (dejaVu) return;
    sessionStorage.setItem(cle, '1');
    supabase.rpc('enregistrer_visite', { p_grossiste_id: grossisteId, p_produit_id: produitId, p_source: source }).then(() => {}, () => {});
  } catch {
    /* stockage ou réseau indisponible : on ignore */
  }
}

// À appeler sur les pages qui ne sont pas des fiches (accueil) pour que la page suivante soit comptée comme navigation interne
export function noterPageInterne() {
  pagePrecedente = window.location.pathname;
}
