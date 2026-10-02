import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { compterMessagesNonLus } from '../api/fournisseurs.js';

export default function NavFournisseur() {
  const { pathname } = useLocation();
  const [nonLus, setNonLus] = useState(0);

  useEffect(() => {
    compterMessagesNonLus('fournisseur').then(setNonLus);
  }, [pathname]);

  const lien = (chemin) => ({
    fontWeight: 600, fontSize: '0.88rem', padding: '0.4em 0.9em', borderRadius: 'var(--rayon-sm)',
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
    background: pathname === chemin ? 'var(--loo-encre)' : 'transparent',
    color: pathname === chemin ? 'var(--loo-papier)' : 'var(--loo-encre)',
  });

  return (
    <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.6rem', flexWrap: 'wrap' }}>
      <Link to="/tableau-de-bord" style={lien('/tableau-de-bord')}>Tableau de bord</Link>
      <Link to="/mediatheque" style={lien('/mediatheque')}>Médiathèque</Link>
      <Link to="/profil" style={lien('/profil')}>Mon profil</Link>
      <Link to="/statistiques" style={lien('/statistiques')}>Statistiques</Link>
      <Link to="/conversations" style={lien('/conversations')}>
        Messages
        {nonLus > 0 && (
          <span className="badge" style={{ background: 'var(--loo-rouge)', color: '#fff' }}>{nonLus}</span>
        )}
      </Link>
    </nav>
  );
}