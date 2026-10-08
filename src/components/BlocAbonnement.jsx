import React from 'react';

// Où en est le fournisseur par rapport au seuil de ventes gratuites. Aucun prix ni échéance n'est affiché
// tant que le modèle n'est pas arrêté avec le client : le bloc ne montre que ce qui est vrai.
export default function BlocAbonnement({ abonnement }) {
  if (!abonnement) return null;
  const { ventes, seuil, abonnement_actif: actif } = abonnement;
  const pourcent = Math.min(100, Math.round((ventes / Math.max(1, seuil)) * 100));
  const depasse = ventes >= seuil;
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
          ? 'Votre abonnement est actif : vous profitez des avantages de visibilité de LOOHOO.'
          : depasse
            ? `Vous avez dépassé les ${seuil} ventes gratuites. Notre équipe vous contactera pour la suite.`
            : `LOOHOO est gratuit jusqu'à ${seuil} ventes confirmées. Il vous en reste ${seuil - ventes}.`}
      </p>
      <p className="esp-aide" style={{ margin: '0.4rem 0 0' }}>Une vente compte quand l'acheteur et vous la confirmez dans la conversation.</p>
    </div>
  );
}
