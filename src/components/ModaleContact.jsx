import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { contacterGrossiste } from '../api/fournisseurs.js';

const CLE_STOCKAGE = 'loohoo_vendeur';

// Mémorise les coordonnées sur l'appareil du vendeur uniquement, pour ne pas les retaper à chaque contact
function lireMemoire() {
  try {
    return JSON.parse(localStorage.getItem(CLE_STOCKAGE)) || {};
  } catch {
    return {};
  }
}
function ecrireMemoire(champs) {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(champs));
  } catch {
    // stockage indisponible : sans conséquence
  }
}

export default function ModaleContact({ grossiste, produit, onClose }) {
  const [champs, setChamps] = useState(() => ({ nom: '', telephone: '', email: '', activite: '', ...lireMemoire() }));
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [lien, setLien] = useState('');

  useEffect(() => {
    const surTouche = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [onClose]);

  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.value }));

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      const lienWhatsApp = await contacterGrossiste({
        ...champs,
        grossisteId: grossiste.id,
        produitId: produit ? produit.id : null,
      });
      ecrireMemoire(champs);
      setLien(lienWhatsApp);
    } catch (err) {
      setErreur(err.message || "Une erreur est survenue. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="modale-fond" onClick={onClose}>
      <div className="modale" role="dialog" aria-modal="true" aria-label="Contacter le fournisseur" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modale-fermer" onClick={onClose} aria-label="Fermer"><X size={20} /></button>

        {lien ? (
          <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
            <MessageCircle size={36} color="var(--loo-rouge)" />
            <h2 style={{ fontSize: '1.3rem', margin: '0.8rem 0 0.5rem' }}>Demande enregistrée</h2>
            <p style={{ opacity: 0.8, marginBottom: '1.4rem' }}>
              Continuez la conversation avec {grossiste.nom} sur WhatsApp.
            </p>
            <a href={lien} target="_blank" rel="noreferrer" className="btn btn-primary" onClick={onClose}>
              Ouvrir WhatsApp
            </a>
          </div>
        ) : (
          <form onSubmit={envoyer}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.3rem' }}>Contacter {grossiste.nom}</h2>
            {produit && <p style={{ margin: 0, opacity: 0.75, fontSize: '0.92rem' }}>À propos de : {produit.nom}</p>}

            <label className="etiquette-champ" htmlFor="c-nom">Votre nom</label>
            <input id="c-nom" className="champ" required value={champs.nom} onChange={maj('nom')} autoComplete="name" />

            <label className="etiquette-champ" htmlFor="c-tel">Téléphone (WhatsApp)</label>
            <input id="c-tel" className="champ" type="tel" required value={champs.telephone} onChange={maj('telephone')} autoComplete="tel" />

            <label className="etiquette-champ" htmlFor="c-mail">E-mail</label>
            <input id="c-mail" className="champ" type="email" required value={champs.email} onChange={maj('email')} autoComplete="email" />

            <label className="etiquette-champ" htmlFor="c-act">Votre boutique ou activité (facultatif)</label>
            <input id="c-act" className="champ" value={champs.activite} onChange={maj('activite')} />

            {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.9rem', margin: '1rem 0 0' }}>{erreur}</p>}

            <button type="submit" className="btn btn-primary" disabled={envoi} style={{ width: '100%', justifyContent: 'center', marginTop: '1.2rem' }}>
              {envoi ? 'Envoi…' : 'Envoyer et ouvrir WhatsApp'}
            </button>

            {/* Mention de consentement provisoire : à faire valider par le client (PDF §10) */}
            <p style={{ fontSize: '0.76rem', opacity: 0.65, margin: '0.9rem 0 0', lineHeight: 1.5 }}>
              En envoyant ce formulaire, vous acceptez que LOOHOO enregistre vos coordonnées pour vous mettre en
              relation avec ce fournisseur. Voir la{' '}
              <a href="https://looh-oo.com/confidentialite" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
                politique de confidentialité
              </a>.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}