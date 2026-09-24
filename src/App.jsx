import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Annuaire from './pages/Annuaire.jsx';
import ProfilGrossiste from './pages/ProfilGrossiste.jsx';

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
        <Route path="*" element={<Introuvable />} />
      </Routes>
      <Footer />
    </div>
  );
}