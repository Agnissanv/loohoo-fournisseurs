import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { suivreSession, changerMotDePasse, recupererMonRole } from '../api/fournisseurs.js';

export default function NouveauMotDePasse() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [delaiDepasse, setDelaiDepasse] = useState(false);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  // Le lien de récupération met un court instant à ouvrir la session : on laisse 3 s avant de conclure qu'il est invalide
  useEffect(() => {
    const t = setTimeout(() => setDelaiDepasse(true), 3000);
    return () => clearTimeout(t);
  }, []);

  async function soumettre(e) {
    e.preventDefault();
    if (motDePasse !== confirmation) { setErreur('Les deux mots de passe ne correspondent pas.'); return; }
    setEnvoi(true);
    setErreur('');
    try {
      await changerMotDePasse(motDePasse);
      const { role } = await recupererMonRole();
      navigate(role === 'fournisseur' ? '/tableau-de-bord' : '/conversations');
    } catch (err) {
      setErreur(err.message || 'Impossible de changer le mot de passe pour le moment.');
    } finally {
      setEnvoi(false);
    }
  }

  const pret = !!session;
  const invalide = !session && delaiDepasse;

  return (
    <section className="section" style={{ maxWidth: '420px', margin: '0 auto' }}>
      <div className="container">
        <span className="etiquette">Espace LOOHOO</span>
        <h1 className="section-titre">Nouveau mot de passe</h1>

        {!pret && !invalide && <div className="loo-squelette" style={{ height: '140px', marginTop: '1.2rem' }} />}

        {invalide && (
          <>
            <p style={{ marginTop: '1.2rem', lineHeight: 1.6 }}>
              Ce lien n'est plus valable (il a expiré ou a déjà été utilisé). Demandez-en un nouveau.
            </p>
            <Link to="/mot-de-passe-oublie" className="btn btn-primary" style={{ marginTop: '1rem' }}>Demander un nouveau lien</Link>
          </>
        )}

        {pret && (
          <form onSubmit={soumettre} style={{ display: 'grid', gap: '0.9rem', marginTop: '1.2rem' }}>
            <input className="champ" type="password" required minLength={8} placeholder="Nouveau mot de passe (8 caractères minimum)" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="new-password" />
            <input className="champ" type="password" required minLength={8} placeholder="Confirmez le mot de passe" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" />
            {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{erreur}</p>}
            <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
              {envoi ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
