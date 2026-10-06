import React, { useCallback, useEffect, useState } from 'react';
import { Check, Handshake, X } from 'lucide-react';
import { recupererAffaires, declarerAffaire, repondreAffaire, annulerAffaire } from '../api/fournisseurs.js';

const STATUTS = {
  proposee: { texte: 'En attente de confirmation', classe: 'esp-puce-orange' },
  confirmee: { texte: 'Confirmée', classe: 'esp-puce-vert' },
  contestee: { texte: 'Contestée', classe: 'esp-puce-rouge' },
  annulee: { texte: 'Annulée', classe: 'esp-puce-neutre' },
};
const formatPrix = (n) => `${Number(n).toLocaleString('fr-FR')} F CFA`;

// Déclaration des affaires conclues grâce à LOOHOO : une partie déclare, l'autre confirme.
// Rien n'est affiché tant que la fonction n'est pas activée sur la base.
export default function PanneauAffaires({ conversationId, role }) {
  const [affaires, setAffaires] = useState(undefined); // undefined = chargement, null = fonction indisponible
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const charger = useCallback(() => recupererAffaires(conversationId).then(setAffaires), [conversationId]);
  useEffect(() => {
    charger();
    const releve = setInterval(() => { if (document.visibilityState === 'visible') charger(); }, 30000);
    return () => clearInterval(releve);
  }, [charger]);

  if (!affaires && affaires !== undefined) return null; // fonction non activée
  const autre = role === 'fournisseur' ? "l'acheteur" : 'le fournisseur';

  async function agir(action) {
    setErreur('');
    try { await action(); await charger(); } catch (err) { setErreur(err.message || 'Action impossible.'); }
  }

  async function declarer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await declarerAffaire(conversationId, Math.round(Number(montant)), description.trim());
      setMontant('');
      setDescription('');
      setFormulaireOuvert(false);
      await charger();
    } catch (err) {
      setErreur(err.message || "Impossible d'enregistrer la déclaration.");
    } finally {
      setEnvoi(false);
    }
  }

  const liste = affaires || [];
  return (
    <div className="msg-affaires">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.86rem' }}><Handshake size={16} /> Affaires conclues</span>
        {!formulaireOuvert && (
          <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => setFormulaireOuvert(true)}>
            Déclarer une affaire conclue
          </button>
        )}
      </div>

      {formulaireOuvert && (
        <form onSubmit={declarer} style={{ display: 'grid', gap: '0.5rem', marginTop: '0.6rem' }}>
          <p className="esp-aide" style={{ margin: 0 }}>Vous avez conclu une affaire grâce à LOOHOO ? Déclarez-la : {autre} devra la confirmer.</p>
          <input className="champ" type="number" min="1" required placeholder="Montant total convenu (F CFA)" value={montant} onChange={(e) => setMontant(e.target.value)} autoFocus />
          <input className="champ" maxLength={200} placeholder="Description (ex. 500 pagnes wax, livraison à Bouaké)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5em 1.1em', fontSize: '0.82rem' }} disabled={envoi || !montant}>{envoi ? 'Envoi…' : 'Déclarer'}</button>
            <button type="button" className="btn btn-outline" style={{ padding: '0.5em 1.1em', fontSize: '0.82rem' }} onClick={() => setFormulaireOuvert(false)}>Annuler</button>
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
              <strong style={{ fontSize: '0.9rem' }}>{formatPrix(a.montant_fcfa)}</strong>
              {a.description && <span style={{ fontSize: '0.82rem', opacity: 0.75 }}> · {a.description}</span>}
              <div className="esp-aide">
                Déclarée par {moi ? 'vous' : autre} le {new Date(a.date_declaration).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className={`esp-puce ${st.classe}`}>{st.texte}</span>
              {a.statut === 'proposee' && !moi && (
                <>
                  <button type="button" className="btn adm-confirmer" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => agir(() => repondreAffaire(a.id, true))}><Check size={13} /> Confirmer</button>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => agir(() => repondreAffaire(a.id, false))}><X size={13} /> Contester</button>
                </>
              )}
              {a.statut === 'proposee' && moi && (
                <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.78rem' }} onClick={() => agir(() => annulerAffaire(a.id))}>Retirer</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
