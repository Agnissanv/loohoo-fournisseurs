import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { grossisteIdParSlug } from '../api/fournisseurs.js';
import ProfilGrossiste from './ProfilGrossiste.jsx';

// Adresse courte d'un fournisseur (/f/kone-textiles) : on retrouve son identifiant puis on affiche sa fiche à la même adresse
export default function FicheParLien() {
  const { slug } = useParams();
  const [id, setId] = useState(undefined);

  useEffect(() => {
    let annule = false;
    setId(undefined);
    grossisteIdParSlug(slug).then((r) => { if (!annule) setId(r); });
    return () => { annule = true; };
  }, [slug]);

  if (id === undefined) return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '400px' }} /></div></section>;
  if (!id) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="section-titre">Fournisseur introuvable.</h1>
          <p className="section-intro">Ce lien n'est plus valable ou le fournisseur n'est pas encore publié.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1.2rem' }}>Voir les produits</Link>
        </div>
      </section>
    );
  }
  return <ProfilGrossiste idForce={id} />;
}
