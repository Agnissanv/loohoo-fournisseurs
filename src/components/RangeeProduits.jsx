import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CarteProduit from './CarteProduit.jsx';
import { useLangue } from '../i18n/Langue.jsx';

// Une rangée de produits qu'on fait glisser soi-même (jamais de défilement automatique)
export default function RangeeProduits({ titre, produits, action }) {
  const { t } = useLangue();
  const piste = useRef(null);
  const defiler = (sens) => piste.current?.scrollBy({ left: sens * piste.current.clientWidth * 0.85, behavior: 'smooth' });
  if (!produits?.length) return null;
  return (
    <section className="rangee" aria-label={titre}>
      <div className="rangee-tete">
        <h2>{titre}</h2>
        <div className="rangee-actions">
          {action}
          <button type="button" className="rangee-fleche" onClick={() => defiler(-1)} aria-label={t('Produits précédents')}><ChevronLeft size={18} /></button>
          <button type="button" className="rangee-fleche" onClick={() => defiler(1)} aria-label={t('Produits suivants')}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="rangee-piste" ref={piste}>
        {produits.map((p) => <div key={p.id} className="rangee-element"><CarteProduit p={p} /></div>)}
      </div>
    </section>
  );
}
