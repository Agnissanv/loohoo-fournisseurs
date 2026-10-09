import React, { useEffect, useState } from 'react';
import { recupererFormulesAbonnement } from '../api/fournisseurs.js';

const f = (n) => Number(n).toLocaleString('fr-FR');

// Où en est le fournisseur par rapport au seuil de ventes gratuites, et les formules qui suivent (prix validés par le client).
// Le contenu de chaque niveau n'est pas encore défini : on n'affiche que ce qui est décidé.
export default function BlocAbonnement({ abonnement }) {
  const [formules, setFormules] = useState(null);
  useEffect(() => { recupererFormulesAbonnement().then(setFormules); }, []);
  if (!abonnement) return null;

  const { ventes, seuil, abonnement_actif: actif } = abonnement;
  const pourcent = Math.min(100, Math.round((ventes / Math.max(1, seuil)) * 100));
  const depasse = ventes >= seuil;
  const niveaux = formules?.niveaux || [];

  return (
    <div className="esp-carte">
      <h2 className="esp-carte-titre">
        <span>Votre abonnement</span>
        <span className="esp-aide" style={{ margin: 0 }}>{ventes} / {seuil} ventes</span>
      </h2>
      <div className="esp-progression" role="progressbar" aria-valuenow={Math.min(ventes, seuil)} aria-valuemin={0} aria-valuemax={seuil} aria-label="Ventes confirmées avant la fin de la période gratuite">
        <div style={{ width: `${pourcent}%` }} />
      </div>
      <p style={{ margin: '0.7rem 0 0', fontSize: '0.9rem', lineHeight: 1.55 }}>
        {actif
          ? 'Votre abonnement est actif.'
          : depasse
            ? `Vous avez dépassé vos ${seuil} ventes gratuites. Notre équipe vous contacte pour choisir votre formule.`
            : `Niveau 0 : LOOHOO est gratuit jusqu'à ${seuil} ventes confirmées. Il vous en reste ${seuil - ventes}.`}
      </p>

      {niveaux.length > 0 && (
        <details className="formules" open={depasse && !actif}>
          <summary>Voir les formules après la période gratuite</summary>
          <table className="formules-table">
            <thead><tr><th scope="col">Formule</th><th scope="col">Par mois</th><th scope="col">Par an</th></tr></thead>
            <tbody>
              {niveaux.map((n) => {
                const economie = n.mensuel * 12 - n.annuel;
                return (
                  <tr key={n.niveau}>
                    <th scope="row">Niveau {n.niveau}</th>
                    <td>{f(n.mensuel)} F</td>
                    <td>{f(n.annuel)} F{economie > 0 && <span className="formules-eco">{f(economie)} F d'économie</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      )}
      <p className="esp-aide" style={{ margin: '0.5rem 0 0' }}>Une vente compte quand l'acheteur et vous la confirmez dans la conversation.</p>
    </div>
  );
}
