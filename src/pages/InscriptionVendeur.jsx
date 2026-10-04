import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inscrireVendeur } from '../api/fournisseurs.js';

export default function InscriptionVendeur() {
  const navigate = useNavigate();
  const [champs, setChamps] = useState({ nom: '', telephone: '', activite: '', email: '', motDePasse: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.value }));

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await inscrireVendeur({
        email: champs.email, password: champs.motDePasse,
        nom: champs.nom, telephone: champs.telephone, activite: champs.activite,
      });
      navigate('/');
    } catch (err) {
      setErreur(err.message || "Impossible de créer le compte pour le moment.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="section" style={{ maxWidth: '420px', margin: '0 auto' }}>
      <div className="container">
        <span className="etiquette">LOOHOO Fournisseurs</span>
        <h1 className="section-titre">Créer un compte</h1>
        <p className="section-intro" style={{ marginBottom: '1.5rem' }}>
          Pour contacter des fournisseurs et retrouver vos conversations.
        </p>
        <form onSubmit={soumettre} style={{ display: 'grid', gap: '0.9rem' }}>
          <input className="champ" required placeholder="Votre nom" value={champs.nom} onChange={maj('nom')} />
          <input className="champ" required type="tel" placeholder="Téléphone" value={champs.telephone} onChange={maj('telephone')} />
          <input className="champ" placeholder="Votre activité (facultatif)" value={champs.activite} onChange={maj('activite')} />
          <input className="champ" required type="email" placeholder="E-mail" value={champs.email} onChange={maj('email')} autoComplete="email" />
          <input className="champ" required type="password" minLength={8} placeholder="Mot de passe (8 caractères min.)" value={champs.motDePasse} onChange={maj('motDePasse')} autoComplete="new-password" />
          {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{erreur}</p>}
          <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
            {envoi ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
        <p style={{ marginTop: '1.2rem', fontSize: '0.9rem' }}>
          Déjà inscrit ? <Link to="/connexion" style={{ textDecoration: 'underline', fontWeight: 600 }}>Se connecter</Link>
        </p>
      </div>
    </section>
  );
}