import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { rechercherGrossistes, recupererFiltres } from '../api/fournisseurs.js';
import CarteGrossiste from '../components/CarteGrossiste.jsx';

export default function Annuaire() {
  const [q, setQ] = useState('');
  const [categorie, setCategorie] = useState('');
  const [ville, setVille] = useState('');
  const [commune, setCommune] = useState('');
  const [filtres, setFiltres] = useState({ categories: [], villes: [], communes: [] });
  const [resultats, setResultats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    recupererFiltres().then(setFiltres).catch(() => {});
  }, []);

  // Recherche avec un petit délai pour ne pas interroger la base à chaque lettre tapée
  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur(false);
    const delai = setTimeout(() => {
      rechercherGrossistes({ q, categorie, ville, commune })
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
          <p style={styles.sousTitre}>
            La marketplace des fournisseurs — Côte d'Ivoire aujourd'hui, l'Afrique demain.
          </p>

          <div style={styles.recherche}>
            <div style={styles.champRecherche}>
              <Search size={18} style={styles.iconeRecherche} />
              <input
                className="champ"
                style={{ paddingLeft: '2.8em' }}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Que cherchez-vous ? (ex. sac à main, sérum visage, pagne…)"
                aria-label="Rechercher un produit"
              />
            </div>
            <select className="champ" style={styles.select} value={categorie} onChange={(e) => setCategorie(e.target.value)} aria-label="Catégorie">
              <option value="">Toutes les catégories</option>
              {filtres.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="champ" style={styles.select} value={ville} onChange={(e) => setVille(e.target.value)} aria-label="Ville">
              <option value="">Toutes les villes</option>
              {filtres.villes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            {filtres.communes.length > 0 && (
              <select className="champ" style={styles.select} value={commune} onChange={(e) => setCommune(e.target.value)} aria-label="Commune">
                <option value="">Toutes les communes</option>
                {filtres.communes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: '2.5rem' }}>
        <div className="container">
          {erreur && (
            <p style={{ opacity: 0.75 }}>Impossible de charger les fournisseurs pour le moment. Réessayez dans un instant.</p>
          )}

          {!erreur && resultats === null && <SqueletteGrille />}

          {!erreur && resultats !== null && (
            nb === 0 ? (
              <p style={{ opacity: 0.75 }}>Aucun fournisseur ne correspond à votre recherche pour l'instant.</p>
            ) : (
              <>
                <p className="etiquette" style={{ marginBottom: '1rem' }}>
                  {nb} fournisseur{nb > 1 ? 's' : ''}
                </p>
                <div className="grille-grossistes" style={{ opacity: chargement ? 0.55 : 1, transition: 'opacity 0.15s' }}>
                  {resultats.map((g) => <CarteGrossiste key={g.id} grossiste={g} />)}
                </div>
              </>
            )
          )}
        </div>
      </section>
    </>
  );
}

function SqueletteGrille() {
  return (
    <div className="grille-grossistes">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="carte" style={{ padding: '0.9rem' }}>
          <div className="loo-squelette" style={{ aspectRatio: '4 / 3', marginBottom: '0.8rem' }} />
          <div className="loo-squelette" style={{ width: '70%', height: '14px', marginBottom: '0.5rem' }} />
          <div className="loo-squelette" style={{ width: '40%', height: '12px' }} />
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
  champRecherche: { position: 'relative', flex: '1 1 320px' },
  iconeRecherche: { position: 'absolute', left: '1em', top: '50%', transform: 'translateY(-50%)', color: 'var(--loo-encre)', opacity: 0.5 },
  select: { flex: '0 1 200px' },
};