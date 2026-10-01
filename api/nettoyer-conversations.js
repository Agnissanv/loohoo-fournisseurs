import { createClient } from '@supabase/supabase-js';

const JOURS_RETENTION = 90;

export default async function handler(req, res) {
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const limite = new Date(Date.now() - JOURS_RETENTION * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await admin
    .from('conversation')
    .delete({ count: 'exact' })
    .lt('derniere_activite', limite);

  if (error) {
    res.status(500).json({ erreur: error.message });
    return;
  }
  res.status(200).json({ supprimees: count ?? 0 });
}