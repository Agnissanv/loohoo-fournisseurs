import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { suivreSession, recupererMonRole, deconnecterFournisseur, compterMessagesNonLus } from '../api/fournisseurs.js';

export default function Header() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [identite, setIdentite] = useState(null); // null tant qu'on ne sait pas, { role, nom } sinon
  const [nonLus, setNonLus] = useState(0);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (!session) { setIdentite(null); setNonLus(0); return; }
    recupererMonRole().then((r) => {
      if (r.role) {
        setIdentite({ role: r.role, nom: r.profil?.nom });
        compterMessagesNonLus(r.role).then(setNonLus);
      } else {
        setIdentite(null);
      }
    });
  }, [session]);

  async function seDeconnecter() {
    await deconnecterFournisseur();
    navigate('/');
  }

  return (
    <header style={styles.header}>
      <div className="container" style={styles.barre}>
        <Link to="/" style={styles.logoLigne}>
          <img src="/logo.jpeg" alt="LOOHOO" style={styles.logo} width="38" height="38" />
          <span style={styles.logoTexte}>LOOHOO</span>
          <span className="etiquette" style={{ marginLeft: '0.2rem' }}>Fournisseurs</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
          {session === undefined ? null : identite ? (
            <>
              <span style={{ fontSize: '0.82rem', opacity: 0.55 }}>
                Connecté{identite.role === 'fournisseur' ? ' en tant que fournisseur' : ''} — {identite.nom}
              </span>
              {identite.role === 'fournisseur' && (
                <Link to="/tableau-de-bord" style={styles.lien}>Tableau de bord</Link>
              )}
              <Link to="/conversations" style={styles.lien}>
                Mes conversations
                {nonLus > 0 && <span className="badge" style={{ background: 'var(--loo-rouge)', color: '#fff', marginLeft: '0.4rem' }}>{nonLus}</span>}
              </Link>
              <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.9em', fontSize: '0.82rem' }} onClick={seDeconnecter}>
                <LogOut size={14} /> Déconnexion
              </button>
            </>
          ) : (
            <Link to="/connexion" className="btn btn-primary" style={{ padding: '0.5em 1.1em', fontSize: '0.85rem', border: 0 }}>
              Se connecter
            </Link>
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
  barre: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', flexWrap: 'wrap', gap: '0.8rem' },
  logoLigne: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  logo: { borderRadius: '8px 8px 8px 2px' },
  logoTexte: { fontFamily: 'var(--police-affiche)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--loo-encre)' },
  lien: { fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-encre)', display: 'inline-flex', alignItems: 'center' },
};