import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { recupererMesConversations, suivreSession } from '../api/fournisseurs.js';

export default function Conversations() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [liste, setListe] = useState(undefined);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMesConversations().then(setListe).catch((err) => setErreur(err.message));
  }, [session, navigate]);

  if (session === undefined || liste === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '200px' }} /></div></section>;
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="section-titre">Mes conversations</h1>
        {erreur && <p style={{ color: 'var(--loo-rouge)' }}>{erreur}</p>}
        {liste.length === 0 && <p style={{ opacity: 0.7 }}>Aucune conversation pour l'instant.</p>}

        <div style={{ display: 'grid', gap: '0.7rem' }}>
          {liste.map((c) => {
            const dernier = [...c.message].sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi))[0];
            const nonLus = c.message.filter((m) => !m.lu).length;
            return (
              <Link key={c.id} to={`/conversations/${c.id}`} className="carte" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <strong>{c.vendeur?.nom} ↔ {c.grossiste?.nom}</strong>
                  {c.produit?.nom && <span style={{ opacity: 0.7, fontSize: '0.85rem' }}> — {c.produit.nom}</span>}
                  {dernier && <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', opacity: 0.75 }}>{dernier.contenu.slice(0, 80)}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {nonLus > 0 && <span className="badge badge-verifie">{nonLus}</span>}
                  <MessageCircle size={18} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}