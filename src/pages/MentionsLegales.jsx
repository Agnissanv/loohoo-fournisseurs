import React from 'react';
import { Link } from 'react-router-dom';
import PageLegale, { AC } from './PageLegale.jsx';

export default function MentionsLegales() {
  return (
    <PageLegale titre="Mentions légales" dateMaj="26 septembre 2026">
      <h2>Éditeur</h2>
      <p>LOOHOO Fournisseurs est un service édité par LOOHOO, la même entreprise qui édite looh-oo.com.</p>
      <ul>
        <li>Raison sociale et siège : <AC>informations de l'éditeur</AC> — voir aussi les mentions légales de{' '}
          <a href="https://looh-oo.com/mentions-legales" target="_blank" rel="noreferrer">looh-oo.com</a>.</li>
        <li>Conception et développement : Code A-Z (<a href="https://www.agnissanisaac.com/" target="_blank" rel="noreferrer">agnissanisaac.com</a>).</li>
        <li>Hébergement : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.</li>
      </ul>
      <h2>Objet du service</h2>
      <p>
        LOOHOO Fournisseurs est un annuaire qui met en relation des vendeurs/e-commerçants à la recherche d'un
        fournisseur ou fabricant, et des grossistes ou fabricants installés en Côte d'Ivoire. LOOHOO ne vend
        aucun produit lui-même et n'est pas partie aux échanges commerciaux entre vendeurs et fournisseurs.
      </p>
      <h2>Données personnelles</h2>
      <p>
        Voir notre <Link to="/confidentialite">politique de confidentialité</Link> et nos{' '}
        <Link to="/conditions">conditions d'utilisation</Link>.
      </p>
      <h2>Droit applicable</h2>
      <p>Droit ivoirien ; tribunaux d'Abidjan compétents. <AC>à faire confirmer par le client ou un juriste</AC></p>
    </PageLegale>
  );
}