// Aides de la messagerie : mise en forme, demande de devis, réponses rapides.

export const trierMessages = (messages = []) =>
  [...messages].sort((a, b) => new Date(a.date_envoi) - new Date(b.date_envoi));

export const formatHeure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const formatJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

// « Il y a 5 min », « Hier », « 12 sept. » pour la liste
export function formatRelatif(iso) {
  const date = new Date(iso);
  const minutes = Math.round((Date.now() - date) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  if (date.toDateString() === new Date().toDateString()) return formatHeure(iso);
  const hier = new Date(Date.now() - 86400000);
  if (date.toDateString() === hier.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export const initiales = (nom = '') =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase() || '?';

// ---- Demande de devis ----
// Le premier message d'un acheteur est une demande structurée, écrite sous forme de texte lisible :
//   Demande de devis
//   Produit : Pagne wax
//   Quantité souhaitée : 500 pièces
//   Livraison à : Bouaké
//   Délai souhaité : Sous 2 semaines
//
//   (message libre)
export const TITRE_DEVIS = 'Demande de devis';

export function composerDemande({ produit, quantite, unite, ville, delai, message }) {
  const lignes = [TITRE_DEVIS];
  if (produit) lignes.push(`Produit : ${produit}`);
  if (quantite) {
    const uniteAccordee = unite && Number(quantite) > 1 && unite !== 'kg' ? `${unite}s` : unite; // 500 pièces, 1 carton, 20 kg
    lignes.push(`Quantité souhaitée : ${quantite}${uniteAccordee ? ` ${uniteAccordee}` : ''}`);
  }
  if (ville) lignes.push(`Livraison à : ${ville}`);
  if (delai) lignes.push(`Délai souhaité : ${delai}`);
  const libre = (message || '').trim();
  return libre ? `${lignes.join('\n')}\n\n${libre}` : lignes.join('\n');
}

export function analyserDemande(contenu = '') {
  if (!contenu.startsWith(TITRE_DEVIS)) return null;
  const champs = [];
  const libre = [];
  let fin = false;
  contenu.split('\n').slice(1).forEach((ligne) => {
    if (fin) { libre.push(ligne); return; }
    const i = ligne.indexOf(' : ');
    if (i > 0 && i < 40) champs.push([ligne.slice(0, i), ligne.slice(i + 3)]);
    else fin = true;
  });
  return { champs, libre: libre.join('\n').trim() };
}

export const DELAIS_DEVIS = ['Urgent (cette semaine)', 'Sous 2 semaines', 'Sous 1 mois', 'Je compare les offres'];

// ---- Réponses rapides (insérées dans le champ, jamais envoyées automatiquement) ----
export const REPONSES_FOURNISSEUR = [
  'Bonjour, merci pour votre demande.',
  'Oui, ce produit est disponible en stock.',
  'Pour cette quantité, le prix est de … F CFA l\'unité.',
  'Le délai de livraison est de … jours.',
  'Dans quelle ville souhaitez-vous être livré ?',
  'Pouvez-vous préciser la quantité souhaitée ?',
];
export const REPONSES_ACHETEUR = [
  'Quel est votre meilleur prix pour cette quantité ?',
  'Ce produit est-il disponible en stock ?',
  'Quel est le délai de livraison ?',
  'Pouvez-vous envoyer plus de photos ?',
  'Proposez-vous des échantillons ?',
  'Livrez-vous à … ?',
];

// Numéro, e-mail ou lien écrit dans un message : on prévient avant l'envoi (le masquage définitif est fait par la base)
export function contientCoordonnees(texte = '') {
  // Téléphone ivoirien (10 chiffres, souvent par paires, éventuellement précédé de +225) ou adresse e-mail.
  // Les montants (« 1 000 000 », groupes de 3 chiffres) ne déclenchent pas l'avertissement.
  return /(?:\+?225[\s.-]?)?\b\d{2}(?:[\s.-]?\d{2}){4}\b/.test(texte)
    || /[\w.+-]+@[\w-]+\.[\w.]+/.test(texte)
    || /(https?:\/\/|www\.)\S+/i.test(texte);
}
