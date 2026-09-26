import React from 'react';
import PageLegale, { AC } from './PageLegale.jsx';

export default function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité" dateMaj="26 septembre 2026">
      <p>
        Cette page décrit les données traitées sur LOOHOO Fournisseurs, distinct de la vitrine looh-oo.com qui a
        sa propre politique.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>LOOHOO, <AC>raison sociale et adresse</AC>. Contact : <a href="mailto:contact@looh-oo.com">contact@looh-oo.com</a>.</p>

      <h2>2. Si vous cherchez un fournisseur (vendeur)</h2>
      <p>
        La recherche et la consultation des profils ne demandent aucune inscription. Si vous cliquez sur
        « Contacter ce fournisseur », nous collectons votre nom, votre téléphone et votre e-mail pour créer un
        lien WhatsApp vers le fournisseur et garder une trace de la demande. Ces informations peuvent aussi
        servir à vous recontacter, y compris pour vous proposer d'autres services LOOHOO (comme la création
        d'une boutique en ligne).
      </p>

      <h2>3. Si vous êtes fournisseur</h2>
      <p>
        La création d'un compte fournisseur collecte le nom de votre entreprise, votre catégorie, votre
        localisation, votre numéro de téléphone, et les produits que vous ajoutez à votre catalogue. Votre
        numéro de téléphone n'est jamais affiché publiquement : il ne sert qu'à générer un lien WhatsApp une
        fois qu'un vendeur vous contacte. Votre profil n'apparaît dans l'annuaire qu'après vérification par
        notre équipe.
      </p>

      <h2>4. Si vous quittez le site sans contacter personne</h2>
      <p>
        Une invite peut vous proposer de laisser votre e-mail pour être averti de nouveaux fournisseurs
        correspondant à votre recherche. C'est facultatif.
      </p>

      <h2>5. Durée de conservation</h2>
      <p>
        Les comptes fournisseurs sont conservés tant qu'ils restent actifs. Les demandes de contact et les
        e-mails laissés en sortie sont conservés <AC>durée à définir avec le client</AC>.
      </p>

      <h2>6. Vos droits</h2>
      <p>
        Accès, rectification, suppression : écrivez à <a href="mailto:contact@looh-oo.com">contact@looh-oo.com</a>.
        Vous pouvez aussi saisir l'ARTCI, autorité ivoirienne de protection des données personnelles.
      </p>

      <h2>7. Services techniques utilisés</h2>
      <ul>
        <li><strong>Supabase</strong> : hébergement des comptes et des données de l'annuaire.</li>
        <li><strong>Vercel</strong> : hébergement du site.</li>
        <li><strong>WhatsApp</strong> : la mise en relation s'y poursuit ; WhatsApp/Meta traite alors vos messages selon ses propres règles, hors du contrôle de LOOHOO.</li>
      </ul>

      <h2>8. Modifications</h2>
      <p>Cette politique peut évoluer ; la date de mise à jour figure en haut de page.</p>
    </PageLegale>
  );
}