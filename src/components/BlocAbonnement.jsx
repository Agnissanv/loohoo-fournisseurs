import React, { useEffect, useState } from 'react';
import { recupererFormulesAbonnement } from '../api/fournisseurs.js';

const f = (n) => Number(n).toLocaleString('fr-FR');

// Formule du fournisseur et demandes reçues ce mois-ci (migration 0033). Les formules sont plafonnées par nouvelles demandes
// par mois, les ventes ne déclenchent plus rien. Le plafond est mesuré et affiché ; il n'est pas encore appliqué par la plateforme,
// donc on ne promet pas de mise en attente : à 100 %, l'équipe prend contact.
export default function BlocAbonnement({ abonnement }) {
  const [formules, setFormules] = useState(null);
  useEffect(() => { recupererFormulesAbonnement().then(setFormules); }, []);
  if (!abonnement || abonnement.formule === undefined) return null; // migration 0033 pas encore exécutée

  const { formule, demandes_utilisees: utilisees, demandes_max: max } = abonnement;
  const niveaux = (formules?.niveaux || []).filter((n) => n.code);
  const courante = niveaux.find((n) => n.code === formule);
  const illimite = max == null;
  const pourcent = illimite ? 0 : Math.min(100, Math.round((utilisees / Math.max(1, max)) * 100));
  const atteint = !illimite && utilisees >= max;
  const proche = !illimite && !atteint && pourcent >= 80;
  const couleur = atteint ? 'var(--loo-rouge)' : proche ? 'var(--loo-orange)' : undefined;

  return (
    <div className="esp-carte">
      <h2 className="esp-carte-titre">
        <span>Votre formule : {courante?.nom || 'Départ'}</span>
        <span className="esp-aide" style={{ margin: 0 }}>{illimite ? `${f(utilisees)} demandes ce mois-ci` : `${f(utilisees)} / ${f(max)} demandes`}</span>
      </h2>

      {!illimite && (
        <div className="esp-progression" role="progressbar" aria-valuenow={Math.min(utilisees, max)} aria-valuemin={0} aria-valuemax={max} aria-label="Nouvelles demandes reçues ce mois-ci">
          <div style={{ width: `${pourcent}%`, background: couleur }} />
        </div>
      )}

      <p style={{ margin: '0.7rem 0 0', fontSize: '0.9rem', lineHeight: 1.55, color: couleur, fontWeight: atteint || proche ? 600 : 400 }}>
        {illimite
          ? 'Vous recevez toutes les demandes des acheteurs, sans plafond.'
          : atteint
            ? `Vous avez atteint les ${f(max)} demandes de votre formule ce mois-ci. Notre équipe vous contacte pour passer à la formule supérieure.`
            : proche
              ? `Vous avez utilisé ${pourcent} % de vos demandes du mois. Il en reste ${f(max - utilisees)}.`
              : `Votre formule comprend jusqu'à ${f(max)} nouvelles demandes par mois. Il vous en reste ${f(max - utilisees)}.`}
      </p>
      <p className="esp-aide" style={{ margin: '0.4rem 0 0' }}>
        Une demande, c'est un acheteur qui vous écrit pour la première fois. Les échanges déjà ouverts ne comptent pas. Le compteur repart de zéro le 1er de chaque mois.
      </p>

      {niveaux.length > 0 && (
        <details className="formules">
          <summary>Voir les formules</summary>
          <table className="formules-table">
            <thead><tr><th scope="col">Formule</th><th scope="col">Demandes par mois</th><th scope="col">Par mois</th><th scope="col">Par an</th></tr></thead>
            <tbody>
              {niveaux.map((n) => {
                const economie = n.mensuel * 12 - n.annuel;
                const gratuit = !n.mensuel;
                return (
                  <tr key={n.code}>
                    <th scope="row">{n.nom}{n.code === formule && <span className="formules-eco">Votre formule</span>}</th>
                    <td>{n.demandes_mois == null ? 'Illimitées' : f(n.demandes_mois)}</td>
                    <td>{gratuit ? 'Gratuit' : `${f(n.mensuel)} F CFA`}</td>
                    <td>{gratuit ? '—' : <>{f(n.annuel)} F CFA{economie > 0 && <span className="formules-eco">{f(economie)} F CFA d'économie</span>}</>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </details>
      )}
      <p className="esp-aide" style={{ margin: '0.5rem 0 0' }}>Rien n'est prélevé sur vos ventes. Le badge « Vérifié » ne s'achète pas : il est accordé par l'équipe après contrôle, quelle que soit la formule.</p>
    </div>
  );
}
