import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { demarrerConversation, recupererSessionVendeur } from '../api/fournisseurs.js';
import { composerDemande, DELAIS_DEVIS } from '../utils/messagerie.js';
import { normaliserTelephone } from '../utils/telephone.js';

// Demande de devis : quantité, ville de livraison et délai, pour que le fournisseur puisse répondre précisément du premier coup.
export default function ModaleContact({ grossiste, produit, onClose }) {
  const [dejaConnecte, setDejaConnecte] = useState(null); // null = en cours de vérification
  const [champs, setChamps] = useState({
    nom: '', telephone: '', email: '', motDePasse: '', activite: '',
    besoin: '', quantite: '', ville: '', delai: '', message: '',
  });
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
    setErreur('');
    if (!dejaConnecte && normaliserTelephone(champs.telephone).length < 11) {
      setErreur('Numéro de téléphone incomplet. Exemple : 07 00 00 00 00.');
      return;
    }
    setEnvoi(true);
    try {
      const message = composerDemande({
        produit: produit ? produit.nom : champs.besoin.trim(),
        quantite: champs.quantite,
        unite: produit?.unite,
        ville: champs.ville.trim(),
        delai: champs.delai,
        message: champs.message,
      });
      const id = await demarrerConversation({
        grossisteId: grossiste.id, produitId: produit ? produit.id : null, message,
        nom: champs.nom, telephone: dejaConnecte ? champs.telephone : normaliserTelephone(champs.telephone), activite: champs.activite,
        email: champs.email, password: champs.motDePasse,
      });
      setConversationId(id);
    } catch (err) {
      setErreur(err.message || "Impossible d'envoyer la demande pour le moment.");
    } finally {
      setEnvoi(false);
    }
  }

  const espace = { marginBottom: '0.6rem' };

  return (
    <div className="modale-fond" onClick={onClose}>
      <div className="modale" role="dialog" aria-modal="true" aria-labelledby="titre-contact" style={{ width: 'min(100%, 520px)' }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modale-fermer" onClick={onClose} aria-label="Fermer"><X size={20} /></button>

        {conversationId ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <MessageCircle size={36} color="var(--loo-rouge)" />
            <h2 style={{ fontSize: '1.2rem', margin: '0.8rem 0 0.5rem' }}>Demande envoyée</h2>
            <p style={{ opacity: 0.8, marginBottom: '1.2rem' }}>{grossiste.nom} vous répondra directement dans votre messagerie LOOHOO.</p>
            <Link to={`/conversations/${conversationId}`} className="btn btn-primary" onClick={onClose}>Ouvrir la conversation</Link>
          </div>
        ) : (
          <form onSubmit={envoyer}>
            <h2 id="titre-contact" style={{ fontSize: '1.2rem', marginBottom: '0.3rem' }}>Demander un devis à {grossiste.nom}</h2>
            <p style={{ margin: '0 0 0.9rem', opacity: 0.75, fontSize: '0.88rem' }}>
              Plus votre demande est précise, plus la réponse sera rapide et chiffrée.
            </p>

            {dejaConnecte === null && <div className="loo-squelette" style={{ height: '120px' }} />}

            {dejaConnecte !== null && (
              <>
                {produit ? (
                  <div style={{ ...espace, padding: '0.6rem 0.8rem', background: 'var(--loo-papier-ombre)', borderRadius: 'var(--rayon-sm)', fontSize: '0.9rem' }}>
                    <span style={{ opacity: 0.65, fontSize: '0.76rem', display: 'block' }}>Produit</span>
                    <strong>{produit.nom}</strong>{produit.moq ? <span style={{ opacity: 0.7 }}> · minimum {produit.moq}</span> : null}
                  </div>
                ) : (
                  <input className="champ" required placeholder="Que recherchez-vous ? (ex. pagnes wax, sacs en toile…)" value={champs.besoin} onChange={maj('besoin')} style={espace} />
                )}

                <div style={{ display: 'flex', gap: '0.6rem', ...espace }}>
                  <input className="champ" required={!!produit} type="number" min="1" placeholder={`Quantité souhaitée${produit?.unite ? ` (${produit.unite})` : ''}`} value={champs.quantite} onChange={maj('quantite')} aria-label="Quantité souhaitée" />
                  <input className="champ" required placeholder="Ville de livraison" value={champs.ville} onChange={maj('ville')} aria-label="Ville de livraison" />
                </div>
                <select className="champ" value={champs.delai} onChange={maj('delai')} style={espace} aria-label="Délai souhaité">
                  <option value="">Délai souhaité (facultatif)</option>
                  {DELAIS_DEVIS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <textarea className="champ" rows={3} placeholder="Précisions : couleurs, tailles, conditionnement, questions…" value={champs.message} onChange={maj('message')} style={espace} />
              </>
            )}

            {dejaConnecte === false && (
              <>
                <p style={{ margin: '0.9rem 0 0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>Vos coordonnées</p>
                <input className="champ" required placeholder="Votre nom" value={champs.nom} onChange={maj('nom')} style={espace} />
                <input className="champ" required type="tel" placeholder="Téléphone (ex. 07 00 00 00 00)" value={champs.telephone} onChange={maj('telephone')} autoComplete="tel" style={espace} />
                <input className="champ" placeholder="Votre activité (facultatif)" value={champs.activite} onChange={maj('activite')} style={espace} />
                <input className="champ" required type="email" placeholder="E-mail" value={champs.email} onChange={maj('email')} autoComplete="email" style={espace} />
                <input className="champ" required type="password" minLength={8} placeholder="Créez un mot de passe (8 caractères min.)" value={champs.motDePasse} onChange={maj('motDePasse')} autoComplete="new-password" style={espace} />
              </>
            )}

            {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.88rem', margin: '0 0 0.6rem' }}>{erreur}</p>}

            {dejaConnecte !== null && (
              <button type="submit" className="btn btn-primary" disabled={envoi} style={{ width: '100%', justifyContent: 'center' }}>
                {envoi ? 'Envoi…' : 'Envoyer ma demande'}
              </button>
            )}

            {dejaConnecte === false && (
              <p style={{ fontSize: '0.76rem', opacity: 0.65, lineHeight: 1.5, margin: '0.9rem 0 0' }}>
                En envoyant cette demande, vous créez un compte LOOHOO Fournisseurs et acceptez notre{' '}
                <Link to="/confidentialite" target="_blank" style={{ textDecoration: 'underline' }}>politique de confidentialité</Link>.
                Le fournisseur vous répond par la messagerie LOOHOO.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
