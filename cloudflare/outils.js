// Outils partagés par les fonctions Cloudflare Pages (dossier functions/).
// Ces fonctions remplacent celles de Vercel (dossier api/) tant que le site est hébergé sur Cloudflare Pages.
// Elles parlent directement à l'API de Supabase (clé publique uniquement : rien de privé n'est lu ici).

// Robots qui lisent les balises d'aperçu (WhatsApp, Facebook, Google…). Les visiteurs, eux, reçoivent la page telle quelle.
const ROBOTS = /whatsapp|facebookexternalhit|facebot|twitterbot|slackbot|telegrambot|linkedinbot|discordbot|googlebot|bingbot|applebot|pinterest|skypeuripreview|embedly|redditbot|yandex|duckduckbot|baiduspider|snapchat|vkshare|qwantify|ia_archiver/i;
export const estUnRobot = (request) => ROBOTS.test(request.headers.get('user-agent') || '');

export const echapper = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const couper = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

function supabase(env) {
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\/$/, '');
  const cle = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  return url && cle ? { url, entetes: { apikey: cle, 'Content-Type': 'application/json' } } : null;
}

// Lecture d'une table ou d'une vue : chemin = « produit?select=…&id=eq.… ». null en cas de problème.
export async function lire(env, chemin) {
  const s = supabase(env);
  if (!s) return null;
  try {
    const r = await fetch(`${s.url}/rest/v1/${chemin}`, { headers: s.entetes });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Appel d'une fonction SQL publique. null en cas de problème.
export async function appeler(env, fonction, parametres = {}) {
  const s = supabase(env);
  if (!s) return null;
  try {
    const r = await fetch(`${s.url}/rest/v1/rpc/${fonction}`, { method: 'POST', headers: s.entetes, body: JSON.stringify(parametres) });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Version réduite d'une photo Supabase, au format attendu par WhatsApp et Facebook (1200 × 630)
export function imagePartage(url, secours) {
  if (!url) return secours;
  if (url.includes('/storage/v1/object/public/')) {
    return `${url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=1200&height=630&resize=cover&quality=75`;
  }
  return url;
}

// Renvoie la page du site (index.html) avec le titre, la description et l'image remplacés
export async function pageAvecApercu(context, { titre, description, image, adresse, type = 'website' }) {
  const page = await context.env.ASSETS.fetch(new URL('/', context.request.url));
  let html = await page.text();
  const balises = [
    `<meta property="og:type" content="${type}" />`,
    '<meta property="og:site_name" content="LOOHOO Fournisseurs" />',
    `<meta property="og:title" content="${echapper(titre)}" />`,
    `<meta property="og:description" content="${echapper(description)}" />`,
    `<meta property="og:url" content="${echapper(adresse)}" />`,
    `<meta property="og:image" content="${echapper(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:image" content="${echapper(image)}" />`,
    `<meta name="description" content="${echapper(description)}" />`,
    `<link rel="canonical" href="${echapper(adresse)}" />`,
  ].join('\n    ');
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${echapper(titre)}</title>`)
    .replace(/\s*<meta\s+(?:property|name)="(?:og:[^"]*|twitter:[^"]*|description)"[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
    .replace('</head>', `    ${balises}\n  </head>`);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

export const nombre = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
