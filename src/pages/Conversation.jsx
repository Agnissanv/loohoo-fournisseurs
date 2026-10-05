import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import {
  suivreSession, recupererMessages, envoyerMessage, suivreMessages, marquerMessagesLus,
  recupererMonRole, recupererConversation,
} from '../api/fournisseurs.js';

const formatJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatHeure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Ajoute un message sans doublon (le message envoyé arrive deux fois : à l'envoi et par Realtime)
const ajouterSansDoublon = (liste, message) =>
  (liste || []).some((m) => m.id === message.id) ? liste : [...(liste || []), message];

export default function Conversation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [infos, setInfos] = useState(null);
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
    recupererConversation(id).then(setInfos).catch(() => {});
    recupererMessages(id).then(setMessages).catch((err) => setErreur(err.message));
    return suivreMessages(id, (nouveau) => setMessages((m) => ajouterSansDoublon(m, nouveau)));
  }, [session, id, navigate]);

  useEffect(() => {
    if (role) marquerMessagesLus(id, role).catch(() => {});
  }, [id, role, messages]);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function envoyer(e) {
    e.preventDefault();
    const contenu = texte.trim();
    if (!contenu) return;
    setEnvoi(true);
    setErreur('');
    try {
      const cree = await envoyerMessage(id, contenu);
      setMessages((m) => ajouterSansDoublon(m, cree));
      setTexte('');
    } catch (err) {
      setErreur("Le message n'a pas pu être envoyé : " + err.message);
    } finally {
      setEnvoi(false);
    }
  }

  // Entrée envoie, Maj+Entrée saute une ligne
  function toucheEnfoncee(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form.requestSubmit(); }
  }

  if (session === undefined || messages === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '300px' }} /></div></section>;
  }

  const interlocuteur = role === 'fournisseur' ? infos?.vendeur?.nom : infos?.grossiste?.nom;
  let dernierJour = null;

  return (
    <section className="section" style={{ paddingBottom: '1.5rem' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <Link to="/conversations" style={styles.retour}><ArrowLeft size={16} /> Toutes les conversations</Link>

        <h1 className="section-titre" style={{ fontSize: '1.4rem', marginBottom: '0.2rem' }}>
          {interlocuteur || 'Conversation'}
        </h1>
        <p style={styles.contexte}>
          {role === 'fournisseur' && infos?.vendeur?.activite && <span>{infos.vendeur.activite}</span>}
          {role !== 'fournisseur' && infos?.grossiste && (
            <Link to={`/grossiste/${infos.grossiste.id}`} style={styles.lien}>Voir la page du fournisseur</Link>
          )}
          {infos?.produit && (
            <span>
              {' '}· À propos de <Link to={`/produit/${infos.produit.id}`} style={styles.lien}>{infos.produit.nom}</Link>
            </span>
          )}
        </p>

        {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>}

        <div style={styles.fil}>
          {messages.length === 0 && <p style={{ opacity: 0.7 }}>Aucun message pour l'instant.</p>}
          {messages.map((m) => {
            const nouveauJour = formatJour(m.date_envoi) !== dernierJour;
            dernierJour = formatJour(m.date_envoi);
            const moi = m.expediteur === role;
            return (
              <React.Fragment key={m.id}>
                {nouveauJour && <div style={styles.separateurJour}>{dernierJour}</div>}
                <div style={{
                  ...styles.bulle,
                  alignSelf: moi ? 'flex-end' : 'flex-start',
                  background: moi ? 'var(--loo-encre)' : 'var(--loo-papier-ombre)',
                  color: moi ? 'var(--loo-papier)' : 'var(--loo-encre)',
                }}>
                  <p style={{ margin: 0, fontSize: '0.92rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.contenu}</p>
                  <span style={styles.heure}>{formatHeure(m.date_envoi)}</span>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={fin} />
        </div>

        <form onSubmit={envoyer} style={{ display: 'flex', gap: '0.6rem', marginTop: '1rem', alignItems: 'flex-end' }}>
          <textarea
            className="champ" rows={2} placeholder="Votre message…" value={texte}
            onChange={(e) => setTexte(e.target.value)} onKeyDown={toucheEnfoncee}
          />
          <button type="submit" className="btn btn-primary" disabled={envoi || !texte.trim()} aria-label="Envoyer">
            <Send size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}

const styles = {
  retour: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-rouge)', marginBottom: '1rem' },
  contexte: { margin: '0 0 1rem', fontSize: '0.88rem', opacity: 0.8 },
  lien: { textDecoration: 'underline', fontWeight: 600 },
  fil: { display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '55vh', overflowY: 'auto', padding: '0.5rem 0' },
  separateurJour: { alignSelf: 'center', fontSize: '0.75rem', opacity: 0.6, textTransform: 'capitalize', margin: '0.4rem 0' },
  bulle: { padding: '0.6em 0.9em', borderRadius: 'var(--rayon-sm)', maxWidth: '75%' },
  heure: { display: 'block', textAlign: 'right', fontSize: '0.68rem', opacity: 0.6, marginTop: '0.2rem' },
};
