import { estUnRobot, couper, lire, imagePartage, pageAvecApercu, nombre } from '../../cloudflare/outils.js';

// Aperçu de partage d'une fiche produit (/produit/<id>), version Cloudflare Pages de api/fiche-produit.js :
// un lien envoyé sur WhatsApp affiche la photo, le nom et le prix. Les visiteurs reçoivent la page normale.
export async function onRequestGet(context) {
  const id = String(context.params.id || '');
  if (!estUnRobot(context.request) || !/^[0-9a-f-]{36}$/i.test(id)) return context.next();
  try {
    const base = new URL(context.request.url).origin;
    const filtre = `id=eq.${id}&statut=eq.publie&actif=eq.true`;
    let lignes = await lire(context.env, `produit?select=nom,description,photo_url,prix_gros_fcfa,moq,unite,paliers,grossiste(nom,ville,statut)&${filtre}`);
    if (!lignes) lignes = await lire(context.env, `produit?select=nom,description,photo_url,prix_gros_fcfa,moq,unite,grossiste(nom,ville,statut)&${filtre}`);
    const p = lignes?.[0];
    if (!p || p.grossiste?.statut !== 'publie') return context.next();

    const paliers = Array.isArray(p.paliers) ? p.paliers : [];
    const bas = paliers.length ? Math.min(Number(p.prix_gros_fcfa), ...paliers.map((x) => Number(x.prix))) : Number(p.prix_gros_fcfa);
    const prix = bas < Number(p.prix_gros_fcfa) ? `${nombre(bas)} à ${nombre(p.prix_gros_fcfa)} F CFA` : `${nombre(p.prix_gros_fcfa)} F CFA`;
    const description = couper(
      `${prix} par ${p.unite || 'pièce'}, minimum ${nombre(p.moq || 1)}. Vendu par ${p.grossiste.nom} à ${p.grossiste.ville}. `
        + (p.description ? p.description.replace(/\s+/g, ' ').trim() : 'Demandez un devis sur LOOHOO.'),
      200,
    );
    return pageAvecApercu(context, {
      titre: `${p.nom} en gros : ${prix} | LOOHOO`,
      description,
      image: imagePartage(p.photo_url, `${base}/og-image.jpg`),
      adresse: `${base}/produit/${id}`,
      type: 'product',
    });
  } catch {
    return context.next();
  }
}
