import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Factory, MapPin } from 'lucide-react';
import { recupererGrossiste, incrementerVueProfil } from '../api/fournisseurs.js';
import CarteProduit from '../components/CarteProduit.jsx';
import CaptureSortie from '../components/CaptureSortie.jsx';

export default function ProfilGrossiste() {
  const { id } = useParams();
  const [grossiste, setGrossiste] = useState(undefined);

  useEffect(() => {
    let annule = false;
    recupererGrossiste(id).then((g) => { if (!annule) setGrossiste(g); if (g) incrementerVueProfil(id); }).catch(() => setGrossiste(null));
    return () => { annule = true; };
  }, [id]);

  if (grossiste === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '400px' }} /></div></section>;
  }
  if (!grossiste) {
    return <section className="section"><div className="container"><h1 className="section-titre">Fournisseur introuvable.</h1></div></section>;
  }

  return (
    <>
      <div style={{ ...styles.banniere, backgroundImage: grossiste.banniere_url ? `url(${grossiste.banniere_url})` : 'none' }} />

      <section className="section" style={{ paddingTop: '0' }}>
        <div className="container">
          <Link to="/" style={styles.retour}><ArrowLeft size={16} /> Tous les produits</Link>

          <div style={styles.entete}>
            {grossiste.logo_url ? <img src={grossiste.logo_url} alt="" style={styles.logo} /> : <div style={{ ...styles.logo, background: 'var(--loo-papier-ombre)' }} />}
            <div>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem' }}>
                {grossiste.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={13} /> Vérifié</span>}
                {grossiste.est_fabricant && <span className="badge badge-fabricant"><Factory size={13} /> Fabricant local</span>}
              </div>
              <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', marginBottom: '0.3rem' }}>{grossiste.nom}</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', opacity: 0.75 }}>
                <MapPin size={14} /> {grossiste.commune ? `${grossiste.commune}, ` : ''}{grossiste.ville}
              </span>
            </div>
          </div>

          <h2 style={{ fontSize: '1.3rem', margin: '2rem 0 1.2rem' }}>
            Catalogue ({grossiste.produits.length} produit{grossiste.produits.length > 1 ? 's' : ''})
          </h2>

          {grossiste.produits.length === 0 ? (
            <p style={{ opacity: 0.7 }}>Le catalogue de ce fournisseur est en cours de constitution.</p>
          ) : (
            <div className="loo-fournisseurs-grille">
              {grossiste.produits.map((p) => (
                <CarteProduit key={p.id} p={{ ...p, grossiste_nom: grossiste.nom, badge_verifie: grossiste.badge_verifie }} />
              ))}
            </div>
          )}

          {grossiste.photos.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.2rem', margin: '2.4rem 0 1rem' }}>Photos de l'entreprise</h2>
              <div className="photos-grossiste">
                {grossiste.photos.map((url) => <img key={url} src={url} alt="" loading="lazy" />)}
              </div>
            </>
          )}
        </div>
      </section>
      <CaptureSortie recherche={grossiste.nom} />
    </>
  );
}

const styles = {
  banniere: { height: '220px', background: 'var(--gradient-marque)', backgroundSize: 'cover', backgroundPosition: 'center' },
  retour: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-rouge)', margin: '1.2rem 0 1.2rem' },
  entete: { display: 'flex', alignItems: 'flex-end', gap: '1.2rem', marginTop: '-48px' },
  logo: { width: '96px', height: '96px', borderRadius: '12px', objectFit: 'cover', border: '4px solid var(--loo-papier)' },
};