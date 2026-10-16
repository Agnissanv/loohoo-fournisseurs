import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { signalerProduit } from '../api/fournisseurs.js';
import { useLangue } from '../i18n/Langue.jsx';

const MOTIFS = [
  ['fausse_photo', 'La photo ne correspond pas au produit'],
  ['prix_non_respecte', "Le prix affiché n'a pas été respecté"],
  ['promesse_trompeuse', 'Promesse trompeuse (santé, résultat, livraison…)'],
  ['autre', 'Autre problème'],
];



// « Signaler ce produit » : ouvert à tous, même sans compte. L'équipe LOOHOO reçoit le signalement, pas le fournisseur.
export default function ModaleSignalement({ produit, onClose }) {
  const { t } = useLangue();
  const [motif, setMotif] = useState('');
  const [details, setDetails] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState('');

  async function envoyer(e) {
    e.preventDefault();
    if (!motif) { setErreur(t('Choisissez ce qui ne va pas.')); return; }
    setEnvoi(true);
    setErreur('');
    try {
      await signalerProduit(produit.id, motif, details.trim());
      setEnvoye(true);
    } catch {
      setErreur(t("Le signalement n'a pas pu être envoyé. Vérifiez votre connexion, puis réessayez."));
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="modale-fond" onClick={onClose}>
      <div className="modale" role="dialog" aria-modal="true" aria-labelledby="titre-signalement" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modale-fermer" onClick={onClose} aria-label={t('Fermer')}><X size={20} /></button>
        {envoye ? (
          <div style={{ textAlign: 'center', padding: '0.6rem 0' }}>
            <span className="signalement-ok" aria-hidden="true"><Check size={26} /></span>
            <h2 id="titre-signalement" style={{ fontSize: '1.2rem', margin: '0.8rem 0 0.4rem' }}>{t('Merci, signalement envoyé')}</h2>
            <p style={{ opacity: 0.8, lineHeight: 1.55, margin: '0 0 1.1rem' }}>{t("Notre équipe va examiner ce produit. Le fournisseur ne sait pas qui l'a signalé.")}</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>{t('Fermer')}</button>
          </div>
        ) : (
          <form onSubmit={envoyer}>
            <h2 id="titre-signalement" style={{ fontSize: '1.2rem', margin: '0 2rem 0.3rem 0' }}>{t('Signaler ce produit')}</h2>
            <p style={{ fontSize: '0.88rem', opacity: 0.7, margin: '0 0 1rem' }}>{produit.nom}</p>
            <fieldset style={{ border: 0, padding: 0, margin: '0 0 1rem', display: 'grid', gap: '0.5rem' }}>
              <legend style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t('Que se passe-t-il ?')}</legend>
              {MOTIFS.map(([valeur, libelle]) => (
                <label key={valeur} className={`signalement-motif${motif === valeur ? ' signalement-motif-actif' : ''}`}>
                  <input type="radio" name="motif" value={valeur} checked={motif === valeur} onChange={() => setMotif(valeur)} />
                  {t(libelle)}
                </label>
              ))}
            </fieldset>
            <label htmlFor="signalement-details" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('Précisions (facultatif)')}</label>
            <textarea id="signalement-details" className="champ" rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)}
              placeholder={t('Ex. : le prix annoncé dans la discussion était plus élevé.')} style={{ marginTop: '0.3rem' }} />
            {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.86rem', margin: '0.6rem 0 0' }}>{erreur}</p>}
            <button type="submit" className="btn btn-primary" disabled={envoi} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
              {envoi ? t('Envoi…') : t('Envoyer le signalement')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
