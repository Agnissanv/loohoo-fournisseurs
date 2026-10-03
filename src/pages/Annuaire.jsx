import React, { useEffect, useState } from 'react';
import { rechercherProduits, recupererFiltres } from '../api/fournisseurs.js';
import CarteProduit from '../components/CarteProduit.jsx';
import CaptureSortie from '../components/CaptureSortie.jsx';

export default function Annuaire() {
  const [q, setQ] = useState('');
  const [categorie, setCategorie] = useState('');
  const [ville, setVille] = useState('');
  const [commune, setCommune] = useState('');
  const [filtres, setFiltres] = useState({ categories: [], villes: [], communes: [] });
  const [resultats, setResultats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => { recupererFiltres().then(setFiltres).catch(() => {}); }, []);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur(false);
    const delai = setTimeout(() => {
      rechercherProduits({ q, categorie, ville, commune })
        .then((liste) => { if (!annule) { setResultats(liste); setChargement(false); } })
        .catch(() => { if (!annule) { setErreur(true); setChargement(false); } });
    }, 350);
    return () => { annule = true; clearTimeout(delai); };
  }, [q, categorie, ville, commune]);

  const nb = resultats ? resultats.length : 0;

  return (
    <>
      <section style={styles.hero}>
        <div className="container">
          <span className="badge" style={styles.badgeMali}>Bientôt au Mali</span>
          <h1 style={styles.titre}>Le seul endroit où trouver un fournisseur vérifié.</h1>
          <p style={styles.sousTitre}>Recherchez directement le produit que vous voulez acheter en gros.</p>

          <div style={styles.recherche}>
            <input
              className="champ" style={{ flex: '1 1 320px' }} type="search" value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Que cherchez-vous ? (ex. sac à main, sérum visage, pagne…)"
            />
            <select className="champ" style={styles.select} value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              <option value="">Toutes les catégories</option>
              {filtres.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="champ" style={styles.select} value={ville} onChange={(e) => setVille(e.target.value)}>
              <option value="">Toutes les villes</option>
              {filtres.villes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            {filtres.communes.length > 0 && (
              <select className="champ" style={styles.select} value={commune} onChange={(e) => setCommune(e.target.value)}>
                <option value="">Toutes les communes</option>
                {filtres.communes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          {erreur && <p style={{ opacity: 0.75 }}>Impossible de charger les produits pour le moment.</p>}
          {!erreur && resultats === null && <SqueletteGrille />}
          {!erreur && resultats !== null && (
            nb === 0 ? (
              <p style={{ opacity: 0.75 }}>Aucun produit ne correspond à votre recherche pour l'instant.</p>
            ) : (
              <>
                <p className="etiquette" style={{ marginBottom: '1rem' }}>{nb} produit{nb > 1 ? 's' : ''}</p>
                <div className="loo-fournisseurs-grille" style={{ opacity: chargement ? 0.55 : 1 }}>
                  {resultats.map((p) => <CarteProduit key={p.id} p={p} />)}
                </div>
              </>
            )
          )}
        </div>
      </section>
      <CaptureSortie recherche={q} />
    </>
  );
}

function SqueletteGrille() {
  return (
    <div className="loo-fournisseurs-grille">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="carte" style={{ padding: '0.9rem' }}>
          <div className="loo-squelette" style={{ aspectRatio: '4 / 3', marginBottom: '0.7rem' }} />
          <div className="loo-squelette" style={{ width: '80%', height: '13px', marginBottom: '0.5rem' }} />
          <div className="loo-squelette" style={{ width: '45%', height: '13px' }} />
        </div>
      ))}
    </div>
  );
}

const styles = {
  hero: { background: 'var(--gradient-marque)', padding: '3.5rem 0 3rem', color: 'var(--loo-papier)' },
  badgeMali: { background: 'rgba(255,248,239,0.2)', color: 'var(--loo-papier)' },
  titre: { fontSize: 'clamp(2rem, 4.6vw, 3.2rem)', lineHeight: 1.08, margin: '1rem 0 0.8rem', color: 'var(--loo-papier)', maxWidth: '20ch' },
  sousTitre: { maxWidth: '520px', opacity: 0.92, margin: '0 0 1.8rem', fontSize: '1.05rem' },
  recherche: { display: 'flex', gap: '0.7rem', flexWrap: 'wrap' },
  select: { flex: '0 1 180px' },
};