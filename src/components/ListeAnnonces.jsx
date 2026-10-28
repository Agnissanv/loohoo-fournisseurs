import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, FileWarning, Globe, Megaphone, PackageCheck, PlayCircle, Sparkles, Tag } from 'lucide-react';
import { useLangue } from '../i18n/Langue.jsx';

const TYPES = {
  nouveaute: { icone: Sparkles, libelle: 'Nouveauté' },
  annonce: { icone: Megaphone, libelle: 'Annonce LOOHOO' },
  pays: { icone: Globe, libelle: 'Nouveau pays' },
  promotion: { icone: Tag, libelle: 'Promotion' },
  video: { icone: PlayCircle, libelle: 'Nouvelle vidéo' },
  fournisseur: { icone: BadgeCheck, libelle: 'Nouveau fournisseur' },
  stock: { icone: PackageCheck, libelle: 'Retour en stock' },
  certificat: { icone: FileWarning, libelle: 'Certificat' },
};

// Les alertes calculées par la base arrivent en français (« De retour en stock : … ») : on traduit le début
const PREFIXES = ['Nouveau fournisseur vérifié : ', 'De retour en stock : ', 'Certificat expiré : ', 'Certificat à renouveler : '];
function titreTraduit(titre, t) {
  const p = PREFIXES.find((x) => titre?.startsWith(x));
  return p ? t(p.trim()) + ' ' + titre.slice(p.length) : titre;
}

function quand(date, t) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 60) return t('il y a {n} min', { n: minutes });
  const heures = Math.round(minutes / 60);
  if (heures < 24) return t('il y a {n} h', { n: heures });
  const jours = Math.round(heures / 24);
  return jours === 1 ? t('hier') : t('il y a {n} jours', { n: jours });
}

// Une liste d'éléments de la cloche (panneau, espace fournisseur, page « Notifications »).
// nouveaux : ensemble des identifiants à marquer d'un point orange. onChoisir : appelé au clic (pour fermer un panneau).
export default function ListeAnnonces({ elements, nouveaux = new Set(), onChoisir, compact = false }) {
  const { t } = useLangue();
  return (
    <ul className={`annonces${compact ? ' annonces-compact' : ''}`}>
      {elements.map((e) => {
        const { icone: Icone, libelle } = TYPES[e.type] || TYPES.annonce;
        const contenu = (
          <>
            <span className={`annonce-icone annonce-${e.type}`} aria-hidden="true"><Icone size={18} /></span>
            <span className="annonce-corps">
              <span className="annonce-meta">
                {t(libelle)}
                {e.type === 'promotion' && e.fournisseur && (
                  <> · {e.fournisseur}{e.badge_verifie && <BadgeCheck size={12} aria-label={t('Vérifié')} className="annonce-verifie" />}</>
                )}
                {' · '}{quand(e.date, t)}
              </span>
              <strong>{titreTraduit(e.titre, t)}</strong>
              {e.texte && <span className="annonce-texte">{e.texte}</span>}
            </span>
            {nouveaux.has(e.id) && <span className="annonce-nouveau" aria-label={t('Nouveau')} />}
          </>
        );
        return (
          <li key={e.id}>
            {!e.lien ? <div className="annonce">{contenu}</div>
              : e.lien.startsWith('/') ? <Link to={e.lien} className="annonce" onClick={onChoisir}>{contenu}</Link>
                : <a href={e.lien} className="annonce" target="_blank" rel="noreferrer" onClick={onChoisir}>{contenu}</a>}
          </li>
        );
      })}
    </ul>
  );
}
