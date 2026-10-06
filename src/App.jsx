import React, { useEffect } from 'react';
import { Routes, Route, Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import LayoutEspace from './components/LayoutEspace.jsx';
import { suivreSession, finaliserInscriptionEnAttente } from './api/fournisseurs.js';
import Produits from './pages/Produits.jsx';
import ChoixInscription from './pages/ChoixInscription.jsx';
import ProduitFormulaire from './pages/ProduitFormulaire.jsx';
import ImportProduits from './pages/ImportProduits.jsx';
import Annuaire from './pages/Annuaire.jsx';
import ProfilGrossiste from './pages/ProfilGrossiste.jsx';
import ProduitDetail from './pages/ProduitDetail.jsx';
import Connexion from './pages/Connexion.jsx';
import Inscription from './pages/Inscription.jsx';
import InscriptionVendeur from './pages/InscriptionVendeur.jsx';
import TableauDeBord from './pages/TableauDeBord.jsx';
import Messagerie from './pages/Messagerie.jsx';
import Mediatheque from './pages/Mediatheque.jsx';
import Profil from './pages/Profil.jsx';
import Statistiques from './pages/Statistiques.jsx';
import MentionsLegales from './pages/MentionsLegales.jsx';
import Confidentialite from './pages/Confidentialite.jsx';
import Conditions from './pages/Conditions.jsx';
import MotDePasseOublie from './pages/MotDePasseOublie.jsx';
import NouveauMotDePasse from './pages/NouveauMotDePasse.jsx';
import DevenirFournisseur from './pages/DevenirFournisseur.jsx';

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
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <div>
      <GestionDuScroll />
      <FinaliseurInscription />
      <Routes>
        <Route element={<LayoutPublic />}>
          <Route path="/" element={<Annuaire />} />
          <Route path="/grossiste/:id" element={<ProfilGrossiste />} />
          <Route path="/produit/:id" element={<ProduitDetail />} />
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
    </div>
  );
}
