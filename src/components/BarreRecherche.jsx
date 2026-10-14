import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useLangue } from '../i18n/Langue.jsx';

const CLES_FILTRES = ['pays', 'ville', 'commune', 'prix_max', 'moq_max', 'verifies', 'origine'];

// Le champ de recherche unique de l'en-tête, avec le bouton « Filtres ». Depuis n'importe quelle page, il mène aux résultats.
export default function BarreRecherche() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { t } = useLangue();
  const surAccueil = pathname === '/';
  const params = new URLSearchParams(surAccueil ? search : '');
  const [saisie, setSaisie] = useState(params.get('q') || '');
  const nbFiltres = CLES_FILTRES.filter((k) => params.get(k)).length;

  useEffect(() => { setSaisie(surAccueil ? new URLSearchParams(search).get('q') || '' : ''); }, [search, surAccueil]);

  function aller(modif) {
    const p = new URLSearchParams(surAccueil ? search : '');
    modif(p);
    navigate(`/?${p.toString()}`.replace(/\?$/, ''));
  }

  return (
    <form className="barre-recherche" role="search" onSubmit={(e) => { e.preventDefault(); aller((p) => (saisie.trim() ? p.set('q', saisie.trim()) : p.delete('q'))); }}>
      <Search size={18} className="barre-recherche-loupe" aria-hidden="true" />
      <input type="search" value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={t('Que cherchez-vous ? (pagne, sac…)')} aria-label={t('Rechercher un produit')} enterKeyHint="search" />
      {saisie && (
        <button type="button" className="barre-recherche-effacer" aria-label={t('Effacer')} onClick={() => { setSaisie(''); if (surAccueil) aller((p) => p.delete('q')); }}>
          <X size={16} />
        </button>
      )}
      <button type="button" className="barre-recherche-filtres" onClick={() => aller((p) => p.set('filtres', '1'))}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        <span>{t('Filtres')}</span>
        {nbFiltres > 0 && <span className="barre-recherche-nb">{nbFiltres}</span>}
      </button>
    </form>
  );
}
