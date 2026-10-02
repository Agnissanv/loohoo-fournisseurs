import React, { useEffect, useState } from 'react';
import { X, Mail } from 'lucide-react';
import { capturerLead, suivreSession } from '../api/fournisseurs.js';

const CLE_SESSION = 'loohoo_sortie_proposee';

export default function CaptureSortie({ recherche }) {
  const [visible, setVisible] = useState(false);
  const [dejaConnecte, setDejaConnecte] = useState(true); // tant qu'on n'a pas vérifié, on n'affiche rien par prudence
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  useEffect(() => suivreSession((s) => setDejaConnecte(!!s)), []);

  useEffect(() => {
    if (dejaConnecte || sessionStorage.getItem(CLE_SESSION)) return undefined;

    function surSortie(e) {
      if (e.clientY <= 0) {
        setVisible(true);
        sessionStorage.setItem(CLE_SESSION, '1');
      }
    }
    document.addEventListener('mouseleave', surSortie);
    return () => document.removeEventListener('mouseleave', surSortie);
  }, [dejaConnecte]);

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await capturerLead(email, recherche);
      setEnvoye(true);
    } catch {
      setVisible(false); // capture optionnelle : un échec ne doit jamais gêner la navigation
    } finally {
      setEnvoi(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="modale-fond" onClick={() => setVisible(false)}>
      <div className="modale" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modale-fermer" onClick={() => setVisible(false)} aria-label="Fermer"><X size={20} /></button>
        {envoye ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <Mail size={32} color="var(--loo-rouge)" />
            <h2 style={{ fontSize: '1.15rem', margin: '0.8rem 0 0.4rem' }}>C'est noté !</h2>
            <p style={{ opacity: 0.75 }}>Nous vous préviendrons des nouveaux fournisseurs correspondants.</p>
          </div>
        ) : (
          <form onSubmit={soumettre}>
            <span className="etiquette">Avant de partir</span>
            <h2 style={{ fontSize: '1.15rem', margin: '0.3rem 0 0.6rem' }}>Pas trouvé votre bonheur ?</h2>
            <p style={{ opacity: 0.75, fontSize: '0.9rem', marginBottom: '1rem' }}>
              Laissez votre e-mail pour être averti des nouveaux fournisseurs correspondant à votre recherche.
            </p>
            <input className="champ" type="email" required placeholder="Votre e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="btn btn-primary" disabled={envoi} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
              {envoi ? 'Envoi…' : 'Me prévenir'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}