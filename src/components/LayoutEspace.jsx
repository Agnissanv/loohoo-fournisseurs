import { useTitreNonLus } from '../utils/useTitreNonLus.js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Bell, ChevronDown, ExternalLink, Image as IconeImage, LayoutDashboard, LogOut,
  Menu, MessageCircle, Package, Settings, X,
} from 'lucide-react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import {
  suivreSession, recupererIdentiteFournisseur, deconnecterFournisseur,
  compterMessagesNonLus, suivreActiviteMessages, recupererNotifications,
} from '../api/fournisseurs.js';

const LIENS = [
  { vers: '/tableau-de-bord', texte: 'Tableau de bord', icone: LayoutDashboard },
  { vers: '/produits', texte: 'Mes produits', icone: Package },
  { vers: '/mediatheque', texte: 'Médiathèque', icone: IconeImage },
  { vers: '/conversations', texte: 'Demandes', icone: MessageCircle, pastille: true },
  { vers: '/statistiques', texte: 'Statistiques', icone: BarChart3 },
  { vers: '/profil', texte: 'Paramètres', icone: Settings },
];

const initiales = (nom = '') =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase() || 'L';

// Cadre commun des pages /tableau-de-bord, /produits, /mediatheque, /profil, /statistiques, /conversations.
// Un fournisseur voit le cadre « application » (menu latéral). Un vendeur garde l'en-tête public.
export default function LayoutEspace() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [session, setSession] = useState(undefined);
  const [identite, setIdentite] = useState(undefined); // undefined = chargement, null = pas fournisseur
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [nonLus, setNonLus] = useState(0);
  useTitreNonLus(nonLus);

  useEffect(() => suivreSession(setSession), []);

  const chargerIdentite = useCallback(async () => {
    if (!session) return;
    try { setIdentite(await recupererIdentiteFournisseur(session.user.id)); }
    catch { setIdentite(null); }
  }, [session]);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    chargerIdentite();
  }, [session, navigate, chargerIdentite]);

  useEffect(() => setMenuOuvert(false), [pathname]);

  useEffect(() => {
    if (!identite) return undefined;
    const rafraichir = () => compterMessagesNonLus('fournisseur').then(setNonLus);
    rafraichir();
    return suivreActiviteMessages(rafraichir);
  }, [identite]);

  if (session === undefined || (session && identite === undefined)) {
    return <div className="container" style={{ padding: '3rem 1.5rem' }}><div className="loo-squelette" style={{ height: '240px' }} /></div>;
  }
  if (session === null) return null;

  // Compte vendeur (ou fournisseur dont le profil n'est pas encore créé) : en-tête public habituel
  if (!identite) {
    return (
      <>
        <Header />
        <Outlet context={{ identite: null, rafraichirIdentite: chargerIdentite }} />
        <Footer />
      </>
    );
  }

  return (
    <div className={`esp${menuOuvert ? ' esp-menu-ouvert' : ''}`}>
      <header className="esp-haut">
        <div className="esp-marque">
          <button type="button" className="esp-bouton-icone esp-burger" onClick={() => setMenuOuvert((o) => !o)} aria-label="Ouvrir le menu">
            {menuOuvert ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/tableau-de-bord" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src="/logo.webp" alt="" width="34" height="34" />
            <span className="esp-marque-nom">LOOHOO</span>
          </Link>
          <span className="esp-marque-sep" />
          <span className="esp-marque-titre">Espace Fournisseur</span>
        </div>
        <div className="esp-haut-droite">
          <Cloche nonLus={nonLus} />
          <MenuUtilisateur identite={identite} onDeconnexion={async () => { await deconnecterFournisseur(); navigate('/'); }} />
        </div>
      </header>

      <div className="esp-corps">
        <nav className="esp-menu" aria-label="Espace fournisseur">
          {LIENS.map(({ vers, texte, icone: Icone, pastille }) => (
            <NavLink key={vers} to={vers} className={({ isActive }) => `esp-lien${isActive ? ' esp-lien-actif' : ''}`}>
              <Icone size={19} /> {texte}
              {pastille && nonLus > 0 && <span className="esp-pastille">{nonLus}</span>}
            </NavLink>
          ))}
          <div className="esp-menu-bas">
            <Link to={`/grossiste/${identite.id}`} className="esp-lien" target="_blank"><ExternalLink size={19} /> Ma page publique</Link>
            <button
              type="button" className="esp-lien" style={{ width: '100%', background: 'none', border: 0, borderLeft: '3px solid transparent', cursor: 'pointer', font: 'inherit', fontWeight: 600, color: 'var(--loo-rouge)' }}
              onClick={async () => { await deconnecterFournisseur(); navigate('/'); }}
            >
              <LogOut size={19} /> Déconnexion
            </button>
          </div>
        </nav>
        <div className="esp-voile" onClick={() => setMenuOuvert(false)} />
        <main className="esp-contenu">
          <Outlet context={{ identite, rafraichirIdentite: chargerIdentite }} />
        </main>
      </div>
    </div>
  );
}

