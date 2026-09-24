import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Annuaire from './pages/Annuaire.jsx';

function Introuvable() {
  return (
    <section className="section">
      <div className="container">
        <span className="etiquette">Erreur 404</span>
        <h1 className="section-titre">Cette page n'existe pas (encore).</h1>
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
      <Header />
      <Routes>
        <Route path="/" element={<Annuaire />} />
        <Route path="*" element={<Introuvable />} />
      </Routes>
      <Footer />
    </div>
  );
}