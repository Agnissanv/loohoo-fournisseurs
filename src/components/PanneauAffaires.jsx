import React, { useCallback, useEffect, useState } from 'react';
import { Check, Handshake, X } from 'lucide-react';
import { recupererAffaires, declarerAffaire, repondreAffaire, annulerAffaire, recupererMesAvis, deposerAvis } from '../api/fournisseurs.js';
import { ChoixNote, Etoiles } from './Etoiles.jsx';
import { prixCFA } from '../utils/prix.js';
import { useLangue } from '../i18n/Langue.jsx';

const STATUTS = {
  proposee: { texte: 'En attente de confirmation', classe: 'esp-puce-orange' },
  confirmee: { texte: 'Confirmée', classe: 'esp-puce-vert' },
  contestee: { texte: 'Contestée', classe: 'esp-puce-rouge' },
  annulee: { texte: 'Annulée', classe: 'esp-puce-neutre' },
};

// Déclaration des affaires conclues grâce à LOOHOO : une partie déclare, l'autre confirme.
// Rien n'est affiché tant que la fonction n'est pas activée sur la base.
export default function PanneauAffaires({ conversationId, role }) {
  const { t, langue } = useLangue();
  const [affaires, setAffaires] = useState(undefined); // undefined = chargement, null = fonction indisponible
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [montant, setMontant] = useState('');
  const [quantite, setQuantite] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const [avis, setAvis] = useState([]);
  const [avisOuvert, setAvisOuvert] = useState(null); // id de l'affaire dont le formulaire d'avis est ouvert
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const charger = useCallback(async () => {
    const liste = await recupererAffaires(conversationId);
    setAffaires(liste);
    const confirmees = (liste || []).filter((a) => a.statut === 'confirmee').map((a) => a.id);
    setAvis((await recupererMesAvis(confirmees)) || []);
  }, [conversationId]);
  useEffect(() => {
    charger();
    const releve = setInterval(() => { if (document.visibilityState === 'visible') charger(); }, 30000);
    return () => clearInterval(releve);
  }, [charger]);

  if (!affaires && affaires !== undefined) return null; // fonction non activée
  const autre = role === 'fournisseur' ? t("l'acheteur") : t('le fournisseur');

  async function agir(action) {
    setErreur('');
    try { await action(); await charger(); } catch (err) { setErreur(t(err.message || 'Action impossible.')); }
  }

  async function declarer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await declarerAffaire(conversationId, Math.round(Number(montant)), description.trim(), quantite ? Math.round(Number(quantite)) : null);
      setMontant('');
      setQuantite('');
      setDescription('');
      setFormulaireOuvert(false);
      await charger();
    } catch (err) {
      setErreur(t(err.message || "Impossible d'enregistrer la déclaration."));
    } finally {
      setEnvoi(false);
    }
  }

  async function envoyerAvis(e, affaireId) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await deposerAvis(affaireId, note, commentaire.trim());
      setAvisOuvert(null); setNote(0); setCommentaire('');
      await charger();
    } catch (err) {
      setErreur(t(err.message || "Impossible d'enregistrer votre avis."));
    } finally {
      setEnvoi(false);
    }
  }

  const liste = affaires || [];
  return (
    <div className="msg-affaires">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.86rem' }}><Handshake size={16} /> {t('Affaires conclues')}</span>
        {!formulaireOuvert && (
          <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => setFormulaireOuvert(true)}>
            {t('Déclarer une affaire conclue')}
          </button>
        )}
      </div>

      {formulaireOuvert && (
        <form onSubmit={declarer} style={{ display: 'grid', gap: '0.5rem', marginTop: '0.6rem' }}>
          <p className="esp-aide" style={{ margin: 0 }}>{t('Vous avez conclu une affaire grâce à LOOHOO ? Déclarez-la : {autre} devra la confirmer.', { autre })}</p>
          <input className="champ" type="number" min="1" required placeholder={t('Montant total convenu (F CFA)')} value={montant} onChange={(e) => setMontant(e.target.value)} autoFocus />
          <input className="champ" type="number" min="1" placeholder={t('Quantité vendue (facultatif)')} aria-label={t('Quantité vendue')} value={quantite} onChange={(e) => setQuantite(e.target.value)} />
          <input className="champ" maxLength={200} placeholder={t('Description (ex. 500 pagnes wax, livraison à Bouaké)')} value={description} onChange={(e) => setDescription(e.target.value)} />
          <p className="esp-aide" style={{ margin: 0 }}>{t("Avec la quantité, le stock du produit de cette conversation baisse tout seul quand l'affaire est confirmée.")}</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5em 1.1em', fontSize: '0.82rem' }} disabled={envoi || !montant}>{envoi ? t('Envoi…') : t('Déclarer')}</button>
            <button type="button" className="btn btn-outline" style={{ padding: '0.5em 1.1em', fontSize: '0.82rem' }} onClick={() => setFormulaireOuvert(false)}>{t('Annuler')}</button>
          </div>
        </form>
      )}

      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.82rem', margin: '0.5rem 0 0' }}>{erreur}</p>}

      {liste.map((a) => {
        const st = STATUTS[a.statut] || STATUTS.proposee;
        const moi = a.declaree_par === role;
        return (
          <div key={a.id} className="msg-affaire-ligne">
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: '0.9rem' }}>{prixCFA(a.montant_fcfa)}</strong>
              {a.description && <span style={{ fontSize: '0.82rem', opacity: 0.75 }}> · {a.description}</span>}
              <div className="esp-aide">
                {t('Déclarée par {qui} le {date}', { qui: moi ? t('vous') : autre, date: new Date(a.date_declaration).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR') })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`esp-puce ${st.classe}`}>{t(st.texte)}</span>
              {a.statut === 'proposee' && !moi && (
                <>
                  <button type="button" className="btn adm-confirmer" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => agir(() => repondreAffaire(a.id, true))}><Check size={13} /> {t('Confirmer')}</button>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => agir(() => repondreAffaire(a.id, false))}><X size={13} /> {t('Contester')}</button>
                </>
              )}
              {a.statut === 'proposee' && moi && (
                <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => agir(() => annulerAffaire(a.id))}>{t('Retirer')}</button>
              )}
            </div>
            {role === 'vendeur' && a.statut === 'confirmee' && (() => {
              const donne = avis.find((v) => v.affaire_id === a.id);
              if (donne) {
                const suite = donne.statut === 'publie' ? t('Votre avis est publié.')
                  : donne.statut === 'rejete' ? `${t("Votre avis n'a pas été retenu")}${donne.motif_rejet ? ` : ${donne.motif_rejet}` : '.'}`
                    : t('Votre avis est en cours de lecture par notre équipe.');
                return <div className="esp-aide" style={{ flexBasis: '100%' }}><Etoiles note={donne.note} taille={14} /> {suite}</div>;
              }
              if (avisOuvert !== a.id) {
                return <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => setAvisOuvert(a.id)}>{t('Donner mon avis')}</button>;
              }
              return (
                <form onSubmit={(e) => envoyerAvis(e, a.id)} style={{ display: 'grid', gap: '0.5rem', flexBasis: '100%' }}>
                  <p className="esp-aide" style={{ margin: 0 }}>{t("Comment s'est passée cette affaire ? Pas de numéro ni de lien dans le commentaire.")}</p>
                  <ChoixNote valeur={note} onChange={setNote} />
                  <textarea className="champ" rows={3} maxLength={500} placeholder={t('Votre commentaire (facultatif)')} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5em 1.1em', fontSize: '0.82rem' }} disabled={envoi || !note}>{envoi ? t('Envoi…') : t('Envoyer mon avis')}</button>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.5em 1.1em', fontSize: '0.82rem' }} onClick={() => setAvisOuvert(null)}>{t('Annuler')}</button>
                  </div>
                </form>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
