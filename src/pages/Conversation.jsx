import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { suivreSession, recupererMessages, envoyerMessage, suivreMessages, marquerMessagesLus, recupererMonRole } from '../api/fournisseurs.js';

export default function Conversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [messages, setMessages] = useState(undefined);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const fin = useRef(null);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonRole().then((r) => setRole(r.role));
    recupererMessages(id).then(setMessages).catch((err) => setErreur(err.message));
    return suivreMessages(id, (nouveau) => setMessages((m) => [...(m || []), nouveau]));
  }, [session, id, navigate]);

  useEffect(() => {
    if (role) marquerMessagesLus(id, role).catch(() => {});
  }, [id, role, messages]);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function envoyer(e) {
    e.preventDefault();
    if (!texte.trim()) return;
    setEnvoi(true);
    try {
      await envoyerMessage(id, texte.trim());
      setTexte('');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  if (session === undefined || messages === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '300px' }} /></div></section>;
  }

  return (
    <section className="section" style={{ paddingBottom: '1.5rem' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <h1 className="section-titre" style={{ fontSize: '1.4rem' }}>Conversation</h1>
        {erreur && <p style={{ color: 'var(--loo-rouge)' }}>{erreur}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '55vh', overflowY: 'auto', padding: '0.5rem 0' }}>
          {messages.map((m) => (
            <div key={m.id} style={{
              alignSelf: m.expediteur === role ? 'flex-end' : 'flex-start',
              background: m.expediteur === role ? 'var(--loo-encre)' : 'var(--loo-papier-ombre)',
              color: m.expediteur === role ? 'var(--loo-papier)' : 'var(--loo-encre)',
              padding: '0.6em 0.9em', borderRadius: 'var(--rayon-sm)', maxWidth: '75%',
            }}>
              <p style={{ margin: 0, fontSize: '0.92rem' }}>{m.contenu}</p>
            </div>
          ))}
          <div ref={fin} />
        </div>

        <form onSubmit={envoyer} style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem' }}>
          <input className="champ" placeholder="Votre message…" value={texte} onChange={(e) => setTexte(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={envoi || !texte.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}