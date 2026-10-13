import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { recupererLiensCommunaute } from '../api/fournisseurs.js';
import { RESEAUX } from './IconesReseaux.jsx';
import { useLangue } from '../i18n/Langue.jsx';

const SITE_OFFICIEL = 'https://looh-oo.com';

// Pied de page en quatre groupes (LOOHOO, Acheteurs, Fournisseurs, Communauté), fond clair, touches d'orange.
export default function Footer() {
  const { t } = useLangue();
  const [liens, setLiens] = useState({});
  useEffect(() => { recupererLiensCommunaute().then(setLiens); }, []);
  const reseaux = RESEAUX.filter((r) => liens[r.cle]);

  return (
    <footer className="pied">
      <div className="container pied-grille">
        <div>
          <h2 className="pied-titre">LOOHOO</h2>
          <ul>
            <li><a href={`${SITE_OFFICIEL}/a-propos`}>{t('À propos')}</a></li>
            <li><a href={SITE_OFFICIEL}>{t('Site officiel LOOHOO')}</a></li>
            <li><a href="mailto:contact@looh-oo.com?subject=Partenariat%20LOOHOO">{t('Partenariats et collaborations')}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="pied-titre">{t('Acheteurs')}</h2>
          <ul>
            <li><Link to="/">{t('Trouver un fournisseur')}</Link></li>
            <li><Link to="/inscription/acheteur">{t('Créer un compte acheteur')}</Link></li>
            <li><Link to="/mon-espace">{t('Mon espace acheteur')}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="pied-titre">{t('Fournisseurs')}</h2>
          <ul>
            <li><Link to="/devenir-fournisseur">{t('Rejoindre le réseau')}</Link></li>
            <li><Link to="/calculateur-marge">{t('Calculateur de marge')}</Link></li>
            <li><Link to="/connexion">{t('Espace fournisseur')}</Link></li>
          </ul>
        </div>
        {reseaux.length > 0 && (
          <div>
            <h2 className="pied-titre">{t('Rejoignez la communauté')}</h2>
            <ul className="pied-reseaux">
              {reseaux.map(({ cle, nom, Icone }) => (
                <li key={cle}><a href={liens[cle]} target="_blank" rel="noreferrer" aria-label={t(nom)} title={t(nom)}><Icone size={20} /></a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="container pied-bas">
        <span>© {new Date().getFullYear()} LOOHOO</span>
        <nav aria-label={t('Informations légales')}>
          <Link to="/mentions-legales">{t('Mentions légales')}</Link>
          <Link to="/confidentialite">{t('Confidentialité')}</Link>
          <Link to="/conditions">{t("Conditions d'utilisation")}</Link>
        </nav>
      </div>
    </footer>
  );
}
