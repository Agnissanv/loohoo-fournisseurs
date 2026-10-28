import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Tag } from 'lucide-react';
import ImageOptimisee from './ImageOptimisee.jsx';
import { fourchettePrix } from '../utils/prix.js';
import { initiales } from '../utils/messagerie.js';
import { useLangue } from '../i18n/Langue.jsx';

// Une promotion en cours : sur un produit (photo et prix) ou sur tout le catalogue d'un fournisseur (son logo)
export default function CartePromotion({ promo }) {
  const { t, langue } = useLangue();
  const lien = promo.produit_id ? `/produit/${promo.produit_id}` : `/grossiste/${promo.grossiste_id}`;
  const image = promo.photo_url || promo.logo_url;
  const fin = promo.date_fin ? new Date(promo.date_fin).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' }) : null;
  return (
    <Link to={lien} className="carte carte-promo">
      <div className="carte-promo-image">
        {image ? <ImageOptimisee src={image} largeur={480} alt="" /> : <span className="carte-promo-initiales" aria-hidden="true">{initiales(promo.grossiste_nom)}</span>}
        <span className="badge-promo"><Tag size={12} aria-hidden="true" /> {t('Promo')}</span>
      </div>
      <strong className="carte-promo-titre">{promo.titre}</strong>
      {promo.texte && <span className="carte-promo-texte">{promo.texte}</span>}
      {promo.produit_id && <span className="carte-produit-prix">{fourchettePrix(promo)}</span>}
      <span className="carte-promo-pied">
        {promo.badge_verifie && <BadgeCheck size={13} color="var(--loo-vert)" aria-label={t('Vérifié')} />}
        <span>{promo.produit_nom ? `${promo.produit_nom} · ${promo.grossiste_nom}` : promo.grossiste_nom}</span>
      </span>
      {fin && <span className="carte-promo-fin">{t("Jusqu'au {date}", { date: fin })}</span>}
    </Link>
  );
}
