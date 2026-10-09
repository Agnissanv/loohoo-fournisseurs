import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inscrireFournisseur } from '../api/fournisseurs.js';
import { normaliserTelephone, telephoneComplet } from '../utils/telephone.js';
import { usePays } from '../utils/usePays.js';
import { drapeau, FORMATS } from '../utils/pays.js';
import ChampTelephone from '../components/ChampTelephone.jsx';
import SelectCategorie from '../components/SelectCategorie.jsx';
import ChampMotDePasse from '../components/ChampMotDePasse.jsx';
import RedirigerSiConnecte from '../components/RedirigerSiConnecte.jsx';


// Compte fournisseur en deux étapes courtes : l'entreprise, puis le compte.
// Le stock et les documents se règlent ensuite depuis le tableau de bord, avec la liste des étapes à suivre.
export default function Inscription() {
  const navigate = useNavigate();
  const { tous, parCode } = usePays();
  const [etape, setEtape] = useState(1);
  const [champs, setChamps] = useState({
    nom: '', categorie: '', pays: 'CI', ville: '', commune: '', origine: 'local', estFabricant: false,
    telephone: '', email: '', motDePasse: '', conditions: false,
  });
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [confirmationEnvoyee, setConfirmationEnvoyee] = useState(false);

  const maj = (cle) => (e) =>
    setChamps((c) => ({ ...c, [cle]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  function continuer(e) {
    e.preventDefault();
    setErreur('');
    setEtape(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function soumettre(e) {
    e.preventDefault();
    const telephone = normaliserTelephone(champs.telephone, champs.pays);
    if (!telephoneComplet(telephone)) { setErreur(`Numéro de téléphone incomplet. Exemple : ${FORMATS[champs.pays]?.exemple || '07 00 00 00 00'}.`); return; }
    setEnvoi(true);
    setErreur('');
    try {
      const { confirmationRequise } = await inscrireFournisseur({
        email: champs.email.trim(), password: champs.motDePasse,
        nom: champs.nom.trim(), categorie: champs.categorie, ville: champs.ville.trim(), commune: champs.commune.trim(),
        telephone, estFabricant: champs.estFabricant, origine: champs.origine, stockConfirme: false, paysCode: champs.pays,
      });
      if (confirmationRequise) setConfirmationEnvoyee(true);
      else navigate('/tableau-de-bord');
    } catch (err) {
      setErreur(err.message || 'Impossible de créer le compte pour le moment.');
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
            Nous venons d'envoyer un lien à <strong>{champs.email}</strong>. Cliquez dessus : votre profil sera créé et vous pourrez
            ajouter vos produits. Pensez à regarder vos courriers indésirables.
          </p>
          <Link to="/connexion" className="btn btn-primary" style={{ justifyContent: 'center' }}>Aller à la connexion</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="acces-page">
      <RedirigerSiConnecte />
      <div className="acces-carte">
        <div className="acces-etapes" aria-hidden="true"><span className="fait" /><span className={etape === 2 ? 'fait' : ''} /></div>
        <h1 className="acces-titre">Créer mon compte fournisseur</h1>
        <p className="acces-sous">
          Étape {etape} sur 2 · {etape === 1 ? 'Votre entreprise' : 'Votre compte'}.
          {etape === 1 && ' Notre équipe vérifie votre profil avant de le publier.'}
        </p>

        {etape === 1 ? (
          <form onSubmit={continuer} className="acces-form">
            <div className="acces-champ-bloc">
              <label htmlFor="nom">Nom de votre entreprise</label>
              <input id="nom" className="champ" required value={champs.nom} onChange={maj('nom')} autoComplete="organization" />
            </div>
            <div className="acces-champ-bloc">
              <label htmlFor="categorie">Ce que vous vendez (catégorie principale)</label>
              <SelectCategorie id="categorie" required value={champs.categorie} onChange={maj('categorie')} vide="Choisir une catégorie" />
            </div>
            <div className="acces-champ-bloc">
              <label htmlFor="pays">Pays</label>
              <select id="pays" className="champ" value={champs.pays} onChange={(e) => setChamps((c) => ({ ...c, pays: e.target.value, ville: '' }))}>
                {tous.map((p) => <option key={p.code} value={p.code} disabled={!p.actif}>{drapeau(p.code)} {p.nom}{p.actif ? '' : ' (bientôt)'}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <div className="acces-champ-bloc" style={{ flex: 1 }}>
                <label htmlFor="ville">Ville</label>
                <input id="ville" className="champ" required list="villes-pays" placeholder={FORMATS[champs.pays]?.villes[0] || 'Ville'} value={champs.ville} onChange={maj('ville')} />
                <datalist id="villes-pays">{(FORMATS[champs.pays]?.villes || []).map((v) => <option key={v} value={v} />)}</datalist>
              </div>
              <div className="acces-champ-bloc" style={{ flex: 1 }}>
                <label htmlFor="commune">Commune ou quartier <span style={{ fontWeight: 400, opacity: 0.6 }}>(facultatif)</span></label>
                <input id="commune" className="champ" value={champs.commune} onChange={maj('commune')} />
              </div>
            </div>
            <div className="acces-champ-bloc">
              <label htmlFor="origine">Type d'entreprise</label>
              <select id="origine" className="champ" value={champs.origine} onChange={maj('origine')}>
                <option value="local">Entreprise locale</option>
                <option value="grossiste_etranger_ci">Grossiste étranger installé {parCode[champs.pays]?.dans || "en Côte d'Ivoire"}</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={champs.estFabricant} onChange={maj('estFabricant')} />
              Je fabrique ou transforme moi-même mes produits
            </label>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>Continuer</button>
          </form>
        ) : (
          <form onSubmit={soumettre} className="acces-form">
            <div className="acces-champ-bloc">
              <label htmlFor="tel">Téléphone WhatsApp</label>
              <ChampTelephone id="tel" required autoFocus pays={champs.pays} value={champs.telephone} onChange={maj('telephone')} />
              <p className="acces-aide">Jamais affiché publiquement : les acheteurs vous écrivent via LOOHOO.</p>
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
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.82rem', lineHeight: 1.5 }}>
              <input type="checkbox" required checked={champs.conditions} onChange={maj('conditions')} style={{ marginTop: '0.2rem' }} />
              <span>
                J'accepte les <Link to="/conditions" target="_blank" className="acces-lien" style={{ fontWeight: 500 }}>conditions d'utilisation</Link> et
                que LOOHOO conserve ces informations pour me référencer (<Link to="/confidentialite" target="_blank" className="acces-lien" style={{ fontWeight: 500 }}>confidentialité</Link>).
              </span>
            </label>
            {erreur && <p role="alert" className="acces-erreur">{erreur}</p>}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setEtape(1)}>Retour</button>
              <button type="submit" className="btn btn-primary" disabled={envoi} style={{ flex: 1, justifyContent: 'center' }}>
                {envoi ? 'Création…' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        )}

        <div className="acces-pied">
          <p style={{ margin: '0 0 0.5rem' }}>Déjà un compte ? <Link to="/connexion" className="acces-lien">Se connecter</Link></p>
          <p style={{ margin: 0 }}>Vous cherchez à acheter ? <Link to="/inscription/acheteur" className="acces-lien">Créer un compte acheteur</Link></p>
        </div>
      </div>
    </section>
  );
}
