import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LayoutEspace from './components/LayoutEspace.jsx';
import { suivreSession, finaliserInscriptionEnAttente } from './api/fournisseurs.js';
import { useApparitionAuDefilement } from './utils/useApparitionAuDefilement.js';
const Produits = lazy(() => import('./pages/Produits.jsx'));
const EspaceAcheteur = lazy(() => import('./pages/EspaceAcheteur.jsx'));
const CalculateurMarge = lazy(() => import('./pages/CalculateurMarge.jsx'));
const ChoixInscription = lazy(() => import('./pages/ChoixInscription.jsx'));
const ProduitFormulaire = lazy(() => import('./pages/ProduitFormulaire.jsx'));
const ImportProduits = lazy(() => import('./pages/ImportProduits.jsx'));
import Annuaire from './pages/Annuaire.jsx';
import ProfilGrossiste from './pages/ProfilGrossiste.jsx';
import ProduitDetail from './pages/ProduitDetail.jsx';
import Connexion from './pages/Connexion.jsx';
const Inscription = lazy(() => import('./pages/Inscription.jsx'));
const InscriptionVendeur = lazy(() => import('./pages/InscriptionVendeur.jsx'));
const TableauDeBord = lazy(() => import('./pages/TableauDeBord.jsx'));
const Messagerie = lazy(() => import('./pages/Messagerie.jsx'));
const Mediatheque = lazy(() => import('./pages/Mediatheque.jsx'));
const Profil = lazy(() => import('./pages/Profil.jsx'));
const Statistiques = lazy(() => import('./pages/Statistiques.jsx'));
const MentionsLegales = lazy(() => import('./pages/MentionsLegales.jsx'));
const Confidentialite = lazy(() => import('./pages/Confidentialite.jsx'));
const Conditions = lazy(() => import('./pages/Conditions.jsx'));
const MotDePasseOublie = lazy(() => import('./pages/MotDePasseOublie.jsx'));
const NouveauMotDePasse = lazy(() => import('./pages/NouveauMotDePasse.jsx'));
const DevenirFournisseur = lazy(() => import('./pages/DevenirFournisseur.jsx'));

function GestionDuScroll() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function Introuvable() {
  return (
    <section className="section">
      <div className="container">
        <span className="etiquette">Erreur 404</span>
        <h1 className="section-titre">Cette page n'existe pas.</h1>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '1.5rem' }}>
          Retour à l'annuaire
        </Link>
      </div>
    </section>
  );
}

// Après confirmation de l'e-mail, termine l'inscription (création du profil, envoi de la demande de devis en attente)
function FinaliseurInscription() {
  const navigate = useNavigate();
  useEffect(() => suivreSession((session) => {
    if (!session?.user?.user_metadata?.loohoo) return;
    finaliserInscriptionEnAttente().then((r) => {
      if (!r) return;
      navigate(r.type === 'fournisseur' ? '/tableau-de-bord' : r.conversationId ? `/conversations/${r.conversationId}` : '/conversations');
    }).catch(() => {});
  }), [navigate]);
  return null;
}

function LayoutPublic() {
  const { pathname } = useLocation();
  useApparitionAuDefilement(pathname);
  return (
    <>
      <Header />
      <div key={pathname} className="loo-page"><Outlet /></div>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <div>
      <GestionDuScroll />
      <FinaliseurInscription />
      <Suspense fallback={<div className="loo-chargement-page" role="progressbar" aria-label="Chargement" />}>
      <Routes>
        <Route element={<LayoutPublic />}>
          <Route path="/" element={<Annuaire />} />
          <Route path="/grossiste/:id" element={<ProfilGrossiste />} />
          <Route path="/produit/:id" element={<ProduitDetail />} />
          <Route path="/mon-espace" element={<EspaceAcheteur />} />
          <Route path="/calculateur-marge" element={<CalculateurMarge />} />
          <Route path="/connexion" element={<Connexion />} />
          <Route path="/inscription" element={<ChoixInscription />} />
          <Route path="/inscription/fournisseur" element={<Inscription />} />
          <Route path="/inscription/acheteur" element={<InscriptionVendeur />} />
          <Route path="/devenir-fournisseur" element={<DevenirFournisseur />} />
          <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
          <Route path="/nouveau-mot-de-passe" element={<NouveauMotDePasse />} />
          {/* Anciennes adresses, gardées pour les liens déjà partagés */}
          <Route path="/creer-compte" element={<Navigate to="/inscription/acheteur" replace />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/conditions" element={<Conditions />} />
          <Route path="*" element={<Introuvable />} />
        </Route>

        {/* Espace connecté : cadre application pour un fournisseur, en-tête public pour un vendeur */}
        <Route element={<LayoutEspace />}>
          <Route path="/tableau-de-bord" element={<TableauDeBord />} />
          <Route path="/produits" element={<Produits />} />
          <Route path="/produits/importer" element={<ImportProduits />} />
          <Route path="/produits/nouveau" element={<ProduitFormulaire />} />
          <Route path="/produits/:id/modifier" element={<ProduitFormulaire />} />
          <Route path="/mediatheque" element={<Mediatheque />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/statistiques" element={<Statistiques />} />
          <Route path="/conversations" element={<Messagerie />} />
          <Route path="/conversations/:id" element={<Messagerie />} />
        </Route>
      </Routes>
      </Suspense>
    </div>
  );
}
