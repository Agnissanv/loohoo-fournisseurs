import { createClient } from '@supabase/supabase-js';

// Appelée tous les 2 jours par la tâche planifiée de Vercel (vercel.json) : une petite lecture suffit
// pour que Supabase (offre gratuite) ne mette pas le projet en pause après 7 jours sans activité.
// Mêmes variables que le site : aucune variable supplémentaire à créer sur Vercel.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    res.status(500).json({ success: false, error: 'Variables Supabase absentes sur Vercel' });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { error } = await supabase.from('grossiste').select('id').limit(1);
  if (error) {
    console.error('keep-alive :', error.message);
    res.status(500).json({ success: false, error: 'Supabase ne répond pas' });
    return;
  }
  res.status(200).json({ success: true, date: new Date().toISOString() });
}
