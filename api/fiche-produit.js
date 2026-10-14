import { createClient } from '@supabase/supabase-js';

const echapper = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const couper = (t, n) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);
const nombre = (n) => Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');

// Aperçu de partage d'une fiche produit (/produit/<id>), sur le même principe que api/fiche.js pour les fournisseurs :
// un lien envoyé sur WhatsApp affiche la photo, le nom et le prix du produit au lieu du titre générique du site.
// Le site (React) prend ensuite le relais. Si quelque chose échoue, on renvoie la page normale.
export default async function handler(req, res) {
  const id = String(req.query.id || '').trim();
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
    if (url && cle && /^[0-9a-f-]{36}$/i.test(id)) {
      const supabase = createClient(url, cle);
      let { data: p, error } = await supabase.from('produit')
        .select('nom, description, photo_url, prix_gros_fcfa, moq, unite, paliers, grossiste(nom, ville, statut)')
        .eq('id', id).eq('statut', 'publie').eq('actif', true).maybeSingle();
      if (error) { // colonne paliers absente (base pas à jour) : sans les paliers
        ({ data: p } = await supabase.from('produit')
          .select('nom, description, photo_url, prix_gros_fcfa, moq, unite, grossiste(nom, ville, statut)')
          .eq('id', id).eq('statut', 'publie').eq('actif', true).maybeSingle());
      }
      if (p && p.grossiste?.statut === 'publie') {
        const paliers = Array.isArray(p.paliers) ? p.paliers : [];
        const bas = paliers.length ? Math.min(Number(p.prix_gros_fcfa), ...paliers.map((x) => Number(x.prix))) : Number(p.prix_gros_fcfa);
        const prix = bas < Number(p.prix_gros_fcfa) ? `${nombre(bas)} à ${nombre(p.prix_gros_fcfa)} F CFA` : `${nombre(p.prix_gros_fcfa)} F CFA`;
        const unite = p.unite || 'pièce';
        const titre = `${p.nom} en gros : ${prix} | LOOHOO`;
        const description = couper(
          `${prix} par ${unite}, minimum ${nombre(p.moq || 1)}. Vendu par ${p.grossiste.nom} à ${p.grossiste.ville}. `
            + (p.description ? p.description.replace(/\s+/g, ' ').trim() : 'Demandez un devis sur LOOHOO.'),
          200,
        );
        let image = p.photo_url || `${base}/og-image.jpg`;
        if (image.includes('/storage/v1/object/public/')) {
          image = `${image.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=1200&height=630&resize=cover&quality=75`;
        }
        const adresse = `${base}/produit/${id}`;
        const balises = [
          `<meta property="og:type" content="product" />`,
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
          .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
          .replace('</head>', `    ${balises}\n  </head>`);
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
