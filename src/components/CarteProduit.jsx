import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Package } from 'lucide-react';
import ImageOptimisee from './ImageOptimisee.jsx';
import { estNouveau, fourchettePrix, quantite } from '../utils/prix.js';
import { useLangue } from '../i18n/Langue.jsx';

// Carte d'un produit : photo, nom, fournisseur, fourchette de prix des paliers et minimum de commande.
// sansFournisseur : sur la page d'un fournisseur, on n'a pas besoin de répéter son nom.
export default function CarteProduit({ p, sansFournisseur = false }) {
  const { t } = useLangue();
  return (
    <Link to={`/produit/${p.id}`} className="carte carte-produit">
      <div className="carte-produit-image">
        {p.photo_url ? <ImageOptimisee src={p.photo_url} largeur={480} alt={p.nom} /> : <Package size={28} color="var(--loo-orange)" />}
        {estNouveau(p.date_ajout) && <span className="badge-nouveau">{t('Nouveau')}</span>}
      </div>
      <h3 className="carte-produit-nom">{p.nom}</h3>
      {!sansFournisseur && p.grossiste_nom && (
        <div className="carte-produit-fournisseur">
          {p.badge_verifie && <BadgeCheck size={13} color="var(--loo-vert)" aria-label={t('Vérifié')} />}
          <span>{p.grossiste_nom}</span>
        </div>
      )}
      <div className="carte-produit-prix">
        {fourchettePrix(p)}
        {p.unite && <span className="carte-produit-unite"> / {p.unite}</span>}
      </div>
      <span className="carte-produit-moq">{t('Minimum')} : {quantite(p.moq || 1, p.unite)}</span>
    </Link>
  );
}
