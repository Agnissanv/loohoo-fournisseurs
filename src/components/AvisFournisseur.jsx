import React, { useEffect, useState } from 'react';
import { recupererAvisPublics } from '../api/fournisseurs.js';
import { Etoiles } from './Etoiles.jsx';

// Avis laissés par des acheteurs après une affaire confirmée, validés par l'équipe. Rien ne s'affiche tant qu'il n'y en a pas.
export default function AvisFournisseur({ grossisteId }) {
  const [donnees, setDonnees] = useState(null);

  useEffect(() => {
    let annule = false;
    recupererAvisPublics(grossisteId).then((d) => { if (!annule) setDonnees(d); });
    return () => { annule = true; };
  }, [grossisteId]);

  if (!donnees || donnees.nombre === 0) return null;
  return (
    <section style={{ marginTop: '2.2rem' }} aria-labelledby="titre-avis">
      <h2 id="titre-avis" style={{ fontSize: '1.3rem', marginBottom: '0.4rem' }}>Avis des acheteurs</h2>
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 1rem', flexWrap: 'wrap' }}>
        <Etoiles note={donnees.moyenne} taille={20} />
        <strong>{donnees.moyenne.toLocaleString('fr-FR')} / 5</strong>
        <span style={{ opacity: 0.65, fontSize: '0.9rem' }}>{donnees.nombre} avis, tous liés à une affaire conclue sur LOOHOO</span>
      </p>
      <div style={{ display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
        {donnees.avis.map((a, i) => (
          <article key={i} className="carte" style={{ padding: '1rem 1.1rem' }}>
            <Etoiles note={a.note} />
            {a.commentaire && <p style={{ margin: '0.5rem 0', lineHeight: 1.55 }}>{a.commentaire}</p>}
            <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>
              {a.activite ? `${a.activite} · ` : 'Acheteur · '}{new Date(a.date_creation).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
