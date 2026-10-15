import { estUnRobot, couper, lire, appeler, imagePartage, pageAvecApercu } from '../../cloudflare/outils.js';

// Aperçu de partage d'une fiche fournisseur (/f/<adresse-courte>), version Cloudflare Pages de api/fiche.js.
// Les visiteurs reçoivent la page normale ; seuls les robots (WhatsApp, Facebook, Google…) reçoivent les balises du fournisseur.
export async function onRequestGet(context) {
  if (!estUnRobot(context.request)) return context.next();
  try {
    const slug = String(context.params.slug || '').toLowerCase().trim();
    const base = new URL(context.request.url).origin;
    const id = slug ? await appeler(context.env, 'grossiste_id_par_slug', { p_slug: slug }) : null;
    if (!id) return context.next();
    const [g, d, p] = await Promise.all([
      lire(context.env, `grossiste?select=nom,ville,categorie,logo_url,banniere_url&id=eq.${id}`),
      lire(context.env, `grossiste?select=description&id=eq.${id}`),
      lire(context.env, `produit?select=nom,photo_url&grossiste_id=eq.${id}&statut=eq.publie&actif=eq.true&limit=3`),
    ]);
    const f = g?.[0];
    if (!f) return context.next();
    const produits = p || [];
    const description = couper(
      d?.[0]?.description?.trim()
        || `${f.nom} (${f.categorie}) à ${f.ville} : catalogue au prix de gros${produits.length ? ` (${produits.map((x) => x.nom).join(', ')})` : ''} et demande de devis sur LOOHOO.`,
      200,
    );
    return pageAvecApercu(context, {
      titre: `${f.nom}, fournisseur à ${f.ville} | LOOHOO`,
      description,
      image: imagePartage(f.banniere_url || produits.find((x) => x.photo_url)?.photo_url || f.logo_url, `${base}/og-image.jpg`),
      adresse: `${base}/f/${slug}`,
      type: 'profile',
    });
  } catch {
    return context.next();
  }
}
