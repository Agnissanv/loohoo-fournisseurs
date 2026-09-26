import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connecterFournisseur } from '../api/fournisseurs.js';

export default function Connexion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await connecterFournisseur(email, motDePasse);
      navigate('/tableau-de-bord');
    } catch {
      setErreur('E-mail ou mot de passe incorrect.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="section" style={{ maxWidth: '420px', margin: '0 auto' }}>
      <div className="container">
        <span className="etiquette">Espace fournisseur</span>
        <h1 className="section-titre">Connexion</h1>
        <form onSubmit={soumettre} style={{ display: 'grid', gap: '0.9rem', marginTop: '1.2rem' }}>
          <input className="champ" type="email" required placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input className="champ" type="password" required placeholder="Mot de passe" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" />
          {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{erreur}</p>}
          <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
            {envoi ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p style={{ marginTop: '1.2rem', fontSize: '0.9rem' }}>
          Pas encore de compte ?{' '}
          <Link to="/inscription" style={{ textDecoration: 'underline', fontWeight: 600 }}>Créer mon compte fournisseur</Link>
        </p>
      </div>
    </section>
  );
}