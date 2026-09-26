import React from 'react';
import { Link } from 'react-router-dom';
import PageLegale, { AC } from './PageLegale.jsx';

export default function Conditions() {
  return (
    <PageLegale titre="Conditions d'utilisation" dateMaj="26 septembre 2026">
      <h2>1. Objet</h2>
      <p>
        LOOHOO Fournisseurs met en relation des vendeurs et des fournisseurs. LOOHOO n'est partie à aucune
        vente entre eux, ne garantit pas la qualité des produits ni le sérieux de chaque partie au-delà de la
        vérification décrite à l'article 3.
      </p>
      <h2>2. Comptes fournisseurs</h2>
      <p>
        Un fournisseur garantit l'exactitude des informations fournies (stock, prix, contact) et s'engage à les
        maintenir à jour. LOOHOO peut suspendre un profil qui ne respecte pas ces engagements.
      </p>
      <h2>3. Vérification</h2>
      <p>
        Un profil n'est publié qu'après vérification par l'équipe LOOHOO (contact confirmé, photos réelles,
        stock déclaré). Cette vérification ne constitue pas une garantie absolue et n'engage pas la
        responsabilité de LOOHOO sur les transactions qui suivent.
      </p>
      <h2>4. Mise en relation</h2>
      <p>
        La demande de contact ouvre une conversation WhatsApp entre le vendeur et le fournisseur. LOOHOO
        n'intervient pas dans cette conversation ni dans la transaction qui peut en découler.
      </p>
      <h2>5. Utilisation loyale</h2>
      <p>Vous vous engagez à ne pas extraire massivement les données de l'annuaire, ni à usurper l'identité d'un tiers.</p>
      <h2>6. Données personnelles</h2>
      <p>Voir notre <Link to="/confidentialite">politique de confidentialité</Link>.</p>
      <h2>7. Droit applicable</h2>
      <p>Droit ivoirien ; tribunaux d'Abidjan compétents. <AC>à faire confirmer par le client ou un juriste</AC></p>
    </PageLegale>
  );
}