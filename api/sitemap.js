import { createClient } from '@supabase/supabase-js';

const PAGES_FIXES = ['/', '/devenir-fournisseur', '/mentions-legales', '/confidentialite', '/conditions'];

const echapper = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Plan du site généré à la demande : les pages fournisseurs et produits publiés y figurent dès leur publication.
// Le domaine est celui de la requête (ou SITE_URL si défini), donc rien à changer quand le sous-domaine sera branché.
export default async function handler(req, res) {
  const hote = req.headers['x-forwarded-host'] || req.headers.host;
  const base = (process.env.SITE_URL || `https://${hote}`).replace(/\/$/, '');
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const cle = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

  let fournisseurs = [];
  let produits = [];
  if (url && cle) {
    const supabase = createClient(url, cle);
    const [g, p] = await Promise.all([
      supabase.from('grossiste').select('id').eq('statut', 'publie').limit(5000),
      supabase.from('produit').select('id').eq('statut', 'publie').eq('actif', true).limit(20000),
    ]);
    fournisseurs = g.data || [];
    produits = p.data || [];
  }

  const entrees = [
    ...PAGES_FIXES.map((chemin) => ({ chemin, frequence: chemin === '/' ? 'daily' : 'yearly', priorite: chemin === '/' ? '1.0' : '0.3' })),
    ...fournisseurs.map((f) => ({ chemin: `/grossiste/${f.id}`, frequence: 'weekly', priorite: '0.7' })),
    ...produits.map((p) => ({ chemin: `/produit/${p.id}`, frequence: 'weekly', priorite: '0.8' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entrees
    .map((e) => `  <url><loc>${echapper(base + e.chemin)}</loc><changefreq>${e.frequence}</changefreq><priority>${e.priorite}</priority></url>`)
    .join('\n')}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
