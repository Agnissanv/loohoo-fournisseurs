import { createClient } from '@supabase/supabase-js';

const JOURS_CONVERSATIONS = 90;
const JOURS_VISITES = 365;

const ilYaJours = (jours) => new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString();

// Tâche quotidienne (voir vercel.json). Protégée : Vercel envoie automatiquement « Authorization: Bearer <CRON_SECRET> »
// quand la variable d'environnement CRON_SECRET est définie dans le projet. Sans elle, n'importe qui pourrait déclencher la tâche.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(500).json({ erreur: "CRON_SECRET n'est pas défini dans les variables d'environnement Vercel." });
    return;
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ erreur: 'Non autorisé' });
    return;
  }

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { error, count } = await admin
    .from('conversation')
    .delete({ count: 'exact' })
    .lt('derniere_activite', ilYaJours(JOURS_CONVERSATIONS));
  if (error) {
    res.status(500).json({ erreur: error.message });
    return;
  }

  // Visites de plus d'un an (la table n'existe qu'après la migration 0003 : l'absence n'est pas une erreur)
  const visites = await admin.from('visite').delete({ count: 'exact' }).lt('date_visite', ilYaJours(JOURS_VISITES));

  // Textes d'origine des messages masqués : conservés 90 jours seulement (même durée que les conversations)
  await admin.from('message_masque').delete().lt('date_masquage', ilYaJours(JOURS_CONVERSATIONS));

  res.status(200).json({ conversationsSupprimees: count ?? 0, visitesSupprimees: visites.error ? 0 : (visites.count ?? 0) });
}
