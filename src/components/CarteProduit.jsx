import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Package } from 'lucide-react';

export default function CarteProduit({ p }) {
  return (
    <Link to={`/produit/${p.id}`} className="carte" style={styles.carte}>
      <div style={styles.imageBloc}>
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.nom} style={styles.image} loading="lazy" />
        ) : (
          <Package size={28} color="var(--loo-orange)" />
        )}
      </div>
      <h3 style={styles.nom}>{p.nom}</h3>
      <div style={styles.fournisseur}>
        {p.badge_verifie && <BadgeCheck size={13} color="var(--loo-encre)" />}
        <span>{p.grossiste_nom}</span>
      </div>
      <div style={styles.prixLigne}>
        <span style={styles.prix}>{p.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA</span>
        {p.unite && <span style={{ opacity: 0.6 }}>/ {p.unite}</span>}
      </div>
      <span style={styles.moq}>Minimum : {p.moq}</span>
    </Link>
  );
}

const styles = {
  carte: { display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.9rem' },
  imageBloc: {
    aspectRatio: '4 / 3', background: 'var(--loo-papier-ombre)', borderRadius: '4px 14px 4px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  nom: { fontSize: '0.98rem', lineHeight: 1.25, margin: 0 },
  fournisseur: { display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', opacity: 0.7 },
  prixLigne: { display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.2rem' },
  prix: { fontFamily: 'var(--police-etiquette)', fontWeight: 600, color: 'var(--loo-rouge)', fontSize: '0.95rem' },
  moq: { fontSize: '0.78rem', opacity: 0.6 },
};