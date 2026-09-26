import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inscrireFournisseur } from '../api/fournisseurs.js';

export default function Inscription() {
  const navigate = useNavigate();
  const [champs, setChamps] = useState({
    email: '', motDePasse: '', nom: '', categorie: '', ville: '', commune: '', telephone: '', estFabricant: false,
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const maj = (cle) => (e) =>
    setChamps((c) => ({ ...c, [cle]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await inscrireFournisseur({
        email: champs.email, password: champs.motDePasse,
        nom: champs.nom, categorie: champs.categorie, ville: champs.ville, commune: champs.commune,
        telephone: champs.telephone, estFabricant: champs.estFabricant,
      });
      navigate('/tableau-de-bord');
    } catch (err) {
      setErreur(err.message || "Impossible de créer le compte pour le moment.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="section" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="container">
        <span className="etiquette">Devenir fournisseur LOOHOO</span>
        <h1 className="section-titre">Créer mon compte</h1>
        <p className="section-intro" style={{ marginBottom: '1.5rem' }}>
          Votre profil sera vérifié par notre équipe avant d'apparaître dans l'annuaire.
        </p>
        <form onSubmit={soumettre} style={{ display: 'grid', gap: '0.9rem' }}>
          <input className="champ" required placeholder="Nom de votre entreprise" value={champs.nom} onChange={maj('nom')} />
          <input className="champ" required placeholder="Catégorie (ex. Textile, Électroménager)" value={champs.categorie} onChange={maj('categorie')} />
          <div style={{ display: 'flex', gap: '0.7rem' }}>
            <input className="champ" required placeholder="Ville (ex. Abidjan)" value={champs.ville} onChange={maj('ville')} />
            <input className="champ" placeholder="Commune (si Abidjan)" value={champs.commune} onChange={maj('commune')} />
          </div>
          <input className="champ" required type="tel" placeholder="Téléphone WhatsApp (avec indicatif, ex. 2250700000000)" value={champs.telephone} onChange={maj('telephone')} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={champs.estFabricant} onChange={maj('estFabricant')} />
            Je fabrique ou transforme moi-même mes produits
          </label>
          <hr style={{ border: 0, borderTop: '1px solid var(--loo-papier-ombre)', margin: '0.4rem 0' }} />
          <input className="champ" required type="email" placeholder="E-mail" value={champs.email} onChange={maj('email')} autoComplete="email" />
          <input className="champ" required type="password" minLength={8} placeholder="Mot de passe (8 caractères minimum)" value={champs.motDePasse} onChange={maj('motDePasse')} autoComplete="new-password" />
          {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{erreur}</p>}
          <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
            {envoi ? 'Création…' : 'Créer mon compte'}
          </button>
          <p style={{ fontSize: '0.76rem', opacity: 0.65, lineHeight: 1.5, margin: 0 }}>
            En créant un compte, vous acceptez que LOOHOO conserve ces informations pour vous référencer dans
            l'annuaire fournisseurs. Voir la{' '}
            <a href="https://looh-oo.com/confidentialite" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
              politique de confidentialité
            </a>.
          </p>
        </form>
        <p style={{ marginTop: '1.2rem', fontSize: '0.9rem' }}>
          Déjà inscrit ?{' '}
          <Link to="/connexion" style={{ textDecoration: 'underline', fontWeight: 600 }}>Se connecter</Link>
        </p>
      </div>
    </section>
  );
}