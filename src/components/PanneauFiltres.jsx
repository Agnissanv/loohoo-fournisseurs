import React from 'react';
import { usePays } from '../utils/usePays.js';
import { useLieux } from '../utils/useLieux.js';
import { drapeau } from '../utils/pays.js';
import { useLangue } from '../i18n/Langue.jsx';

// Tous les filtres de la recherche, au même endroit : dans une fenêtre (téléphone, bouton « Filtres ») ou dans une colonne (ordinateur).
// valeurs : { pays, ville, commune, categorie, prixMax, qteMax, verifies } ; changer({ cle: valeur }) met à jour l'adresse.
export default function PanneauFiltres({ valeurs, changer, categories = [] }) {
  const { t } = useLangue();
  const { tous: listePays } = usePays();
  const { villes, communes } = useLieux();
  const listeVilles = villes(valeurs.pays);
  const listeCommunes = communes(valeurs.pays, valeurs.ville);

  return (
    <div className="panneau-filtres">
      <label className="filtre-bloc">
        <span>{t('Fournisseurs en')}</span>
        <select className="champ" value={valeurs.pays} onChange={(e) => changer({ pays: e.target.value, ville: '', commune: '' })}>
          <option value="">{t('Tous les pays')}</option>
          {listePays.map((p) => <option key={p.code} value={p.code} disabled={!p.actif}>{drapeau(p.code)} {p.nom}{p.actif ? '' : ` ${t('(bientôt)')}`}</option>)}
        </select>
      </label>

      <label className="filtre-bloc">
        <span>{t('Ville')}</span>
        <select className="champ" value={valeurs.ville} onChange={(e) => changer({ ville: e.target.value, commune: '' })}>
          <option value="">{t('Toutes les villes')}</option>
          {listeVilles.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </label>

      {listeCommunes.length > 0 && (
        <label className="filtre-bloc">
          <span>{t('Commune')}</span>
          <select className="champ" value={valeurs.commune} onChange={(e) => changer({ commune: e.target.value })}>
            <option value="">{t('Toutes les communes')}</option>
            {listeCommunes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      )}

      <label className="filtre-bloc">
        <span>{t('Catégorie')}</span>
        <select className="champ" value={valeurs.categorie} onChange={(e) => changer({ categorie: e.target.value })}>
          <option value="">{t('Toutes les catégories')}</option>
          {categories.map((c) => <option key={c.categorie} value={c.categorie}>{t(c.categorie)}{c.nombre ? ` (${c.nombre})` : ''}</option>)}
        </select>
      </label>

      <label className="filtre-bloc">
        <span>{t('Prix maximum par pièce')}</span>
        <span className="filtre-avec-unite">
          <input className="champ" type="number" inputMode="numeric" min="0" step="500" value={valeurs.prixMax || ''} onChange={(e) => changer({ prix_max: e.target.value })} />
          <em>F CFA</em>
        </span>
      </label>

      <label className="filtre-bloc">
        <span>{t('Je commande au plus')}</span>
        <span className="filtre-avec-unite">
          <input className="champ" type="number" inputMode="numeric" min="1" value={valeurs.qteMax || ''} onChange={(e) => changer({ moq_max: e.target.value })} />
          <em>{t('pièces')}</em>
        </span>
        <small>{t('Pour ne voir que les produits dont le minimum de commande vous convient.')}</small>
      </label>

      <label className="filtre-case">
        <input type="checkbox" checked={valeurs.verifies} onChange={(e) => changer({ verifies: e.target.checked ? '1' : '' })} />
        {t('Fournisseurs vérifiés seulement')}
      </label>
    </div>
  );
}
