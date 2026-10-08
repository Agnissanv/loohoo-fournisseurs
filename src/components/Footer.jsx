import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.ligne}>
        <span>© {new Date().getFullYear()} LOOHOO Fournisseurs</span>
        <nav style={styles.liens} aria-label="Informations légales">
          <Link to="/mentions-legales" style={styles.lien}>Mentions légales</Link>
          <Link to="/confidentialite" style={styles.lien}>Confidentialité</Link>
          <Link to="/conditions" style={styles.lien}>Conditions d'utilisation</Link>
          {/* Inscription fournisseur volontairement discrète, en pied de page (PDF §10) */}
          <Link to="/calculateur-marge" style={styles.lien}>Calculateur de marge</Link>
          <Link to="/devenir-fournisseur" style={styles.lien}>Vous êtes fournisseur ?</Link>
        </nav>
        <a href="https://www.agnissanisaac.com/" target="_blank" rel="noreferrer" style={styles.lien}>Créé par Code A-Z</a>
      </div>
    </footer>
  );
}

const styles = {
  footer: { background: 'var(--loo-encre)', color: 'var(--loo-papier)', marginTop: '3rem' },
  ligne: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
    padding: '1.4rem 1.5rem', fontSize: '0.78rem', fontFamily: 'var(--police-etiquette)',
  },
  liens: { display: 'flex', gap: '1.2rem', flexWrap: 'wrap' },
  lien: { color: 'inherit', opacity: 0.8, textDecoration: 'none', borderBottom: '1px solid rgba(255,248,239,0.3)' },
};