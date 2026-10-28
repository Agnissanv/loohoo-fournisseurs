import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import ListeAnnonces from './ListeAnnonces.jsx';
import { useCloche } from '../utils/useCloche.js';
import { useLangue } from '../i18n/Langue.jsx';

// Cloche de l'en-tête public : un petit panneau à droite avec les dernières nouvelles et un lien « Tout voir ».
// À l'ouverture, tout est marqué comme lu, mais les points « nouveau » restent visibles le temps de la lecture.
export default function ClocheAnnonces({ session }) {
  const { t } = useLangue();
  const { pathname } = useLocation();
  const { elements, charge, nouveaux, estNouveau, marquerLues } = useCloche(session);
  const [ouvert, setOuvert] = useState(false);
  const [aLire, setALire] = useState(new Set());
  const zone = useRef(null);

  useEffect(() => setOuvert(false), [pathname]);
  useEffect(() => {
    if (!ouvert) return undefined;
    const fermer = (e) => { if (zone.current && !zone.current.contains(e.target)) setOuvert(false); };
    const echap = (e) => { if (e.key === 'Escape') setOuvert(false); };
    document.addEventListener('mousedown', fermer);
    document.addEventListener('keydown', echap);
    return () => { document.removeEventListener('mousedown', fermer); document.removeEventListener('keydown', echap); };
  }, [ouvert]);

  function basculer() {
    if (!ouvert) {
      setALire(new Set(elements.filter(estNouveau).map((e) => e.id)));
      if (nouveaux > 0) marquerLues();
    }
    setOuvert((o) => !o);
  }

  return (
    <div className="cloche" ref={zone}>
      <button type="button" className="entete-icone" onClick={basculer} aria-expanded={ouvert} aria-haspopup="dialog"
        aria-label={nouveaux ? t('Notifications ({n} nouvelles)', { n: nouveaux }) : t('Notifications')}>
        <Bell size={20} />
        {nouveaux > 0 && <span className="entete-pastille">{nouveaux > 9 ? '9+' : nouveaux}</span>}
      </button>
      {ouvert && (
        <div className="cloche-panneau" role="dialog" aria-label={t('Notifications')}>
          <div className="cloche-tete">
            <strong>{t('Notifications')}</strong>
            <button type="button" className="cloche-fermer" onClick={() => setOuvert(false)} aria-label={t('Fermer')}><X size={18} /></button>
          </div>
          {!charge ? (
            <div className="cloche-vide"><div className="loo-squelette" style={{ height: '120px' }} /></div>
          ) : elements.length === 0 ? (
            <p className="cloche-vide">{t('Rien de nouveau pour le moment. Les annonces de LOOHOO et les promotions des fournisseurs que vous suivez ou avez contactés arriveront ici.')}</p>
          ) : (
            <ListeAnnonces elements={elements.slice(0, 6)} nouveaux={aLire} onChoisir={() => setOuvert(false)} compact />
          )}
          <Link to="/notifications" className="cloche-tout" onClick={() => setOuvert(false)}>{t('Tout voir')}</Link>
        </div>
      )}
    </div>
  );
}
