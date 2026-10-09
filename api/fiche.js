import { createClient } from '@supabase/supabase-js';

const echapper = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const couper = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

// Aperçu de partage d'une fiche fournisseur (/f/<adresse-courte>).
// WhatsApp, Facebook et Google ne lancent pas le JavaScript du site : sans cette page, un lien partagé s'afficherait avec le titre
// générique. Ici on lit la page de base du site et on y remplace le titre, la description et l'image par ceux du fournisseur ;
// le site (React) prend ensuite le relais comme d'habitude. Si quelque chose échoue, on renvoie la page normale.
export default async function handler(req, res) {
  const slug = String(req.query.slug || '').toLowerCase().trim();
  const hote = req.headers['x-forwarded-host'] || req.headers.host;
  const base = (process.env.SITE_URL || `https://${hote}`).replace(/\/$/, '');

  let html;
  try {
    const r = await fetch(`${base}/index.html`);
    if (!r.ok) throw new Error('index indisponible');
    html = await r.text();
  } catch {
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
    return;
  }

  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const cle = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && cle && slug) {
      const supabase = createClient(url, cle);
      const { data: id } = await supabase.rpc('grossiste_id_par_slug', { p_slug: slug });
      if (id) {
        const [g, d, p] = await Promise.all([
          supabase.from('grossiste').select('nom, ville, categorie, logo_url, banniere_url, badge_verifie').eq('id', id).maybeSingle(),
          supabase.from('grossiste').select('description').eq('id', id).maybeSingle(),
          supabase.from('produit').select('nom, photo_url').eq('grossiste_id', id).eq('statut', 'publie').eq('actif', true).limit(3),
        ]);
        const f = g.data;
        if (f) {
          const produits = p.data || [];
          const titre = `${f.nom}, fournisseur à ${f.ville} | LOOHOO`;
          const description = couper(
            (d.data && d.data.description && d.data.description.trim())
              || `${f.nom} (${f.categorie}) à ${f.ville} : catalogue au prix de gros${produits.length ? ` (${produits.map((x) => x.nom).slice(0, 3).join(', ')})` : ''} et demande de devis sur LOOHOO.`,
            200,
          );
          let image = f.banniere_url || produits.find((x) => x.photo_url)?.photo_url || f.logo_url || `${base}/og-image.jpg`;
          if (image.includes('/storage/v1/object/public/')) {
            image = `${image.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=1200&height=630&resize=cover&quality=75`;
          }
          const adresse = `${base}/f/${slug}`;
          const balises = [
            `<meta property="og:type" content="profile" />`,
            `<meta property="og:site_name" content="LOOHOO Fournisseurs" />`,
            `<meta property="og:title" content="${echapper(titre)}" />`,
            `<meta property="og:description" content="${echapper(description)}" />`,
            `<meta property="og:url" content="${echapper(adresse)}" />`,
            `<meta property="og:image" content="${echapper(image)}" />`,
            `<meta name="twitter:card" content="summary_large_image" />`,
            `<meta name="twitter:image" content="${echapper(image)}" />`,
            `<meta name="description" content="${echapper(description)}" />`,
            `<link rel="canonical" href="${echapper(adresse)}" />`,
          ].join('\n    ');
          html = html
            .replace(/<title>[\s\S]*?<\/title>/i, `<title>${echapper(titre)}</title>`)
            .replace(/\s*<meta\s+(?:property|name)="(?:og:[^"]*|twitter:[^"]*|description)"[^>]*>/gi, '')
            .replace('</head>', `    ${balises}\n  </head>`);
        }
      }
    }
  } catch {
    // on garde la page de base
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.end(html);
}
