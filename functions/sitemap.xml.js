import { lire } from '../cloudflare/outils.js';

const PAGES_FIXES = ['/', '/devenir-fournisseur', '/mentions-legales', '/confidentialite', '/conditions'];
const echapper = (texte) => String(texte).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Plan du site pour Google (version Cloudflare Pages de api/sitemap.js) : fournisseurs et produits publiés, sur le domaine de la requête.
export async function onRequestGet(context) {
  const base = (context.env.SITE_URL || new URL(context.request.url).origin).replace(/\/$/, '');
  const [fournisseurs, produits] = await Promise.all([
    lire(context.env, 'grossiste?select=id&statut=eq.publie&limit=5000'),
    lire(context.env, 'produit?select=id&statut=eq.publie&actif=eq.true&limit=20000'),
  ]);
  const entrees = [
    ...PAGES_FIXES.map((chemin) => ({ chemin, frequence: chemin === '/' ? 'daily' : 'yearly', priorite: chemin === '/' ? '1.0' : '0.3' })),
    ...(fournisseurs || []).map((f) => ({ chemin: `/grossiste/${f.id}`, frequence: 'weekly', priorite: '0.7' })),
    ...(produits || []).map((p) => ({ chemin: `/produit/${p.id}`, frequence: 'weekly', priorite: '0.8' })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entrees
    .map((e) => `  <url><loc>${echapper(base + e.chemin)}</loc><changefreq>${e.frequence}</changefreq><priority>${e.priorite}</priority></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
