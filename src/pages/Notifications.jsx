import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ListeAnnonces from '../components/ListeAnnonces.jsx';
import { suivreSession, recupererMonRole } from '../api/fournisseurs.js';
import { useCloche } from '../utils/useCloche.js';
import { useTitre } from '../utils/useTitre.js';
import { useLangue } from '../i18n/Langue.jsx';

const FILTRES = [
  ['', 'Tout'],
  ['annonces', 'Annonces'],
  ['promotion', 'Promotions'],
  ['alertes', 'Alertes'],
  ['video', 'Vidéos'],
];
const GROUPES = { annonces: ['annonce', 'nouveaute', 'pays'], alertes: ['fournisseur', 'stock', 'certificat'] };
const correspond = (filtre, e) => !filtre || (GROUPES[filtre] ? GROUPES[filtre].includes(e.type) : e.type === filtre);

// « Tout voir » de la cloche : toutes les nouvelles, filtrables. Les ouvrir les marque comme lues.
export default function Notifications() {
  const { t } = useLangue();
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const { elements, charge, estNouveau, marquerLues } = useCloche(session);
  const [aLire, setALire] = useState(null);
  const [filtre, setFiltre] = useState('');
  useTitre(t('Notifications'));

  useEffect(() => suivreSession(setSession), []);
  useEffect(() => { if (session) recupererMonRole().then((r) => setRole(r.role)).catch(() => {}); }, [session]);

  // Les points « nouveau » sont figés à l'arrivée sur la page, puis tout est marqué comme lu
  useEffect(() => {
    if (!charge || aLire) return;
    setALire(new Set(elements.filter(estNouveau).map((e) => e.id)));
    marquerLues();
  }, [charge, aLire, elements, estNouveau, marquerLues]);

  const visibles = elements.filter((e) => correspond(filtre, e));

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <div className="container" style={{ maxWidth: '760px' }}>
        <h1 className="notifs-titre">{t('Notifications')}</h1>
        <p className="notifs-intro">
          {role === 'vendeur'
            ? t('Les annonces de LOOHOO, les promotions des fournisseurs que vous suivez ou avez contactés, et vos alertes.')
            : t('Les annonces de LOOHOO, les nouveaux pays et les vidéos de la chaîne.')}
        </p>

        <div className="puces-piste" role="group" aria-label={t('Filtrer')} style={{ paddingTop: 0, marginBottom: '1rem' }}>
          {FILTRES.map(([v, l]) => (
            <button key={v || 'tout'} type="button" className={`puce${filtre === v ? ' puce-active' : ''}`} aria-pressed={filtre === v} onClick={() => setFiltre(v)}>{t(l)}</button>
          ))}
        </div>

        {!charge ? (
          <div className="loo-squelette" style={{ height: '280px' }} />
        ) : visibles.length === 0 ? (
          <div className="notifs-vide">
            <p>{filtre === 'promotion' ? t('Aucune promotion en cours.') : t('Rien de nouveau pour le moment.')}</p>
            {role !== 'vendeur' && (filtre === 'promotion' || !filtre) && (
              <p>{t('Créez un compte acheteur et appuyez sur « Suivre » sur la page d\'un fournisseur : ses promotions arriveront ici.')} <Link to="/inscription/acheteur">{t('Créer un compte acheteur')}</Link></p>
            )}
          </div>
        ) : (
          <div className="notifs-liste"><ListeAnnonces elements={visibles} nouveaux={aLire || new Set()} /></div>
        )}
      </div>
    </section>
  );
}
