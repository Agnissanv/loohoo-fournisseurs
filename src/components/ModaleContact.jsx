import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { demarrerConversation, recupererSessionVendeur } from '../api/fournisseurs.js';

export default function ModaleContact({ grossiste, produit, onClose }) {
  const [dejaConnecte, setDejaConnecte] = useState(null); // null = en cours de vérification
  const [champs, setChamps] = useState({ nom: '', telephone: '', email: '', motDePasse: '', activite: '', message: '' });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    recupererSessionVendeur().then((r) => {
      if (r?.vendeur) {
        setDejaConnecte(true);
        setChamps((c) => ({ ...c, nom: r.vendeur.nom, telephone: r.vendeur.telephone }));
      } else {
        setDejaConnecte(false);
      }
    });
  }, []);

  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.value }));

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      const id = await demarrerConversation({
        grossisteId: grossiste.id, produitId: produit ? produit.id : null, message: champs.message,
        nom: champs.nom, telephone: champs.telephone, activite: champs.activite,
        email: champs.email, password: champs.motDePasse,
      });
      setConversationId(id);
    } catch (err) {
      setErreur(err.message || "Impossible d'envoyer le message pour le moment.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="modale-fond" onClick={onClose}>
      <div className="modale" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modale-fermer" onClick={onClose} aria-label="Fermer"><X size={20} /></button>

        {conversationId ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <MessageCircle size={36} color="var(--loo-rouge)" />
            <h2 style={{ fontSize: '1.2rem', margin: '0.8rem 0 0.5rem' }}>Message envoyé</h2>
            <p style={{ opacity: 0.8, marginBottom: '1.2rem' }}>{grossiste.nom} vous répondra directement ici.</p>
            <Link to={`/conversations/${conversationId}`} className="btn btn-primary" onClick={onClose}>
              Ouvrir la conversation
            </Link>
          </div>
        ) : (
          <form onSubmit={envoyer}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.3rem' }}>Contacter {grossiste.nom}</h2>
            {produit && <p style={{ margin: '0 0 0.8rem', opacity: 0.75, fontSize: '0.92rem' }}>À propos de : {produit.nom}</p>}

            {dejaConnecte === null && <div className="loo-squelette" style={{ height: '120px' }} />}

            {dejaConnecte === false && (
              <>
                <input className="champ" required placeholder="Votre nom" value={champs.nom} onChange={maj('nom')} style={{ marginBottom: '0.6rem' }} />
                <input className="champ" required type="tel" placeholder="Téléphone" value={champs.telephone} onChange={maj('telephone')} style={{ marginBottom: '0.6rem' }} />
                <input className="champ" placeholder="Votre activité (facultatif)" value={champs.activite} onChange={maj('activite')} style={{ marginBottom: '0.6rem' }} />
                <input className="champ" required type="email" placeholder="E-mail" value={champs.email} onChange={maj('email')} autoComplete="email" style={{ marginBottom: '0.6rem' }} />
                <input className="champ" required type="password" minLength={8} placeholder="Créez un mot de passe (8 caractères min.)" value={champs.motDePasse} onChange={maj('motDePasse')} autoComplete="new-password" style={{ marginBottom: '0.6rem' }} />
              </>
            )}

            {dejaConnecte !== null && (
              <textarea className="champ" required rows={3} placeholder="Votre message" value={champs.message} onChange={maj('message')} style={{ marginBottom: '0.6rem' }} />
            )}

            {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.88rem', margin: '0 0 0.6rem' }}>{erreur}</p>}

            {dejaConnecte !== null && (
              <button type="submit" className="btn btn-primary" disabled={envoi} style={{ width: '100%', justifyContent: 'center' }}>
                {envoi ? 'Envoi…' : 'Envoyer'}
              </button>
            )}

            {dejaConnecte === false && (
              <p style={{ fontSize: '0.76rem', opacity: 0.65, lineHeight: 1.5, margin: '0.9rem 0 0' }}>
                En envoyant ce message, vous créez un compte LOOHOO Fournisseurs et acceptez notre{' '}
                <Link to="/confidentialite" target="_blank" style={{ textDecoration: 'underline' }}>politique de confidentialité</Link>.
                Vous pourrez vous reconnecter plus tard avec cet e-mail et ce mot de passe.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}