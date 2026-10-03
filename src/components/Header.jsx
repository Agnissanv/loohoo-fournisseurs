import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { suivreSession, recupererMonRole, compterMessagesNonLus } from '../api/fournisseurs.js';

export default function Header() {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [nonLus, setNonLus] = useState(0);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (!session) { setRole(null); setNonLus(0); return; }
    recupererMonRole().then((r) => {
      setRole(r.role);
      if (r.role) compterMessagesNonLus(r.role).then(setNonLus);
    });
  }, [session]);

  return (
    <header style={styles.header}>
      <div className="container" style={styles.barre}>
        <Link to="/" style={styles.logoLigne}>
          <img src="/logo.jpeg" alt="LOOHOO" style={styles.logo} width="38" height="38" />
          <span style={styles.logoTexte}>LOOHOO</span>
          <span className="etiquette" style={{ marginLeft: '0.2rem' }}>Fournisseurs</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem' }}>
          {session ? (
            <Link to="/conversations" style={styles.lien}>
              Mes conversations
              {nonLus > 0 && (
                <span className="badge" style={{ background: 'var(--loo-rouge)', color: '#fff', marginLeft: '0.4rem' }}>{nonLus}</span>
              )}
            </Link>
          ) : (
            <Link to="/connexion" style={styles.lien}>Espace fournisseur</Link>
          )}
          <a href="https://looh-oo.com" style={styles.lien}>← looh-oo.com</a>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255, 248, 239, 0.9)',
    backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--loo-papier-ombre)',
  },
  barre: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem' },
  logoLigne: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  logo: { borderRadius: '8px 8px 8px 2px' },
  logoTexte: { fontFamily: 'var(--police-affiche)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--loo-encre)' },
  lien: { fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-encre)', display: 'inline-flex', alignItems: 'center' },
};