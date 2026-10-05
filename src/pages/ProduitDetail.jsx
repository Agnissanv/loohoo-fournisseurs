import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Check, ChevronRight, Copy, Factory, MapPin, MessageCircle, Share2 } from 'lucide-react';
import { recupererProduitPublic, recupererAutresProduitsFournisseur, rechercherProduits } from '../api/fournisseurs.js';
import ModaleContact from '../components/ModaleContact.jsx';
import CarteProduit from '../components/CarteProduit.jsx';
import { noterVisite } from '../utils/suiviVisites.js';
import { useTitre } from '../utils/useTitre.js';

const formatPrix = (n) => Number(n).toLocaleString('fr-FR');
const formatPoids = (g) => (g >= 1000 ? `${(g / 1000).toLocaleString('fr-FR')} kg` : `${g} g`);

export default function ProduitDetail() {
  const { id } = useParams();
  const [produit, setProduit] = useState(undefined);
  const [photoActive, setPhotoActive] = useState(0);
  const [contactOuvert, setContactOuvert] = useState(false);
  const [memeFournisseur, setMemeFournisseur] = useState([]);
  const [similaires, setSimilaires] = useState([]);
  const [lienCopie, setLienCopie] = useState(false);

  useTitre(
    produit ? `${produit.nom} en gros` : null,
    produit ? `${produit.nom} : ${formatPrix(produit.prix_gros_fcfa)} F CFA, minimum ${produit.moq}. Demandez un devis à ${produit.grossiste?.nom}.` : null,
  );

  useEffect(() => {
    let annule = false;
    setProduit(undefined);
    setPhotoActive(0);
    window.scrollTo({ top: 0 });
    recupererProduitPublic(id).then((p) => {
      if (annule) return;
      setProduit(p);
      if (!p) return;
      if (p.grossiste) noterVisite({ grossisteId: p.grossiste.id, produitId: p.id });
      // Deux rangées de suggestions : du même fournisseur, puis dans la même catégorie. Elles ne bloquent jamais la fiche.
      recupererAutresProduitsFournisseur(p.grossiste.id, p.id).then((l) => { if (!annule) setMemeFournisseur(l); });
      if (p.categorie) {
        rechercherProduits({ categorie: p.categorie }).then((l) => {
          if (!annule) setSimilaires(l.filter((x) => x.id !== p.id).slice(0, 10));
        }).catch(() => {});
      }
    }).catch(() => { if (!annule) setProduit(null); });
    return () => { annule = true; };
  }, [id]);

  if (produit === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '400px' }} /></div></section>;
  }
  if (!produit) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="section-titre">Produit introuvable.</h1>
          <p className="section-intro">Il n'est plus disponible ou a été retiré par le fournisseur.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1.2rem' }}>Voir les autres produits</Link>
        </div>
      </section>
    );
  }

  const g = produit.grossiste;
  const lien = typeof window !== 'undefined' ? window.location.href : '';
  const dimensions = [produit.longueur_cm, produit.largeur_cm, produit.hauteur_cm].every((v) => v != null)
    ? `${produit.longueur_cm} × ${produit.largeur_cm} × ${produit.hauteur_cm} cm` : null;

  // Caractéristiques : on n'affiche que ce que le fournisseur a renseigné
  const specs = [
    ['Quantité minimale', `${produit.moq}${produit.unite ? ` ${produit.unite}${produit.moq > 1 && produit.unite !== 'kg' ? 's' : ''}` : ''}`],
    produit.prix_unitaire_fcfa != null && ['Prix à l’unité', `${formatPrix(produit.prix_unitaire_fcfa)} F CFA`],
    produit.stock_disponible != null && ['Stock disponible', `${formatPrix(produit.stock_disponible)}${produit.unite ? ` ${produit.unite}` : ''}`],
    produit.categorie && ['Catégorie', produit.categorie],
    produit.sous_categorie && ['Sous-catégorie', produit.sous_categorie],
    produit.poids_grammes != null && ['Poids d’une unité', formatPoids(produit.poids_grammes)],
    dimensions && ['Dimensions', dimensions],
    produit.sku && ['Référence', produit.sku],
  ].filter(Boolean);

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lien);
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    } catch { /* presse-papiers indisponible */ }
  }

  const texteWhatsApp = encodeURIComponent(`${produit.nom} à ${formatPrix(produit.prix_gros_fcfa)} F CFA (minimum ${produit.moq}) sur LOOHOO : ${lien}`);
  const marqueFournisseur = { grossiste_nom: g.nom, badge_verifie: g.badge_verifie };

  return (
    <section className="section fiche-avec-cta" style={{ paddingTop: '1.6rem' }}>
      <div className="container">
        <nav aria-label="Fil d'Ariane" style={styles.fil}>
          <Link to="/">Accueil</Link>
          {produit.categorie && <><ChevronRight size={14} /><Link to={`/?categorie=${encodeURIComponent(produit.categorie)}`}>{produit.categorie}</Link></>}
          <ChevronRight size={14} /><span aria-current="page">{produit.nom}</span>
        </nav>

        <div className="loo-fiche-produit">
          <div>
            <div style={styles.imagePrincipale}>
              {produit.photos[photoActive] ? (
                <img src={produit.photos[photoActive]} alt={produit.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--loo-papier-ombre)' }} />
              )}
            </div>
            {produit.photos.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                {produit.photos.map((url, i) => (
                  <button key={url} type="button" onClick={() => setPhotoActive(i)} aria-label={`Photo ${i + 1}`} style={{ ...styles.miniature, borderColor: i === photoActive ? 'var(--loo-rouge)' : 'var(--loo-papier-ombre)' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
            {produit.video_url && (
              <video src={produit.video_url} controls preload="metadata" style={{ width: '100%', borderRadius: 'var(--rayon-sm)', marginTop: '1rem' }} />
            )}
          </div>

          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', marginBottom: '0.5rem' }}>{produit.nom}</h1>
            <div style={styles.prixLigne}>
              <span style={styles.prix}>{formatPrix(produit.prix_gros_fcfa)} F CFA{produit.unite ? ` / ${produit.unite}` : ''}</span>
              <span style={styles.puce}>Minimum : {produit.moq}</span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>Prix de gros indicatif. Le fournisseur confirme son devis selon la quantité.</p>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', margin: '1.2rem 0' }}>
              <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)} style={{ flex: '1 1 220px', justifyContent: 'center' }}>
                <MessageCircle size={17} /> Demander un devis
              </button>
              <a className="btn btn-outline" href={`https://wa.me/?text=${texteWhatsApp}`} target="_blank" rel="noreferrer" aria-label="Partager sur WhatsApp"><Share2 size={16} /> Partager</a>
              <button type="button" className="btn btn-outline" onClick={copierLien} aria-label="Copier le lien">
                {lienCopie ? <><Check size={16} /> Copié</> : <Copy size={16} />}
              </button>
            </div>

            {produit.description && <p style={{ opacity: 0.85, lineHeight: 1.65, margin: '0 0 1.2rem', whiteSpace: 'pre-line' }}>{produit.description}</p>}

            <h2 style={{ fontSize: '1rem', margin: '0 0 0.6rem' }}>Caractéristiques</h2>
            <div className="fiche-specs">
              {specs.map(([k, v]) => <React.Fragment key={k}><div>{k}</div><div>{v}</div></React.Fragment>)}
            </div>

            {produit.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                {produit.tags.map((t) => (
                  <Link key={t} to={`/?q=${encodeURIComponent(t)}`} className="badge badge-fabricant" style={{ textTransform: 'none', letterSpacing: 0, fontFamily: 'inherit', fontSize: '0.78rem' }}>{t}</Link>
                ))}
              </div>
            )}

            <Link to={`/grossiste/${g.id}`} className="carte" style={styles.carteFournisseur}>
              {g.logo_url ? <img src={g.logo_url} alt="" style={styles.logo} /> : <div style={{ ...styles.logo, background: 'var(--loo-papier-ombre)' }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.74rem', opacity: 0.6 }}>Vendu par</div>
                <div style={{ display: 'flex', gap: '0.4rem', margin: '0.15rem 0', flexWrap: 'wrap' }}>
                  {g.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={12} /> Vérifié</span>}
                  {g.est_fabricant && <span className="badge badge-fabricant"><Factory size={12} /> Fabricant</span>}
                </div>
                <strong style={{ fontSize: '0.98rem' }}>{g.nom}</strong>
                <div style={{ fontSize: '0.82rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} /> {g.commune ? `${g.commune}, ${g.ville}` : g.ville}
                </div>
              </div>
              <ChevronRight size={18} style={{ marginLeft: 'auto', opacity: 0.5, flexShrink: 0 }} />
            </Link>
          </div>
        </div>

        {memeFournisseur.length > 0 && (
          <Rangee titre={`Autres produits de ${g.nom}`} lien={`/grossiste/${g.id}`} libelleLien="Voir tout le catalogue">
            {memeFournisseur.map((p) => <CarteProduit key={p.id} p={{ ...p, ...marqueFournisseur }} />)}
          </Rangee>
        )}
        {similaires.filter((p) => !memeFournisseur.some((m) => m.id === p.id)).length > 0 && (
          <Rangee titre="Produits similaires" lien={`/?categorie=${encodeURIComponent(produit.categorie)}`} libelleLien={`Tout voir en ${produit.categorie}`}>
            {similaires.filter((p) => !memeFournisseur.some((m) => m.id === p.id)).map((p) => <CarteProduit key={p.id} p={p} />)}
          </Rangee>
        )}
      </div>

      {/* Sur téléphone, le bouton principal reste toujours sous le pouce */}
      <div className="fiche-cta-mobile">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--police-etiquette)', fontWeight: 700, color: 'var(--loo-rouge)' }}>{formatPrix(produit.prix_gros_fcfa)} F CFA{produit.unite ? ` / ${produit.unite}` : ''}</div>
          <div style={{ fontSize: '0.74rem', opacity: 0.65 }}>Minimum : {produit.moq}</div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)}><MessageCircle size={16} /> Demander un devis</button>
      </div>

      {contactOuvert && (
        <ModaleContact grossiste={g} produit={{ id: produit.id, nom: produit.nom, unite: produit.unite, moq: produit.moq }} onClose={() => setContactOuvert(false)} />
      )}
    </section>
  );
}

function Rangee({ titre, lien, libelleLien, children }) {
  return (
    <div style={{ marginTop: '2.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.25rem' }}>{titre}</h2>
        <Link to={lien} style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--loo-rouge)' }}>{libelleLien} →</Link>
      </div>
      <div className="etal-rangee">{children}</div>
    </div>
  );
}

const styles = {
  fil: { display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.84rem', marginBottom: '1.2rem', opacity: 0.8 },
  imagePrincipale: { height: '360px', borderRadius: '4px 20px 4px 20px', overflow: 'hidden', background: 'var(--loo-papier-ombre)' },
  miniature: { width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '2px solid', padding: 0, cursor: 'pointer', background: 'none' },
  prixLigne: { display: 'flex', alignItems: 'baseline', gap: '0.8rem', flexWrap: 'wrap' },
  prix: { fontFamily: 'var(--police-etiquette)', fontWeight: 700, color: 'var(--loo-rouge)', fontSize: '1.4rem' },
  puce: { fontFamily: 'var(--police-etiquette)', fontSize: '0.85rem', opacity: 0.7 },
  carteFournisseur: { display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.9rem', marginTop: '1.4rem' },
  logo: { width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
};
