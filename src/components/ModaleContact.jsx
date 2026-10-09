import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { demarrerConversation, recupererSessionVendeur } from '../api/fournisseurs.js';
import { composerDemande, DELAIS_DEVIS, PREMIERS_MESSAGES_PRODUIT, PREMIERS_MESSAGES_FOURNISSEUR } from '../utils/messagerie.js';
import { normaliserTelephone, telephoneComplet } from '../utils/telephone.js';
import { FORMATS } from '../utils/pays.js';
import ChampTelephone from './ChampTelephone.jsx';

// Demande de devis : quantité, ville de livraison et délai, pour que le fournisseur puisse répondre précisément du premier coup.
export default function ModaleContact({ grossiste, produit, onClose }) {
  const { pathname } = useLocation();
  const [dejaConnecte, setDejaConnecte] = useState(null); // null = en cours de vérification
  const [champs, setChamps] = useState({
    nom: '', pays: 'CI', telephone: '', email: '', motDePasse: '', activite: '',
    besoin: '', quantite: '', ville: '', delai: '', message: '',
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [confirmationRequise, setConfirmationRequise] = useState(false);
  const [modeleChoisi, setModeleChoisi] = useState(null); // visiteur : message prêt choisi (envoyé avec ses coordonnées)
  const [envoiRapide, setEnvoiRapide] = useState('');   // libellé du message en cours d'envoi

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

  // Un clic = message envoyé tout de suite (acheteur déjà connecté) ; sinon on le garde et on demande les coordonnées
  async function choisirModele(modele) {
    setErreur('');
    if (!dejaConnecte) {
      setModeleChoisi(modele);
      setChamps((ch) => ({ ...ch, message: modele.texte }));
      return;
    }
    setEnvoiRapide(modele.libelle);
    try {
      const resultat = await demarrerConversation({
        grossisteId: grossiste.id, produitId: produit ? produit.id : null, message: modele.texte,
        nom: champs.nom, telephone: champs.telephone, activite: champs.activite, email: '', password: '',
      });
      setConversationId(resultat.conversationId);
    } catch (err) {
      setErreur(err.message || "Impossible d'envoyer le message pour le moment.");
    } finally {
      setEnvoiRapide('');
    }
  }

  async function envoyer(e) {
    e.preventDefault();
    setErreur('');
    if (!dejaConnecte && !telephoneComplet(normaliserTelephone(champs.telephone, champs.pays))) {
      setErreur(`Numéro de téléphone incomplet. Exemple : ${FORMATS[champs.pays]?.exemple || '07 00 00 00 00'}.`);
      return;
    }
    setEnvoi(true);
    try {
      // Message prêt choisi : texte simple. Sinon : demande de devis structurée.
      const message = modeleChoisi
        ? (champs.message.trim() || modeleChoisi.texte)
        : composerDemande({
          produit: produit ? produit.nom : champs.besoin.trim(),
          quantite: champs.quantite,
          unite: produit?.unite,
          ville: champs.ville.trim(),
          delai: champs.delai,
          message: champs.message,
        });
      const resultat = await demarrerConversation({
        grossisteId: grossiste.id, produitId: produit ? produit.id : null, message,
        nom: champs.nom, telephone: dejaConnecte ? champs.telephone : normaliserTelephone(champs.telephone, champs.pays), activite: champs.activite,
        email: champs.email, password: champs.motDePasse, paysCode: dejaConnecte ? undefined : champs.pays,
      });
      if (resultat.confirmationRequise) setConfirmationRequise(true);
      else setConversationId(resultat.conversationId);
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

        {confirmationRequise ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <MessageCircle size={36} color="var(--loo-rouge)" />
            <h2 style={{ fontSize: '1.2rem', margin: '0.8rem 0 0.5rem' }}>Confirmez votre e-mail</h2>
            <p style={{ opacity: 0.85, lineHeight: 1.6, marginBottom: '0.6rem' }}>
              Nous avons envoyé un lien de confirmation à <strong>{champs.email}</strong>. Cliquez dessus : votre demande de devis
              sera envoyée à {grossiste.nom} automatiquement, et vous la retrouverez dans vos conversations.
            </p>
            <p style={{ opacity: 0.65, fontSize: '0.82rem', margin: 0 }}>Rien reçu ? Regardez vos courriers indésirables.</p>
          </div>
        ) : conversationId ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <MessageCircle size={36} color="var(--loo-rouge)" />
            <h2 style={{ fontSize: '1.2rem', margin: '0.8rem 0 0.5rem' }}>Message envoyé</h2>
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

            {dejaConnecte !== null && !modeleChoisi && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>
                  {dejaConnecte ? 'Pas d\'idée ? Envoyez un message en un clic' : 'Pas d\'idée ? Choisissez un message'}
                </p>
                <div className="msg-modeles">
                  {(produit ? PREMIERS_MESSAGES_PRODUIT : PREMIERS_MESSAGES_FOURNISSEUR).map((mo) => (
                    <button key={mo.libelle} type="button" disabled={!!envoiRapide} onClick={() => choisirModele(mo)}>
                      {envoiRapide === mo.libelle ? 'Envoi…' : mo.libelle}
                    </button>
                  ))}
                </div>
                <p className="esp-aide" style={{ margin: '0.5rem 0 0' }}>
                  {dejaConnecte ? 'Un clic envoie le message tout de suite.' : 'Vous le validerez avec vos coordonnées, juste en dessous.'}
                  {' '}Ou remplissez la demande de devis détaillée ci-dessous.
                </p>
              </div>
            )}

            {modeleChoisi && (
              <div style={{ marginBottom: '0.9rem', padding: '0.7rem 0.9rem', background: '#FFF6E9', border: '1px solid var(--loo-orange)', borderRadius: 'var(--rayon-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '0.86rem' }}>Votre message</strong>
                  <button type="button" onClick={() => { setModeleChoisi(null); setChamps((ch) => ({ ...ch, message: '' })); }} style={{ background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontSize: '0.8rem' }}>Changer</button>
                </div>
                <textarea className="champ" rows={3} style={{ marginTop: '0.4rem' }} value={champs.message} onChange={maj('message')} aria-label="Votre message" />
              </div>
            )}

            {dejaConnecte !== null && (
              <>
                {produit ? (
                  <div style={{ ...espace, padding: '0.6rem 0.8rem', background: 'var(--loo-papier-ombre)', borderRadius: 'var(--rayon-sm)', fontSize: '0.9rem' }}>
                    <span style={{ opacity: 0.65, fontSize: '0.76rem', display: 'block' }}>Produit</span>
                    <strong>{produit.nom}</strong>{produit.moq ? <span style={{ opacity: 0.7 }}> · minimum {produit.moq}</span> : null}
                  </div>
                ) : (
                  !modeleChoisi && <input className="champ" required placeholder="Que recherchez-vous ? (ex. pagnes wax, sacs en toile…)" value={champs.besoin} onChange={maj('besoin')} style={espace} />
                )}

                {!modeleChoisi && <>
                <div style={{ display: 'flex', gap: '0.6rem', ...espace }}>
                  <input className="champ" required={!!produit} type="number" min="1" placeholder={`Quantité souhaitée${produit?.unite ? ` (${produit.unite})` : ''}`} value={champs.quantite} onChange={maj('quantite')} aria-label="Quantité souhaitée" />
                  <input className="champ" required placeholder="Ville de livraison" value={champs.ville} onChange={maj('ville')} aria-label="Ville de livraison" />
                </div>
                <select className="champ" value={champs.delai} onChange={maj('delai')} style={espace} aria-label="Délai souhaité">
                  <option value="">Délai souhaité (facultatif)</option>
                  {DELAIS_DEVIS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <textarea className="champ" rows={3} placeholder="Précisions : couleurs, tailles, conditionnement, questions…" value={champs.message} onChange={maj('message')} style={espace} />
                </>}
              </>
            )}

            {dejaConnecte === false && (
              <>
                <p style={{ margin: '0.9rem 0 0.5rem', fontWeight: 700, fontSize: '0.88rem' }}>
                  Vos coordonnées <span style={{ fontWeight: 400, opacity: 0.75 }}>· déjà un compte ?{' '}
                    <Link to={`/connexion?retour=${encodeURIComponent(pathname)}`} onClick={onClose} style={{ textDecoration: 'underline', fontWeight: 700 }}>Se connecter</Link>
                  </span>
                </p>
                <input className="champ" required placeholder="Votre nom" value={champs.nom} onChange={maj('nom')} style={espace} />
                <div style={espace}><ChampTelephone required pays={champs.pays} onPaysChange={(pays) => setChamps((c) => ({ ...c, pays }))} value={champs.telephone} onChange={maj('telephone')} /></div>
                <input className="champ" placeholder="Votre activité (facultatif)" value={champs.activite} onChange={maj('activite')} style={espace} />
                <input className="champ" required type="email" placeholder="E-mail" value={champs.email} onChange={maj('email')} autoComplete="email" style={espace} />
                <input className="champ" required type="password" minLength={8} placeholder="Créez un mot de passe (8 caractères min.)" value={champs.motDePasse} onChange={maj('motDePasse')} autoComplete="new-password" style={espace} />
              </>
            )}

            {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.88rem', margin: '0 0 0.6rem' }}>{erreur}</p>}

            {dejaConnecte !== null && (
              <button type="submit" className="btn btn-primary" disabled={envoi} style={{ width: '100%', justifyContent: 'center' }}>
                {envoi ? 'Envoi…' : modeleChoisi ? 'Envoyer mon message' : 'Envoyer ma demande'}
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
