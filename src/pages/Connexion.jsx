import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Store } from 'lucide-react';
import { connecterFournisseur, recupererMonRole, finaliserInscriptionEnAttente } from '../api/fournisseurs.js';
import ChampMotDePasse from '../components/ChampMotDePasse.jsx';
import RedirigerSiConnecte from '../components/RedirigerSiConnecte.jsx';
import { retourSur } from '../utils/navigation.js';

// Une seule connexion pour tout le monde : après l'identification, chacun arrive dans son espace.
export default function Connexion() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const retour = retourSur(new URLSearchParams(search).get('retour'));
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await connecterFournisseur(email.trim(), motDePasse);
    } catch (err) {
      setErreur(/not confirmed/i.test(err?.message || '')
        ? "Votre e-mail n'est pas encore confirmé. Cliquez sur le lien que nous vous avons envoyé, puis réessayez."
        : 'E-mail ou mot de passe incorrect.');
      setEnvoi(false);
      return;
    }
    try {
      let { role } = await recupererMonRole();
      if (!role) role = (await finaliserInscriptionEnAttente().catch(() => false))?.type || null;
      navigate(retour || (role === 'fournisseur' ? '/tableau-de-bord' : '/'));
    } catch {
      navigate(retour || '/');
    }
  }

  return (
    <section className="acces-page">
      <RedirigerSiConnecte vers={retour} />
      <div className="acces-carte">
        <h1 className="acces-titre">Connexion</h1>
        <p className="acces-sous">Acheteurs et fournisseurs se connectent ici, avec le même formulaire.</p>

        <form onSubmit={soumettre} className="acces-form">
          <div className="acces-champ-bloc">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="champ" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="acces-champ-bloc">
            <label htmlFor="mdp">Mot de passe</label>
            <ChampMotDePasse id="mdp" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          </div>
          {erreur && <p role="alert" className="acces-erreur">{erreur}</p>}
          <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
            {envoi ? 'Connexion…' : 'Se connecter'}
          </button>
          <Link to="/mot-de-passe-oublie" className="acces-lien" style={{ fontSize: '0.88rem', fontWeight: 500 }}>Mot de passe oublié ?</Link>
        </form>

        <div className="acces-pied">
          <p style={{ margin: '0 0 0.7rem', fontWeight: 700 }}>Pas encore de compte ?</p>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <Link to={`/inscription/acheteur${search}`} className="btn btn-outline" style={{ justifyContent: 'center' }}>
              <ShoppingBag size={16} /> Je suis acheteur : créer mon compte
            </Link>
            <Link to="/inscription/fournisseur" className="btn btn-outline" style={{ justifyContent: 'center' }}>
              <Store size={16} /> Je suis fournisseur : créer mon compte
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
