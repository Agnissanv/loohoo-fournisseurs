import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { suivreSession, recupererMesStats } from '../api/fournisseurs.js';

export default function Statistiques() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [stats, setStats] = useState(undefined);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMesStats().then(setStats).catch((err) => setErreur(err.message));
  }, [session, navigate]);

  if (session === undefined || stats === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '300px' }} /></div></section>;
  }
  if (erreur) {
    return <section className="section"><div className="container"><p style={{ color: 'var(--loo-rouge)' }}>{erreur}</p></div></section>;
  }

  const maxJour = Math.max(1, ...stats.evolution.map((e) => e.nb));
  const maxProduit = Math.max(1, ...stats.top_produits.map((p) => p.nb));

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-titre">Statistiques</h1>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '1.6rem 0 2rem' }}>
          <CarteStat titre="Vues du profil" valeur={stats.vues_profil} />
          <CarteStat titre="Produits actifs" valeur={stats.produits_actifs} />
          <CarteStat titre="Demandes reçues" valeur={stats.contacts_total} />
          <CarteStat titre="Demandes (30 j)" valeur={stats.contacts_30_jours} />
        </div>

        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Demandes de contact — 30 derniers jours</h2>
        {stats.evolution.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Aucune demande sur cette période.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', marginBottom: '2.2rem' }}>
            {stats.evolution.map((e) => (
              <div key={e.jour} title={`${e.jour} : ${e.nb}`} style={{
                flex: 1, background: 'var(--loo-rouge)', borderRadius: '3px 3px 0 0',
                height: `${(e.nb / maxJour) * 100}%`, minHeight: '3px',
              }} />
            ))}
          </div>
        )}

        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Produits les plus demandés</h2>
        {stats.top_produits.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Pas encore assez de données.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem', maxWidth: '520px' }}>
            {stats.top_produits.map((p) => (
              <div key={p.nom}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                  <span>{p.nom}</span><strong>{p.nb}</strong>
                </div>
                <div style={{ background: 'var(--loo-papier-ombre)', borderRadius: '4px', height: '8px' }}>
                  <div style={{ width: `${(p.nb / maxProduit) * 100}%`, background: 'var(--loo-rouge)', height: '100%', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function CarteStat({ titre, valeur }) {
  return (
    <div className="carte" style={{ padding: '1rem 1.3rem', minWidth: '130px' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'var(--police-etiquette)' }}>{valeur}</div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{titre}</div>
    </div>
  );
}