import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Check, Clock, Copy, Factory, MapPin, MessageCircle, Search, Share2 } from 'lucide-react';
import { recupererGrossiste, recupererDescriptionGrossiste, incrementerVueProfil, recupererAvisPublics } from '../api/fournisseurs.js';
import CarteProduit from '../components/CarteProduit.jsx';
import CaptureSortie from '../components/CaptureSortie.jsx';
import ModaleContact from '../components/ModaleContact.jsx';
import IndicateursConfiance from '../components/IndicateursConfiance.jsx';
import AvisFournisseur from '../components/AvisFournisseur.jsx';
import BoutonFavori from '../components/BoutonFavori.jsx';
import ImageOptimisee from '../components/ImageOptimisee.jsx';
import { Etoiles } from '../components/Etoiles.jsx';
import { anciennete } from '../utils/profilFournisseur.js';
import { infosPays } from '../utils/pays.js';
import { noterVisite } from '../utils/suiviVisites.js';
import { useTitre } from '../utils/useTitre.js';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const ORIGINES = { local: 'Entreprise locale', grossiste_etranger_ci: 'Grossiste étranger installé' };

export default function ProfilGrossiste({ idForce }) {
  const params = useParams();
  const id = idForce || params.id;
  const [grossiste, setGrossiste] = useState(undefined);
  const [contactOuvert, setContactOuvert] = useState(false);
  const [description, setDescription] = useState(null);
  const [avis, setAvis] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('');
  const [tri, setTri] = useState('nom');
  const [lienCopie, setLienCopie] = useState(false);
  const [panne, setPanne] = useState(false);
  const [essai, setEssai] = useState(0);

  useTitre(
    grossiste ? `${grossiste.nom}, fournisseur à ${grossiste.ville}` : null,
    grossiste ? `${grossiste.nom} (${grossiste.categorie}) à ${grossiste.ville} : catalogue au prix de gros et demande de devis.` : null,
  );

  useEffect(() => {
    let annule = false;
    setGrossiste(undefined);
    setPanne(false);
    window.scrollTo({ top: 0 });
    recupererGrossiste(id).then((g) => {
      if (!annule) setGrossiste(g);
      if (g) { incrementerVueProfil(id); noterVisite({ grossisteId: id }); }
    }).catch(() => { if (!annule) { setGrossiste(null); setPanne(true); } });
    recupererDescriptionGrossiste(id).then((d) => { if (!annule) setDescription(d); });
    recupererAvisPublics(id).then((a) => { if (!annule) setAvis(a); });
    return () => { annule = true; };
  }, [id, essai]);

  const produits = grossiste?.produits;
  const categories = useMemo(() => [...new Set((produits || []).map((p) => p.categorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [produits]);
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    let l = (produits || []).filter((p) => (!categorie || p.categorie === categorie)
      && (!q || p.nom.toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q))));
    if (tri === 'prix_asc') l = [...l].sort((a, b) => a.prix_gros_fcfa - b.prix_gros_fcfa);
    if (tri === 'prix_desc') l = [...l].sort((a, b) => b.prix_gros_fcfa - a.prix_gros_fcfa);
    return l;
  }, [produits, recherche, categorie, tri]);

  if (grossiste === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '400px' }} /></div></section>;
  }
  if (!grossiste && panne) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="section-titre">Chargement impossible.</h1>
          <p className="section-intro">La connexion semble coupée. Vérifiez votre réseau, puis réessayez.</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1.2rem' }} onClick={() => setEssai((n) => n + 1)}>Réessayer</button>
        </div>
      </section>
    );
  }
  if (!grossiste) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="section-titre">Fournisseur introuvable.</h1>
          <p className="section-intro">Cette page n'est plus disponible ou le fournisseur n'est pas encore publié.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1.2rem' }}>Voir les produits</Link>
        </div>
      </section>
    );
  }

  const horaires = grossiste.horaires_ouverture || {};
  // « Fermé » et « non renseigné » sont tous deux enregistrés à null : on n'affiche rien tant qu'aucun jour n'a de plage.
  const horairesAffiches = JOURS.some((j) => horaires[j]) ? JOURS.map((j) => [j, horaires[j]]) : [];
  const depuis = anciennete(grossiste.date_ajout);
  const pays = infosPays(grossiste.pays);
  // Adresse courte si le fournisseur en a une, sinon l'adresse de la page
  const lien = grossiste.slug ? `${window.location.origin}/f/${grossiste.slug}` : window.location.href;

  async function copierLien() {
    try { await navigator.clipboard.writeText(lien); setLienCopie(true); setTimeout(() => setLienCopie(false), 2000); } catch { /* indisponible */ }
  }

  return (
    <>
      {/* Bandeau : le dégradé de la marque reste visible tant que la photo charge (ou s'il n'y en a pas) ; le lien de retour est posé dessus */}
      <div style={styles.banniere}>
        {grossiste.banniere_url && <ImageOptimisee src={grossiste.banniere_url} largeur={1400} prioritaire style={styles.banniereImage} />}
        <div className="container" style={{ position: 'relative', paddingTop: '1rem' }}>
          <Link to="/" style={styles.retour}><ArrowLeft size={16} /> Tous les produits</Link>
        </div>
      </div>

      <section className="section" style={{ paddingTop: '0' }}>
        <div className="container">
          <div style={styles.entete}>
            {grossiste.logo_url ? <ImageOptimisee src={grossiste.logo_url} largeur={240} prioritaire style={styles.logo} /> : <div style={{ ...styles.logo, background: 'var(--loo-papier-ombre)' }} />}
            <div className="fiche-texte" style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                {grossiste.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={13} /> Vérifié</span>}
                {grossiste.est_fabricant && <span className="badge badge-fabricant"><Factory size={13} /> Fabricant local</span>}
              </div>
              <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', marginBottom: '0.3rem' }}>{grossiste.nom}</h1>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', opacity: 0.75 }}>
                <MapPin size={14} /> {grossiste.commune ? `${grossiste.commune}, ` : ''}{grossiste.ville}
                {pays && <span title={pays.nom}> · <span aria-hidden="true">{pays.drapeau}</span> {pays.nom}</span>}
                {depuis && <span> · sur LOOHOO depuis {depuis}</span>}
              </span>
              {avis?.nombre > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.9rem' }}>
                  <Etoiles note={avis.moyenne} taille={16} /><strong>{avis.moyenne.toLocaleString('fr-FR')}</strong>
                  <a href="#titre-avis" style={{ opacity: 0.65, textDecoration: 'underline' }}>({avis.nombre} avis)</a>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)} style={{ justifyContent: 'center' }}>
                <MessageCircle size={17} /> Demander un devis
              </button>
              <BoutonFavori grossisteId={grossiste.id} />
              <button type="button" className="btn btn-outline" onClick={copierLien} aria-label="Copier le lien de cette page">
                {lienCopie ? <><Check size={16} /> Copié</> : <><Share2 size={16} /> Partager</>}
              </button>
            </div>
          </div>

          {/* Fiche d'identité : ce qui compte pour décider de faire confiance */}
          <div className="entreprise-infos">
            <div><span className="etiquette-info">Catégorie</span><strong>{grossiste.categorie}</strong></div>
            <div><span className="etiquette-info">Produits</span><strong>{grossiste.produits.length}</strong></div>
            {ORIGINES[grossiste.origine] && <div><span className="etiquette-info">Type</span><strong>{ORIGINES[grossiste.origine]}{grossiste.origine === 'grossiste_etranger_ci' && pays ? ` (${pays.nom})` : ''}</strong></div>}
            {depuis && <div><span className="etiquette-info">Sur LOOHOO depuis</span><strong>{depuis}</strong></div>}
            {pays && <div><span className="etiquette-info">Pays</span><strong><span aria-hidden="true">{pays.drapeau}</span> {pays.nom}</strong></div>}
            <div><span className="etiquette-info">Vérification</span><strong>{grossiste.badge_verifie ? 'Contrôlé par LOOHOO' : 'En cours'}</strong></div>
          </div>

          <IndicateursConfiance grossisteId={grossiste.id} verifie={grossiste.badge_verifie} />

          {(description || horairesAffiches.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '2rem', marginTop: '1.6rem' }}>
              {description && (
                <div>
                  <h2 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>À propos</h2>
                  <p style={{ maxWidth: '68ch', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line' }}>{description}</p>
                </div>
              )}
              {horairesAffiches.length > 0 && (
                <div style={styles.horaires}>
                  <span style={styles.horairesTitre}><Clock size={15} /> Horaires d'ouverture</span>
                  {horairesAffiches.map(([jour, plage]) => (
                    <div key={jour} style={styles.horairesLigne}>
                      <span style={{ textTransform: 'capitalize' }}>{jour}</span>
                      <span>{plage || 'Fermé'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 style={{ fontSize: '1.3rem', margin: '2.2rem 0 1rem' }}>
            Catalogue ({visibles.length}{visibles.length !== grossiste.produits.length ? ` sur ${grossiste.produits.length}` : ''} produit{visibles.length > 1 ? 's' : ''})
          </h2>

          {grossiste.produits.length === 0 ? (
            <p style={{ opacity: 0.7 }}>Le catalogue de ce fournisseur est en cours de constitution.</p>
          ) : (
            <>
              <div className="acc-barre-outils">
                <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <input className="champ" style={{ paddingLeft: '2.3rem' }} type="search" placeholder="Chercher dans ce catalogue" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
                </div>
                <select className="champ" style={{ width: 'auto', padding: '0.6em 0.9em', fontSize: '0.88rem' }} value={tri} onChange={(e) => setTri(e.target.value)} aria-label="Trier par">
                  <option value="nom">Nom (A à Z)</option>
                  <option value="prix_asc">Prix croissant</option>
                  <option value="prix_desc">Prix décroissant</option>
                </select>
              </div>
              {categories.length > 1 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {['', ...categories].map((c) => (
                    <button key={c || 'toutes'} type="button" onClick={() => setCategorie(c)} className="esp-puce" style={{
                      border: 0, cursor: 'pointer', fontSize: '0.8rem', padding: '0.4em 0.9em',
                      background: categorie === c ? 'var(--loo-encre)' : 'var(--loo-papier-ombre)', color: categorie === c ? 'var(--loo-papier)' : 'var(--loo-encre)',
                    }}>{c || 'Tous'}</button>
                  ))}
                </div>
              )}
              {visibles.length === 0 ? (
                <p style={{ opacity: 0.7 }}>Aucun produit ne correspond.</p>
              ) : (
                <div className="loo-fournisseurs-grille">
                  {visibles.map((p) => (
                    <CarteProduit key={p.id} p={{ ...p, grossiste_nom: grossiste.nom, badge_verifie: grossiste.badge_verifie }} />
                  ))}
                </div>
              )}
            </>
          )}

          <AvisFournisseur grossisteId={grossiste.id} donnees={avis} />

          {grossiste.photos.length > 0 && (
            <>
              <h2 style={{ fontSize: '1.2rem', margin: '2.4rem 0 1rem' }}>Photos de l'entreprise</h2>
              <div className="photos-grossiste">
                {grossiste.photos.map((url) => <ImageOptimisee key={url} src={url} largeur={700} alt={`Photo de ${grossiste.nom}`} />)}
              </div>
            </>
          )}
        </div>
      </section>
      <div className="barre-devis-espace" aria-hidden="true" />
      <div className="barre-devis-mobile">
        <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)}><MessageCircle size={17} /> Demander un devis à {grossiste.nom}</button>
      </div>
      {contactOuvert && (
        <ModaleContact grossiste={grossiste} produit={null} onClose={() => setContactOuvert(false)} />
      )}
      <CaptureSortie recherche={grossiste.nom} />
    </>
  );
}

const styles = {
  banniere: { height: '220px', background: 'var(--gradient-marque)', position: 'relative', overflow: 'hidden' },
  banniereImage: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  retour: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: '#fff', background: 'rgba(23, 18, 13, 0.55)', padding: '0.4em 0.8em', borderRadius: '8px' },
  entete: { display: 'flex', alignItems: 'flex-end', gap: '1.2rem', marginTop: '-48px', flexWrap: 'wrap', position: 'relative', zIndex: 1 },
  horaires: { maxWidth: '340px', fontSize: '0.88rem' },
  horairesTitre: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.05rem' },
  horairesLigne: { display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', opacity: 0.85 },
  logo: { width: '96px', height: '96px', borderRadius: '12px', objectFit: 'cover', border: '4px solid var(--loo-papier)', background: 'var(--loo-papier)' },
};
