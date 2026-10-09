import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Factory, FileCheck2, Package, Repeat, Store } from 'lucide-react';
import { recupererChiffresPublics, recupererFournisseursALaUne } from '../api/fournisseurs.js';
import { Etoiles } from './Etoiles.jsx';
import ImageOptimisee from './ImageOptimisee.jsx';

const nombre = (n) => Number(n).toLocaleString('fr-FR');

// Chiffres réels du réseau, comptés dans la base
export function ChiffresPublics() {
  const [c, setC] = useState(null);
  useEffect(() => { recupererChiffresPublics().then(setC); }, []);
  if (!c) return null;
  const lignes = [
    [c.verifies, c.verifies > 1 ? 'Fournisseurs vérifiés' : 'Fournisseur vérifié'],
    [c.produits, c.produits > 1 ? 'Produits publiés' : 'Produit publié'],
    [c.pays, c.pays > 1 ? 'Pays couverts' : 'Pays couvert'],
  ];
  return (
    <section style={{ background: 'var(--loo-blanc)', borderBottom: '1px solid var(--loo-papier-ombre)' }} aria-label="LOOHOO en chiffres">
      <div className="container chiffres-publics">
        {lignes.map(([n, l]) => (
          <div key={l}><strong>{nombre(n)}</strong><span>{l}</span></div>
        ))}
      </div>
    </section>
  );
}

// Quelques fournisseurs publiés : vérifiés d'abord, avec leur note et leur prix de gros le plus bas
export function FournisseursALaUne() {
  const [liste, setListe] = useState(null);
  useEffect(() => { recupererFournisseursALaUne(4).then(setListe); }, []);
  if (!liste || liste.length === 0) return null;
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Fournisseurs à la une</h2>
        <div className="a-la-une-grille">
          {liste.map((f) => {
            const initiales = f.nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();
            return (
              <Link key={f.id} to={`/grossiste/${f.id}`} className="carte a-la-une-carte">
                <div className="a-la-une-haut">
                  {f.logo_url
                    ? <ImageOptimisee src={f.logo_url} largeur={120} />
                    : <span className="a-la-une-initiales" aria-hidden="true">{initiales}</span>}
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', lineHeight: 1.25 }}>{f.nom}</strong>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{f.ville}{f.categorie ? ` · ${f.categorie}` : ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: '1.6rem' }}>
                  {f.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={13} /> Vérifié</span>}
                  {f.est_fabricant && <span className="badge badge-fabricant"><Factory size={13} /> Fabricant local</span>}
                </div>
                {f.nb_avis > 0
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}><Etoiles note={Number(f.note)} taille={14} /><strong>{Number(f.note).toLocaleString('fr-FR')}</strong><span style={{ opacity: 0.6 }}>({f.nb_avis} avis)</span></div>
                  : <div style={{ fontSize: '0.8rem', opacity: 0.55 }}>Pas encore d'avis</div>}
                <div style={{ fontSize: '0.85rem' }}>
                  À partir de <strong style={{ color: 'var(--loo-rouge)' }}>{nombre(f.prix_min)} F CFA</strong>
                  <span style={{ opacity: 0.65 }}> · minimum {f.moq_prix_min}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const CONTROLES = [
  [FileCheck2, "Pièce d'identité et documents administratifs vérifiés"],
  [Package, 'Photos du stock réel contrôlées par notre équipe'],
  [Store, 'Cohérence du local et de la ville déclarée vérifiée'],
  [Repeat, 'Fiabilité suivie dans le temps : un profil peut être suspendu en cas d\'écart'],
];

// Ce que veut dire « vérifié », en clair : chaque ligne correspond à un contrôle que fait réellement l'équipe
export function VerifieExplication() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="verifie-bloc">
          <h2>Que veut dire « vérifié » ?</h2>
          <p>Chaque badge est le résultat d'un vrai contrôle.</p>
          <ul>
            {CONTROLES.map(([Icone, texte]) => (
              <li key={texte}><Icone size={20} aria-hidden="true" /> <span>{texte}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// Appel aux fournisseurs, en bas de page
export function RejoindreReseau() {
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 0.3rem', opacity: 0.7 }}>Vous êtes fournisseur et vous avez du stock disponible ?</p>
        <Link to="/devenir-fournisseur" style={{ color: 'var(--loo-rouge)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Rejoindre le réseau de fournisseurs LOOHOO →</Link>
      </div>
    </section>
  );
}
