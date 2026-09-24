import React from 'react';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.ligne}>
        <span>© {new Date().getFullYear()} LOOHOO Fournisseurs</span>
        <nav style={styles.liens} aria-label="Informations légales">
          {/* Provisoire : pages légales de la landing, en attendant celles propres au module Fournisseurs */}
          <a href="https://looh-oo.com/mentions-legales" style={styles.lien}>Mentions légales</a>
          <a href="https://looh-oo.com/confidentialite" style={styles.lien}>Confidentialité</a>
          <a href="https://looh-oo.com/conditions" style={styles.lien}>Conditions d'utilisation</a>
          {/* Inscription fournisseur volontairement discrète, en pied de page (PDF §10) */}
          <a href="mailto:contact@looh-oo.com?subject=Référencer%20mon%20entreprise%20comme%20fournisseur" style={styles.lien}>
            Vous êtes fournisseur ?
          </a>
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