// Ferme un menu déroulant quand on clique à côté
function useClicExterieur(ouvert, fermer) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ouvert) return undefined;
    const gestionnaire = (e) => { if (ref.current && !ref.current.contains(e.target)) fermer(); };
    document.addEventListener('mousedown', gestionnaire);
    return () => document.removeEventListener('mousedown', gestionnaire);
  }, [ouvert, fermer]);
  return ref;
}

function Cloche({ nonLus }) {
  const [ouvert, setOuvert] = useState(false);
  const [liste, setListe] = useState(null);
  const fermer = useCallback(() => setOuvert(false), []);
  const ref = useClicExterieur(ouvert, fermer);

  function basculer() {
    const suivant = !ouvert;
    setOuvert(suivant);
    if (suivant) recupererNotifications('fournisseur').then(setListe).catch(() => setListe([]));
  }

  return (
    <div className="esp-relatif" ref={ref}>
      <button type="button" className="esp-bouton-icone" onClick={basculer} aria-label={`Notifications${nonLus ? ` (${nonLus} non lues)` : ''}`}>
        <Bell size={22} />
        {nonLus > 0 && <span className="esp-pastille">{nonLus > 99 ? '99+' : nonLus}</span>}
      </button>
      {ouvert && (
        <div className="esp-menu-deroulant" style={{ minWidth: '300px' }}>
          <div className="esp-menu-titre">Nouveaux messages</div>
          {liste === null && <p style={{ padding: '0.6rem 0.7rem', margin: 0, opacity: 0.6, fontSize: '0.88rem' }}>Chargement…</p>}
          {liste && liste.length === 0 && <p style={{ padding: '0.6rem 0.7rem', margin: 0, opacity: 0.6, fontSize: '0.88rem' }}>Rien de nouveau.</p>}
          {liste && liste.map((n) => (
            <Link key={n.id} to={`/conversations/${n.id}`} className="esp-notification" onClick={fermer}>
              <strong>{n.auteur || 'Un acheteur'}</strong>{n.nonLus > 1 ? ` · ${n.nonLus} messages` : ''}
              <small>{n.dernier?.contenu.slice(0, 60)}{n.produit ? ` — ${n.produit}` : ''}</small>
            </Link>
          ))}
          <Link to="/conversations" onClick={fermer} style={{ justifyContent: 'center', color: 'var(--loo-rouge)', fontWeight: 600 }}>Voir toutes les conversations</Link>
        </div>
      )}
    </div>
  );
}

function MenuUtilisateur({ identite, onDeconnexion }) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const ref = useClicExterieur(ouvert, fermer);

  return (
    <div className="esp-relatif" ref={ref}>
      <button type="button" className="esp-utilisateur" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
        <span className="esp-avatar">{identite.logo_url ? <img src={identite.logo_url} alt="" /> : initiales(identite.nom)}</span>
        <span className="esp-nom">{identite.nom}</span>
        <ChevronDown size={16} />
      </button>
      {ouvert && (
        <div className="esp-menu-deroulant">
          <Link to="/profil" onClick={fermer}><Settings size={16} /> Profil et paramètres</Link>
          <Link to={`/grossiste/${identite.id}`} target="_blank" onClick={fermer}><ExternalLink size={16} /> Voir ma page publique</Link>
          <button type="button" onClick={onDeconnexion} style={{ color: 'var(--loo-rouge)' }}><LogOut size={16} /> Se déconnecter</button>
        </div>
      )}
    </div>
  );
}
