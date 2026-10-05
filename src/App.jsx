import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Annuaire from './pages/Annuaire.jsx';
import ProfilGrossiste from './pages/ProfilGrossiste.jsx';
import ProduitDetail from './pages/ProduitDetail.jsx';
import Connexion from './pages/Connexion.jsx';
import Inscription from './pages/Inscription.jsx';
import InscriptionVendeur from './pages/InscriptionVendeur.jsx';
import TableauDeBord from './pages/TableauDeBord.jsx';
import Conversations from './pages/Conversations.jsx';
import Conversation from './pages/Conversation.jsx';
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

export default function App() {
  return (
    <div>
      <GestionDuScroll />
      <Header />
      <Routes>
        <Route path="/" element={<Annuaire />} />
        <Route path="/grossiste/:id" element={<ProfilGrossiste />} />
        <Route path="/produit/:id" element={<ProduitDetail />} />
        <Route path="/connexion" element={<Connexion />} />
        <Route path="/inscription" element={<Inscription />} />
        <Route path="/devenir-fournisseur" element={<DevenirFournisseur />} />
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
        <Route path="/nouveau-mot-de-passe" element={<NouveauMotDePasse />} />
        <Route path="/creer-compte" element={<InscriptionVendeur />} />
        <Route path="/tableau-de-bord" element={<TableauDeBord />} />
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/conversations/:id" element={<Conversation />} />
        <Route path="/mediatheque" element={<Mediatheque />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/statistiques" element={<Statistiques />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="/conditions" element={<Conditions />} />
        <Route path="*" element={<Introuvable />} />
      </Routes>
      <Footer />
    </div>
  );
}