import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Factory, MapPin, MessageCircle } from 'lucide-react';
import { recupererProduitPublic } from '../api/fournisseurs.js';
import ModaleContact from '../components/ModaleContact.jsx';
import { noterVisite } from '../utils/suiviVisites.js';

export default function ProduitDetail() {
  const { id } = useParams();
  const [produit, setProduit] = useState(undefined);
  const [photoActive, setPhotoActive] = useState(0);
  const [contactOuvert, setContactOuvert] = useState(false);

  useEffect(() => {
    let annule = false;
    recupererProduitPublic(id).then((p) => { if (!annule) setProduit(p); if (p?.grossiste) noterVisite({ grossisteId: p.grossiste.id, produitId: p.id }); }).catch(() => setProduit(null));
    return () => { annule = true; };
  }, [id]);

  if (produit === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '400px' }} /></div></section>;
  }
  if (!produit) {
    return <section className="section"><div className="container"><h1 className="section-titre">Produit introuvable.</h1></div></section>;
  }

  const g = produit.grossiste;

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <div className="container">
        <Link to="/" style={styles.retour}><ArrowLeft size={16} /> Tous les produits</Link>

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
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                {produit.photos.map((url, i) => (
                  <button key={url} type="button" onClick={() => setPhotoActive(i)} style={{ ...styles.miniature, borderColor: i === photoActive ? 'var(--loo-rouge)' : 'var(--loo-papier-ombre)' }}>
                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
            {produit.video_url && (
              <video src={produit.video_url} controls style={{ width: '100%', borderRadius: 'var(--rayon-sm)', marginTop: '1rem' }} />
            )}
          </div>

          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', marginBottom: '0.5rem' }}>{produit.nom}</h1>
            <div style={styles.prixLigne}>
              <span style={styles.prix}>{produit.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA{produit.unite ? ` / ${produit.unite}` : ''}</span>
              <span style={styles.puce}>Minimum : {produit.moq}</span>
            </div>
            {produit.description && <p style={{ opacity: 0.8, lineHeight: 1.6, margin: '1rem 0' }}>{produit.description}</p>}

            <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)} style={{ width: '100%', justifyContent: 'center', marginBottom: '1.4rem' }}>
              <MessageCircle size={17} /> Contacter le fournisseur
            </button>

            <Link to={`/grossiste/${g.id}`} className="carte" style={styles.carteFournisseur}>
              {g.logo_url ? <img src={g.logo_url} alt="" style={styles.logo} /> : <div style={{ ...styles.logo, background: 'var(--loo-papier-ombre)' }} />}
              <div>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  {g.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={12} /> Vérifié</span>}
                  {g.est_fabricant && <span className="badge badge-fabricant"><Factory size={12} /> Fabricant</span>}
                </div>
                <strong style={{ fontSize: '0.95rem' }}>{g.nom}</strong>
                <div style={{ fontSize: '0.82rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <MapPin size={13} /> {g.commune ? `${g.commune}, ${g.ville}` : g.ville}
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {contactOuvert && (
        <ModaleContact grossiste={g} produit={{ id: produit.id, nom: produit.nom, unite: produit.unite, moq: produit.moq }} onClose={() => setContactOuvert(false)} />
      )}
    </section>
  );
}

const styles = {
  retour: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-rouge)', marginBottom: '1.5rem' },
  imagePrincipale: { height: '360px', borderRadius: '4px 20px 4px 20px', overflow: 'hidden', background: 'var(--loo-papier-ombre)' },
  miniature: { width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '2px solid', padding: 0, cursor: 'pointer', background: 'none' },
  prixLigne: { display: 'flex', alignItems: 'baseline', gap: '0.8rem', flexWrap: 'wrap' },
  prix: { fontFamily: 'var(--police-etiquette)', fontWeight: 700, color: 'var(--loo-rouge)', fontSize: '1.3rem' },
  puce: { fontFamily: 'var(--police-etiquette)', fontSize: '0.85rem', opacity: 0.7 },
  carteFournisseur: { display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.9rem' },
  logo: { width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
};