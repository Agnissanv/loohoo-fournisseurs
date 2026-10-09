import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { inscrireVendeur } from '../api/fournisseurs.js';
import { normaliserTelephone, telephoneComplet } from '../utils/telephone.js';
import { FORMATS } from '../utils/pays.js';
import ChampTelephone from '../components/ChampTelephone.jsx';
import { retourSur } from '../utils/navigation.js';
import ChampMotDePasse from '../components/ChampMotDePasse.jsx';
import RedirigerSiConnecte from '../components/RedirigerSiConnecte.jsx';

// Compte acheteur : quatre champs, une minute.
export default function InscriptionVendeur() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const retour = retourSur(new URLSearchParams(search).get('retour'));
  const [champs, setChamps] = useState({ nom: '', pays: 'CI', telephone: '', email: '', motDePasse: '', activite: '' });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [confirmationEnvoyee, setConfirmationEnvoyee] = useState(false);

  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.value }));

  async function soumettre(e) {
    e.preventDefault();
    const telephone = normaliserTelephone(champs.telephone, champs.pays);
    if (!telephoneComplet(telephone)) { setErreur(`Numéro de téléphone incomplet. Exemple : ${FORMATS[champs.pays]?.exemple || '07 00 00 00 00'}.`); return; }
    setEnvoi(true);
    setErreur('');
    try {
      const { confirmationRequise } = await inscrireVendeur({
        email: champs.email.trim(), password: champs.motDePasse,
        nom: champs.nom.trim(), telephone, activite: champs.activite.trim(), paysCode: champs.pays,
      });
      if (confirmationRequise) setConfirmationEnvoyee(true);
      else navigate(retour || '/');
    } catch (err) {
      setErreur(err.message || "Impossible de créer le compte pour le moment.");
    } finally {
      setEnvoi(false);
    }
  }

  if (confirmationEnvoyee) {
    return (
      <section className="acces-page">
        <div className="acces-carte">
          <h1 className="acces-titre">Confirmez votre e-mail</h1>
          <p className="acces-sous">
            Nous venons d'envoyer un lien à <strong>{champs.email}</strong>. Cliquez dessus : votre compte sera prêt pour contacter des fournisseurs.
            Pensez à regarder vos courriers indésirables.
          </p>
          <Link to="/connexion" className="btn btn-primary" style={{ justifyContent: 'center' }}>Aller à la connexion</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="acces-page">
      <RedirigerSiConnecte vers={retour} />
      <div className="acces-carte">
        <h1 className="acces-titre">Créer mon compte acheteur</h1>
        <p className="acces-sous">Pour demander des devis aux fournisseurs et retrouver vos conversations.</p>

        <form onSubmit={soumettre} className="acces-form">
          <div className="acces-champ-bloc">
            <label htmlFor="nom">Votre nom</label>
            <input id="nom" className="champ" required value={champs.nom} onChange={maj('nom')} autoComplete="name" />
          </div>
          <div className="acces-champ-bloc">
            <label htmlFor="tel">Téléphone</label>
            <ChampTelephone id="tel" required pays={champs.pays} onPaysChange={(pays) => setChamps((c) => ({ ...c, pays }))} value={champs.telephone} onChange={maj('telephone')} />
            <p className="acces-aide">Reste privé : les fournisseurs vous répondent par la messagerie LOOHOO.</p>
          </div>
          <div className="acces-champ-bloc">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="champ" required type="email" value={champs.email} onChange={maj('email')} autoComplete="email" />
          </div>
          <div className="acces-champ-bloc">
            <label htmlFor="mdp">Mot de passe</label>
            <ChampMotDePasse id="mdp" nouveau required minLength={8} value={champs.motDePasse} onChange={maj('motDePasse')} />
            <p className="acces-aide">8 caractères minimum.</p>
          </div>
          <div className="acces-champ-bloc">
            <label htmlFor="activite">Votre activité <span style={{ fontWeight: 400, opacity: 0.6 }}>(facultatif)</span></label>
            <input id="activite" className="champ" placeholder="Ex. boutique en ligne de vêtements" value={champs.activite} onChange={maj('activite')} />
          </div>

          {erreur && <p role="alert" className="acces-erreur">{erreur}</p>}
          <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
            {envoi ? 'Création…' : 'Créer mon compte'}
          </button>
          <p className="acces-aide">
            En créant un compte, vous acceptez les <Link to="/conditions" target="_blank" className="acces-lien" style={{ fontWeight: 500 }}>conditions d'utilisation</Link> et
            la <Link to="/confidentialite" target="_blank" className="acces-lien" style={{ fontWeight: 500 }}>politique de confidentialité</Link>.
          </p>
        </form>

        <div className="acces-pied">
          <p style={{ margin: '0 0 0.5rem' }}>Déjà un compte ? <Link to={`/connexion${search}`} className="acces-lien">Se connecter</Link></p>
          <p style={{ margin: 0 }}>Vous vendez en gros ? <Link to="/inscription/fournisseur" className="acces-lien">Créer un compte fournisseur</Link></p>
        </div>
      </div>
    </section>
  );
}
