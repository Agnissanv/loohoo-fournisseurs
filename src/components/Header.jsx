import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, LogOut, MessageCircle, User } from 'lucide-react';
import { suivreSession, recupererMonRole, deconnecterFournisseur, compterMessagesNonLus, suivreActiviteMessages } from '../api/fournisseurs.js';
import { useTitreNonLus } from '../utils/useTitreNonLus.js';
import { ChoixLangue, useLangue } from '../i18n/Langue.jsx';
import BarreRecherche from './BarreRecherche.jsx';
import ClocheAnnonces from './ClocheAnnonces.jsx';

// En-tête sur une seule ligne, fond clair : logo, langue, puis « Se connecter » / « Créer un compte » (ou le compte connecté).
// « Devenir fournisseur » n'est plus ici : l'invitation reste discrète en bas de page (retours du client, 13 oct.).
export default function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLangue();
  const [session, setSession] = useState(undefined);
  const [identite, setIdentite] = useState(null); // { role, nom } une fois connu
  const [nonLus, setNonLus] = useState(0);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const menu = useRef(null);

  useEffect(() => suivreSession(setSession), []);
  useTitreNonLus(nonLus);
  useEffect(() => setMenuOuvert(false), [pathname]);

  useEffect(() => {
    if (!session) { setIdentite(null); setNonLus(0); return undefined; }
    let arreter = () => {};
    let annule = false;
    recupererMonRole().then((r) => {
      if (annule) return;
      if (r.role) {
        setIdentite({ role: r.role, nom: r.profil?.nom });
        const rafraichir = () => compterMessagesNonLus(r.role).then(setNonLus).catch(() => {});
        rafraichir();
        arreter = suivreActiviteMessages(rafraichir);
      } else {
        setIdentite(null);
      }
    });
    return () => { annule = true; arreter(); };
  }, [session]);

  // Le menu du compte se ferme quand on clique ailleurs
  useEffect(() => {
    if (!menuOuvert) return undefined;
    const fermer = (e) => { if (menu.current && !menu.current.contains(e.target)) setMenuOuvert(false); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [menuOuvert]);

  async function seDeconnecter() {
    await deconnecterFournisseur();
    navigate('/');
  }

  const initiale = (identite?.nom || '?').trim().charAt(0).toUpperCase();
  const espace = identite?.role === 'fournisseur' ? { vers: '/tableau-de-bord', texte: t('Tableau de bord') } : { vers: '/mon-espace', texte: t('Mon espace') };

  return (
    <header className="entete-site">
      <div className="container entete-barre">
        <Link to="/" className="entete-marque" aria-label={t('LOOHOO Fournisseurs, accueil')}>
          <img src="/logo.webp" alt="" width="36" height="36" />
          <span className="entete-nom">LOOHOO</span>
          <span className="etiquette entete-sous">{t('Fournisseurs')}</span>
        </Link>

        <div className="entete-recherche"><BarreRecherche /></div>

        <div className="entete-actions">
          <ChoixLangue />
          <ClocheAnnonces session={session} />
          {session === undefined ? null : identite ? (
            <>
              <Link to="/conversations" className="entete-icone" aria-label={nonLus ? t('Mes conversations ({n} non lus)', { n: nonLus }) : t('Mes conversations')}>
                <MessageCircle size={20} />
                {nonLus > 0 && <span className="entete-pastille">{nonLus > 99 ? '99+' : nonLus}</span>}
              </Link>
              <div className="entete-compte" ref={menu}>
                <button type="button" className="entete-compte-bouton" onClick={() => setMenuOuvert((o) => !o)} aria-expanded={menuOuvert} aria-haspopup="menu">
                  <span className="entete-avatar" aria-hidden="true">{initiale}</span>
                  <span className="entete-compte-nom">{identite.nom}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>
                {menuOuvert && (
                  <div className="entete-menu" role="menu">
                    <Link to={espace.vers} role="menuitem"><LayoutDashboard size={16} /> {espace.texte}</Link>
                    <Link to="/conversations" role="menuitem"><MessageCircle size={16} /> {t('Mes conversations')}{nonLus > 0 ? ` (${nonLus})` : ''}</Link>
                    {identite.role === 'fournisseur' && <Link to="/profil" role="menuitem"><User size={16} /> {t('Mon profil')}</Link>}
                    <button type="button" role="menuitem" onClick={seDeconnecter}><LogOut size={16} /> {t('Déconnexion')}</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/connexion" className="entete-lien" aria-label={t('Se connecter')}><User size={20} className="entete-lien-icone" aria-hidden="true" /><span className="entete-lien-texte">{t('Se connecter')}</span></Link>
              <Link to="/inscription" className="btn btn-primary entete-cta">{t('Créer un compte')}</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
