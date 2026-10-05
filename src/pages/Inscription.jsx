import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inscrireFournisseur } from '../api/fournisseurs.js';
import SelectCategorie from '../components/SelectCategorie.jsx';

const ORIGINES = [
  { valeur: 'local', texte: 'Entreprise locale' },
  { valeur: 'grossiste_etranger_ci', texte: 'Grossiste étranger installé en Côte d\'Ivoire' },
];

// Garde chiffres uniquement ; « 07 00 00 00 00 » devient 2250700000000
function normaliserTelephone(saisie) {
  const chiffres = saisie.replace(/\D/g, '').replace(/^00/, '');
  if (chiffres.length === 10) return `225${chiffres}`;
  return chiffres;
}

export default function Inscription() {
  const navigate = useNavigate();
  const [champs, setChamps] = useState({
    email: '', motDePasse: '', nom: '', categorie: '', ville: '', commune: '', telephone: '',
    estFabricant: false, origine: 'local', stockConfirme: false, conditions: false,
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [confirmationEnvoyee, setConfirmationEnvoyee] = useState(false);

  const maj = (cle) => (e) =>
    setChamps((c) => ({ ...c, [cle]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function soumettre(e) {
    e.preventDefault();
    const telephone = normaliserTelephone(champs.telephone);
    if (telephone.length < 11) {
      setErreur('Numéro de téléphone incomplet. Exemple : 07 00 00 00 00 ou 225 07 00 00 00 00.');
      return;
    }
    setEnvoi(true);
    setErreur('');
    try {
      const { confirmationRequise } = await inscrireFournisseur({
        email: champs.email.trim(), password: champs.motDePasse,
        nom: champs.nom.trim(), categorie: champs.categorie, ville: champs.ville.trim(), commune: champs.commune.trim(),
        telephone, estFabricant: champs.estFabricant, origine: champs.origine, stockConfirme: champs.stockConfirme,
      });
      if (confirmationRequise) setConfirmationEnvoyee(true);
      else navigate('/tableau-de-bord');
    } catch (err) {
      setErreur(err.message || "Impossible de créer le compte pour le moment.");
    } finally {
      setEnvoi(false);
    }
  }

  if (confirmationEnvoyee) {
    return (
      <section className="section" style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="container">
          <span className="etiquette">Dernière étape</span>
          <h1 className="section-titre">Confirmez votre e-mail</h1>
          <p style={{ lineHeight: 1.6 }}>
            Nous venons d'envoyer un lien de confirmation à <strong>{champs.email}</strong>. Cliquez dessus, puis
            connectez-vous : votre profil sera créé et vous pourrez ajouter vos produits.
          </p>
          <Link to="/connexion" className="btn btn-primary" style={{ marginTop: '1rem' }}>Aller à la connexion</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ maxWidth: '480px', margin: '0 auto' }}>
      <div className="container">
        <span className="etiquette">Devenir fournisseur LOOHOO</span>
        <h1 className="section-titre">Créer mon compte</h1>
        <p className="section-intro" style={{ marginBottom: '1rem' }}>
          Quelques minutes suffisent. Votre profil sera vérifié par notre équipe avant d'apparaître dans l'annuaire.
          <br /><Link to="/devenir-fournisseur" style={{ textDecoration: 'underline', fontSize: '0.88rem' }}>Comment ça marche ?</Link>
        </p>

        <form onSubmit={soumettre} style={{ display: 'grid', gap: '0.9rem' }}>
          <h2 style={styles.etape}>1. Votre entreprise</h2>
          <input className="champ" required placeholder="Nom de votre entreprise" value={champs.nom} onChange={maj('nom')} />
          <SelectCategorie required value={champs.categorie} onChange={maj('categorie')} vide="Votre catégorie principale" />
          <div style={{ display: 'flex', gap: '0.7rem' }}>
            <input className="champ" required placeholder="Ville (ex. Abidjan)" value={champs.ville} onChange={maj('ville')} />
            <input className="champ" placeholder="Commune (ex. Adjamé)" value={champs.commune} onChange={maj('commune')} />
          </div>
          <select className="champ" value={champs.origine} onChange={maj('origine')} aria-label="Type d'entreprise">
            {ORIGINES.map((o) => <option key={o.valeur} value={o.valeur}>{o.texte}</option>)}
          </select>
          <label style={styles.case}>
            <input type="checkbox" checked={champs.estFabricant} onChange={maj('estFabricant')} />
            Je fabrique ou transforme moi-même mes produits
          </label>
          <label style={styles.case}>
            <input type="checkbox" checked={champs.stockConfirme} onChange={maj('stockConfirme')} />
            J'ai du stock disponible dès maintenant
          </label>
          <p style={styles.aide}>
            Sans stock confirmé, votre profil n'est pas publié. Vous pourrez le confirmer plus tard depuis votre tableau de bord.
          </p>

          <h2 style={styles.etape}>2. Votre contact</h2>
          <input className="champ" required type="tel" placeholder="Téléphone WhatsApp (ex. 07 00 00 00 00)" value={champs.telephone} onChange={maj('telephone')} autoComplete="tel" />
          <p style={styles.aide}>Votre numéro n'est jamais affiché publiquement. Les acheteurs vous écrivent via LOOHOO.</p>

          <h2 style={styles.etape}>3. Votre compte</h2>
          <input className="champ" required type="email" placeholder="E-mail" value={champs.email} onChange={maj('email')} autoComplete="email" />
          <input className="champ" required type="password" minLength={8} placeholder="Mot de passe (8 caractères minimum)" value={champs.motDePasse} onChange={maj('motDePasse')} autoComplete="new-password" />

          <label style={{ ...styles.case, alignItems: 'flex-start', fontSize: '0.82rem', lineHeight: 1.5 }}>
            <input type="checkbox" required checked={champs.conditions} onChange={maj('conditions')} style={{ marginTop: '0.2rem' }} />
            <span>
              J'accepte les <Link to="/conditions" target="_blank" style={styles.lien}>conditions d'utilisation</Link> et
              que LOOHOO conserve ces informations pour me référencer (voir la{' '}
              <Link to="/confidentialite" target="_blank" style={styles.lien}>politique de confidentialité</Link>).
            </span>
          </label>

          {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{erreur}</p>}
          <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
            {envoi ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
        <p style={{ marginTop: '1.2rem', fontSize: '0.9rem' }}>
          Déjà inscrit ?{' '}
          <Link to="/connexion" style={{ textDecoration: 'underline', fontWeight: 600 }}>Se connecter</Link>
        </p>
      </div>
    </section>
  );
}

const styles = {
  etape: { fontSize: '1.05rem', margin: '0.8rem 0 0' },
  case: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' },
  aide: { fontSize: '0.78rem', opacity: 0.65, margin: 0, lineHeight: 1.5 },
  lien: { textDecoration: 'underline' },
};
