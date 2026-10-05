// Calculs sur les conversations du fournisseur : une « demande » = une conversation ouverte par un acheteur.
// Tout est dérivé des vrais messages (date, expéditeur, lu) : aucun chiffre inventé.

const JOUR_MS = 24 * 60 * 60 * 1000;

const trier = (messages = []) => [...messages].sort((a, b) => new Date(a.date_envoi) - new Date(b.date_envoi));

// Statut affiché pour une conversation
//  nouvelle : le dernier message vient de l'acheteur et n'est pas lu
//  en_cours : le dernier message vient de l'acheteur, lu, en attente de réponse
//  repondue : le dernier message vient du fournisseur
export function analyserConversation(c) {
  const messages = trier(c.message);
  const premier = messages[0];
  const dernier = messages[messages.length - 1];
  const premiereReponse = premier ? messages.find((m) => m.expediteur === 'fournisseur' && new Date(m.date_envoi) >= new Date(premier.date_envoi)) : null;
  let statut = 'en_cours';
  if (dernier?.expediteur === 'fournisseur') statut = 'repondue';
  else if (dernier && !dernier.lu) statut = 'nouvelle';
  return {
    id: c.id,
    acheteur: c.vendeur?.nom || 'Acheteur',
    produit: c.produit?.nom || null,
    dateDemande: premier ? premier.date_envoi : c.derniere_activite,
    dernier,
    aRepondu: !!premiereReponse,
    delaiMs: premiereReponse && premier ? new Date(premiereReponse.date_envoi) - new Date(premier.date_envoi) : null,
    statut,
    nonLus: messages.filter((m) => !m.lu && m.expediteur === 'vendeur').length,
  };
}

const mediane = (valeurs) => {
  if (!valeurs.length) return null;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
};

export function formaterDuree(ms) {
  if (ms == null) return '–';
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `${heures} h${minutes % 60 ? ` ${String(minutes % 60).padStart(2, '0')}` : ''}`;
  return `${Math.round(minutes / 1440)} j`;
}

const cleJour = (date) => new Date(date).toISOString().slice(0, 10);

// Statistiques sur une période de `jours` jours, comparées à la période précédente
export function calculerStats(conversations, jours) {
  const maintenant = Date.now();
  const debut = maintenant - jours * JOUR_MS;
  const debutPrecedent = debut - jours * JOUR_MS;
  const analyses = conversations.map(analyserConversation);

  const dans = (a, de, jusqua) => { const t = new Date(a.dateDemande).getTime(); return t >= de && t < jusqua; };
  const periode = analyses.filter((a) => dans(a, debut, maintenant + 1));
  const precedente = analyses.filter((a) => dans(a, debutPrecedent, debut));

  const taux = (liste) => (liste.length ? Math.round((liste.filter((a) => a.aRepondu).length / liste.length) * 100) : null);

  const parJour = new Map();
  for (let i = jours - 1; i >= 0; i -= 1) parJour.set(cleJour(maintenant - i * JOUR_MS), 0);
  periode.forEach((a) => { const k = cleJour(a.dateDemande); if (parJour.has(k)) parJour.set(k, parJour.get(k) + 1); });

  const parProduit = new Map();
  periode.forEach((a) => { const nom = a.produit || 'Sans produit précis'; parProduit.set(nom, (parProduit.get(nom) || 0) + 1); });

  return {
    analyses,
    periode,
    nbDemandes: periode.length,
    nbPrecedent: precedente.length,
    variation: precedente.length ? Math.round(((periode.length - precedente.length) / precedente.length) * 100) : null,
    tauxReponse: taux(periode),
    delaiMedianMs: mediane(periode.map((a) => a.delaiMs).filter((d) => d != null)),
    evolution: [...parJour].map(([jour, nb]) => ({ jour, nb })),
    repartition: {
      nouvelle: periode.filter((a) => a.statut === 'nouvelle').length,
      en_cours: periode.filter((a) => a.statut === 'en_cours').length,
      repondue: periode.filter((a) => a.statut === 'repondue').length,
    },
    topProduits: [...parProduit].map(([nom, nb]) => ({ nom, nb })).sort((a, b) => b.nb - a.nb).slice(0, 6),
  };
}

// Export CSV lisible dans Excel (séparateur point-virgule, BOM UTF-8)
export function exporterCsv(analyses) {
  const echapper = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lignes = [['Date', 'Acheteur', 'Produit', 'Statut', 'Délai de première réponse'].map(echapper).join(';')];
  const libelles = { nouvelle: 'Nouvelle', en_cours: 'En cours', repondue: 'Répondue' };
  [...analyses].sort((a, b) => new Date(b.dateDemande) - new Date(a.dateDemande)).forEach((a) => {
    lignes.push([
      new Date(a.dateDemande).toLocaleString('fr-FR'), a.acheteur, a.produit || '', libelles[a.statut], a.delaiMs != null ? formaterDuree(a.delaiMs) : '',
    ].map(echapper).join(';'));
  });
  const blob = new Blob([`﻿${lignes.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const lien = document.createElement('a');
  lien.href = URL.createObjectURL(blob);
  lien.download = `demandes-loohoo-${cleJour(Date.now())}.csv`;
  lien.click();
  URL.revokeObjectURL(lien.href);
}
