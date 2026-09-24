import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Factory, MapPin, Package } from 'lucide-react';
import { optimiserImageCloudinary } from '../utils/cloudinaryOptimize.js';

export default function CarteGrossiste({ grossiste }) {
  const g = grossiste;

  return (
    <Link to={`/grossiste/${g.id}`} className="carte" style={styles.carte}>
      <div style={styles.imageBloc}>
        {g.photo ? (
          <img src={optimiserImageCloudinary(g.photo, 500)} alt={g.nom} style={styles.image} loading="lazy" />
        ) : (
          <Package size={28} color="var(--loo-orange)" />
        )}
      </div>

      <div style={styles.badges}>
        {g.badge_verifie && (
          <span className="badge badge-verifie"><BadgeCheck size={13} /> Vérifié</span>
        )}
        {g.est_fabricant && (
          <span className="badge badge-fabricant"><Factory size={13} /> Fabricant local</span>
        )}
      </div>

      <h3 style={styles.nom}>{g.nom}</h3>
      <span className="etiquette" style={{ color: 'var(--loo-encre)', opacity: 0.6 }}>{g.categorie}</span>

      <div style={styles.pied}>
        <span style={styles.info}><MapPin size={14} /> {g.ville}</span>
        <span style={styles.info}>
          <Package size={14} /> {g.nb_produits} produit{g.nb_produits > 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}

const styles = {
  carte: { display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.9rem' },
  imageBloc: {
    aspectRatio: '4 / 3', background: 'var(--loo-papier-ombre)', borderRadius: '4px 14px 4px 14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  image: { width: '100%', height: '100%', objectFit: 'cover' },
  badges: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: '1.6rem' },
  nom: { fontSize: '1.02rem', lineHeight: 1.25 },
  pied: { display: 'flex', justifyContent: 'space-between', gap: '0.6rem', marginTop: '0.3rem', flexWrap: 'wrap' },
  info: { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', opacity: 0.75 },
};