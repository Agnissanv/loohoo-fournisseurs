import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Camera, Check, Copy, Factory, MessageCircle, Search, ShieldCheck, Tag } from 'lucide-react';
import {
  recupererGrossiste, recupererDescriptionGrossiste, incrementerVueProfil, recupererAvisPublics, recupererIndicateursConfiance,
  recupererPhotosTerrain, recupererDocumentsVerifies,
} from '../api/fournisseurs.js';
import CarteProduit from '../components/CarteProduit.jsx';
import CaptureSortie from '../components/CaptureSortie.jsx';
import ModaleContact from '../components/ModaleContact.jsx';
import AvisFournisseur from '../components/AvisFournisseur.jsx';
import BoutonFavori from '../components/BoutonFavori.jsx';
import ImageOptimisee from '../components/ImageOptimisee.jsx';
import { Etoiles } from '../components/Etoiles.jsx';
import { IconeWhatsApp } from '../components/IconesReseaux.jsx';
import { anciennete, TYPES_ENTREPRISE, LANGUES, MOYENS_PAIEMENT, DOCUMENTS_PUBLICS, estProducteur } from '../utils/profilFournisseur.js';
import { infosPays } from '../utils/pays.js';
import { initiales } from '../utils/messagerie.js';
import { noterVisite } from '../utils/suiviVisites.js';
import { useTitre } from '../utils/useTitre.js';
import { useLangue } from '../i18n/Langue.jsx';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

function delaiReponse(h, t) {
  if (h == null) return null;
  if (h < 1) return t("moins d'1 h");
  if (h < 24) return t('environ {n} h', { n: Math.round(h) });
  const j = Math.round(h / 24);
  return t(j > 1 ? 'environ {n} jours' : 'environ {n} jour', { n: j });
}

// Profil public du fournisseur, dans l'ordre demandé par le client : en-tête, informations clés, catalogue,
// présentation de l'entreprise, photos vérifiées et documents, avis des acheteurs, ligne de confiance.
export default function ProfilGrossiste({ idForce }) {
  const params = useParams();
  const id = idForce || params.id;
  const { t, langue } = useLangue();
  const [grossiste, setGrossiste] = useState(undefined);
  const [contactOuvert, setContactOuvert] = useState(false);
  const [description, setDescription] = useState(null);
  const [avis, setAvis] = useState(null);
  const [indicateurs, setIndicateurs] = useState(null);
  const [photosTerrain, setPhotosTerrain] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('');
  const [tri, setTri] = useState('nouveautes');
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
    // Le reste se charge à côté, sans jamais bloquer la page
    recupererDescriptionGrossiste(id).then((d) => { if (!annule) setDescription(d); });
    recupererAvisPublics(id).then((a) => { if (!annule) setAvis(a); });
    recupererIndicateursConfiance(id).then((i) => { if (!annule) setIndicateurs(i); }).catch(() => {});
    recupererPhotosTerrain(id).then((p) => { if (!annule) setPhotosTerrain(p); });
    recupererDocumentsVerifies(id).then((d) => { if (!annule) setDocuments(d); });
    return () => { annule = true; };
  }, [id, essai]);

  const produits = grossiste?.produits;
  const categories = useMemo(() => [...new Set((produits || []).map((p) => p.categorie).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [produits]);
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    let l = (produits || []).filter((p) => (!categorie || p.categorie === categorie)
      && (!q || p.nom.toLowerCase().includes(q) || (p.tags || []).some((x) => x.toLowerCase().includes(q))));
    if (tri === 'prix_asc') l = [...l].sort((a, b) => a.prix_gros_fcfa - b.prix_gros_fcfa);
    if (tri === 'prix_desc') l = [...l].sort((a, b) => b.prix_gros_fcfa - a.prix_gros_fcfa);
    if (tri === 'nom') l = [...l].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return l; // « nouveautés » : l'ordre reçu, les plus récents d'abord
  }, [produits, recherche, categorie, tri]);

  if (grossiste === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '400px' }} /></div></section>;
  }
  if (!grossiste && panne) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="section-titre">{t('Chargement impossible.')}</h1>
          <p className="section-intro">{t('La connexion semble coupée. Vérifiez votre réseau, puis réessayez.')}</p>
          <button type="button" className="btn btn-primary" style={{ marginTop: '1.2rem' }} onClick={() => setEssai((n) => n + 1)}>{t('Réessayer')}</button>
        </div>
      </section>
    );
  }
  if (!grossiste) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="section-titre">{t('Fournisseur introuvable.')}</h1>
          <p className="section-intro">{t("Cette page n'est plus disponible.")}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1.2rem' }}>{t('Voir les produits')}</Link>
        </div>
      </section>
    );
  }

  const g = grossiste;
  const locale = langue === 'en' ? 'en-GB' : 'fr-FR';
  const dateLongue = (d) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const type = g.type_entreprise || (g.est_fabricant ? 'fabricant' : null);
  const pays = infosPays(g.pays_code || g.pays);
  const origine = g.afficher_origine && g.pays_origine ? infosPays(g.pays_origine) : null;
  const depuis = anciennete(g.date_ajout);
  const delai = delaiReponse(indicateurs?.delai_reponse_heures != null ? Number(indicateurs.delai_reponse_heures) : null, t);
  const ventes = Number(indicateurs?.affaires_confirmees) || 0;
  const langues = (g.langues || []).map((c) => t(LANGUES[c] || c));
  // Dernier contrôle : la vérification du badge ou la dernière visite photographiée, la plus récente des deux
  const dernierControle = [g.badge_verifie && g.verifie_le, photosTerrain[0]?.prise_le].filter(Boolean)
    .map((d) => new Date(d)).sort((a, b) => b - a)[0];

  const horaires = g.horaires_ouverture || {};
  const horairesAffiches = JOURS.some((j) => horaires[j]) ? JOURS.map((j) => [j, horaires[j]]) : [];
  const anneesActivite = g.annee_creation ? new Date().getFullYear() - g.annee_creation : null;
  const paiements = (g.moyens_paiement || []).map((m) => t(MOYENS_PAIEMENT[m] || m));
  const faq = Array.isArray(g.faq) ? g.faq : [];
  const fiche = [
    g.annee_creation && [t('Création'), anneesActivite > 0 ? t('{annee} · {n} ans d\'activité', { annee: g.annee_creation, n: anneesActivite }) : String(g.annee_creation)],
    g.specialites && [t('Spécialités et principaux produits'), g.specialites],
    g.emplacement && [t('Emplacement'), g.emplacement],
    g.zones_expedition && [t('Expédie vers'), g.zones_expedition],
    paiements.length > 0 && [t('Paiements acceptés'), paiements.join(' · ')],
  ].filter(Boolean);
  const oui = (v) => (v ? t('Oui') : t('Non'));
  const ficheType = estProducteur(type)
    ? [
      g.atelier && [t("L'atelier"), g.atelier],
      g.nb_employes && [t("Nombre d'employés"), String(g.nb_employes)],
      g.capacite_production && [t('Capacité de production'), g.capacite_production],
      g.sur_mesure != null && [t('Sur-mesure'), oui(g.sur_mesure)],
      g.pose_logo != null && [t('Pose de logo'), oui(g.pose_logo)],
    ].filter(Boolean)
    : [
      g.pays_provenance && [t('La marchandise vient de'), g.pays_provenance],
      g.marques && [t('Marques distribuées'), g.marques],
      g.frequence_arrivages && [t('Arrivages'), g.frequence_arrivages],
    ].filter(Boolean);
  const vitrineRemplie = description || fiche.length || ficheType.length || horairesAffiches.length || faq.length || g.video_presentation_url;

  // Adresse courte si le fournisseur en a une (aperçu WhatsApp avec sa bannière), sinon l'adresse de la page
  const lien = g.slug ? `${window.location.origin}/f/${g.slug}` : `${window.location.origin}/grossiste/${g.id}`;
  const messageWhatsApp = [
    t('Regarde ce fournisseur sur LOOHOO :'),
    `*${g.nom}*${g.badge_verifie ? ` (${t('fournisseur vérifié')})` : ''}`,
    [type && t(TYPES_ENTREPRISE[type]), g.categorie && t(g.categorie), g.ville].filter(Boolean).join(' · '),
    lien,
  ].join('\n');

  async function copierLien() {
    try { await navigator.clipboard.writeText(lien); setLienCopie(true); setTimeout(() => setLienCopie(false), 2000); } catch { /* indisponible */ }
  }

  return (
    <>
      {/* Bannière : le dégradé de la marque reste visible tant que la photo charge (ou s'il n'y en a pas) */}
      <div className="pf-banniere">
        {g.banniere_url && <ImageOptimisee src={g.banniere_url} largeur={1400} prioritaire alt="" className="pf-banniere-image" />}
        <div className="container pf-banniere-haut">
          <Link to="/" className="pf-retour"><ArrowLeft size={16} aria-hidden="true" /> {t('Tous les produits')}</Link>
        </div>
      </div>

      <section className="section pf-page">
        <div className="container">
          {/* 1. En-tête : logo, nom, badges et actions. Le lieu et l'ancienneté sont dans le cadre, une seule fois. */}
          <header className="pf-entete">
            {g.logo_url
              ? <ImageOptimisee src={g.logo_url} largeur={240} prioritaire alt="" className="pf-logo" />
              : <span className="pf-logo pf-logo-initiales" aria-hidden="true">{initiales(g.nom)}</span>}
            <div className="pf-identite">
              <div className="pf-badges">
                {g.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={13} aria-hidden="true" /> {t('Vérifié')}</span>}
                {type && <span className="badge badge-fabricant">{type === 'fabricant' && <Factory size={13} aria-hidden="true" />} {t(TYPES_ENTREPRISE[type])}</span>}
              </div>
              <h1>{g.nom}</h1>
            </div>
            <div className="pf-actions">
              <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)}>
                <MessageCircle size={17} aria-hidden="true" /> {t('Demander un devis')}
              </button>
              <BoutonFavori grossisteId={g.id} />
              <a className="btn btn-outline pf-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(messageWhatsApp)}`} target="_blank" rel="noreferrer">
                <IconeWhatsApp size={17} /> {t('Partager')}
              </a>
              <button type="button" className="btn btn-outline pf-copier" onClick={copierLien} aria-label={t('Copier le lien')} title={t('Copier le lien')}>
                {lienCopie ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </header>

          {/* 2. Cadre d'informations clés */}
          <dl className="pf-cadre">
            {type && <div><dt>{t('Type')}</dt><dd>{t(TYPES_ENTREPRISE[type])}</dd></div>}
            {origine && (
              <div><dt>{t("Origine de l'entreprise")}</dt>
                <dd><span aria-hidden="true">{origine.drapeau}</span> {origine.nom}{g.ville ? <span className="pf-cadre-sous">{t('installée à {ville}', { ville: g.ville })}</span> : null}</dd></div>
            )}
            <div><dt>{t('Localisation')}</dt><dd>{g.commune ? `${g.commune}, ` : ''}{g.ville}{pays && <span className="pf-cadre-sous"><span aria-hidden="true">{pays.drapeau}</span> {pays.nom}</span>}</dd></div>
            <div><dt>{t('Note des acheteurs')}</dt>
              <dd>{avis?.nombre > 0
                ? <a href="#titre-avis" className="pf-note"><Etoiles note={avis.moyenne} taille={15} /> {avis.moyenne.toLocaleString(locale)} <span className="pf-cadre-sous">{t('{n} avis', { n: avis.nombre })}</span></a>
                : t("Pas encore d'avis")}</dd></div>
            {delai && <div><dt>{t('Temps de réponse moyen')}</dt><dd>{delai}</dd></div>}
            {ventes > 0 && <div><dt>{t('Ventes réalisées sur LOOHOO')}</dt><dd>{ventes.toLocaleString(locale)}</dd></div>}
            {langues.length > 0 && <div><dt>{t('Langues parlées')}</dt><dd>{langues.join(', ')}</dd></div>}
            {depuis && <div><dt>{t('Sur LOOHOO depuis')}</dt><dd>{depuis}</dd></div>}
            <div className={g.badge_verifie ? 'pf-cadre-verifie' : ''}><dt>{t('Vérification')}</dt>
              <dd>{g.badge_verifie
                ? <>{t('Contrôlé par LOOHOO')}{dernierControle && <span className="pf-cadre-sous">{t('dernier contrôle le {date}', { date: dateLongue(dernierControle) })}</span>}</>
                : t('Vérification en cours')}</dd></div>
          </dl>

          {/* 3. Catalogue */}
          <section className="pf-section" aria-labelledby="titre-catalogue">
            <h2 id="titre-catalogue">
              {t('Catalogue')} <span className="pf-compte">{visibles.length !== g.produits.length ? t('{n} sur {total}', { n: visibles.length, total: g.produits.length }) : g.produits.length}</span>
            </h2>
            {g.produits.length === 0 ? (
              <p className="pf-vide">{t('Le catalogue de ce fournisseur est en cours de constitution.')}</p>
            ) : (
              <>
                <div className="acc-barre-outils">
                  <div className="pf-recherche">
                    <Search size={15} aria-hidden="true" />
                    <input className="champ" type="search" placeholder={t('Chercher dans ce catalogue')} aria-label={t('Chercher dans ce catalogue')} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
                  </div>
                  <select className="champ tri" value={tri} onChange={(e) => setTri(e.target.value)} aria-label={t('Trier par')}>
                    <option value="nouveautes">{t('Nouveautés')}</option>
                    <option value="prix_asc">{t('Prix croissant')}</option>
                    <option value="prix_desc">{t('Prix décroissant')}</option>
                    <option value="nom">{t('Nom (A à Z)')}</option>
                  </select>
                </div>
                {categories.length > 1 && (
                  <div className="puces-piste" role="group" aria-label={t('Catégories')}>
                    {['', ...categories].map((c) => (
                      <button key={c || 'tout'} type="button" className={`puce${categorie === c ? ' puce-active' : ''}`} aria-pressed={categorie === c} onClick={() => setCategorie(c)}>
                        {c ? t(c) : t('Tout')}
                      </button>
                    ))}
                  </div>
                )}
                {visibles.length === 0
                  ? <p className="pf-vide">{t('Aucun produit ne correspond.')}</p>
                  : <div className="loo-fournisseurs-grille">{visibles.map((p) => <CarteProduit key={p.id} p={p} sansFournisseur />)}</div>}
              </>
            )}
          </section>

          {/* 4. Présentation de l'entreprise (la vitrine) */}
          {vitrineRemplie && (
            <section className="pf-section" aria-labelledby="titre-vitrine">
              <h2 id="titre-vitrine">{t("Présentation de l'entreprise")}</h2>
              <div className="pf-vitrine">
                <div className="pf-vitrine-texte">
                  {description && <p className="pf-description">{description}</p>}
                  {g.video_presentation_url && <video src={g.video_presentation_url} controls preload="metadata" className="pf-video" />}
                  {ficheType.length > 0 && (
                    <>
                      <h3>{estProducteur(type) ? t('Production') : t('Approvisionnement')}</h3>
                      <dl className="pf-fiche">{ficheType.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
                    </>
                  )}
                </div>
                {(fiche.length > 0 || horairesAffiches.length > 0) && (
                  <aside className="pf-vitrine-fiche">
                    {fiche.length > 0 && <dl className="pf-fiche">{fiche.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
                    {horairesAffiches.length > 0 && (
                      <div className="pf-horaires">
                        <h3>{t("Horaires d'ouverture")}</h3>
                        {horairesAffiches.map(([jour, plage]) => (
                          <div key={jour}><span>{t(jour)}</span><span>{plage || t('Fermé')}</span></div>
                        ))}
                      </div>
                    )}
                  </aside>
                )}
              </div>
              {faq.length > 0 && (
                <div className="pf-faq">
                  <h3>{t('Questions fréquentes')}</h3>
                  {faq.map((x) => (
                    <details key={x.q}><summary>{x.q}</summary><p>{x.r}</p></details>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 5. Photos vérifiées et documents */}
          {(photosTerrain.length > 0 || g.photos.length > 0 || documents.length > 0) && (
            <section className="pf-section" aria-labelledby="titre-photos">
              <h2 id="titre-photos">{t('Photos et documents')}</h2>
              {photosTerrain.length > 0 && (
                <>
                  <h3 className="pf-sous-titre"><ShieldCheck size={17} aria-hidden="true" /> {t('Vues par LOOHOO sur place')}</h3>
                  <div className="pf-photos">
                    {photosTerrain.map((p) => (
                      <figure key={p.id}>
                        <ImageOptimisee src={p.url} largeur={700} alt={t('Photo de {nom} prise par LOOHOO', { nom: g.nom })} />
                        <figcaption><BadgeCheck size={13} aria-hidden="true" /> {t('Photo vérifiée par LOOHOO le {date}', { date: dateLongue(p.prise_le) })}</figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
              {g.photos.length > 0 && (
                <>
                  <h3 className="pf-sous-titre"><Camera size={17} aria-hidden="true" /> {t('Ajoutées par le fournisseur')}</h3>
                  <div className="pf-photos">
                    {g.photos.map((url) => <figure key={url}><ImageOptimisee src={url} largeur={700} alt={t('Photo de {nom}', { nom: g.nom })} /></figure>)}
                  </div>
                </>
              )}
              {documents.length > 0 && (
                <>
                  <h3 className="pf-sous-titre"><ShieldCheck size={17} aria-hidden="true" /> {t("Documents de l'entreprise")}</h3>
                  <ul className="pf-documents">
                    {documents.filter((d) => DOCUMENTS_PUBLICS[d]).map((d) => <li key={d}><BadgeCheck size={15} aria-hidden="true" /> {t(DOCUMENTS_PUBLICS[d])}</li>)}
                  </ul>
                </>
              )}
            </section>
          )}

          {/* 6. Avis des acheteurs */}
          {avis?.nombre > 0 ? (
            <AvisFournisseur grossisteId={g.id} donnees={avis} />
          ) : avis && (
            <section className="pf-section" aria-labelledby="titre-avis">
              <h2 id="titre-avis">{t('Avis des acheteurs')}</h2>
              <p className="pf-vide">{t("Pas encore d'avis. Seuls les acheteurs qui ont conclu une affaire avec ce fournisseur sur LOOHOO peuvent en laisser un.")}</p>
            </section>
          )}

          {/* 7. Ligne de confiance */}
          <ul className="fp-confiance pf-confiance" aria-label={t('Pourquoi LOOHOO')}>
            <li><ShieldCheck size={17} aria-hidden="true" /> {t('Fournisseur contrôlé')}</li>
            <li><MessageCircle size={17} aria-hidden="true" /> {t('Devis en un message')}</li>
            <li><Tag size={17} aria-hidden="true" /> {t('Prix de gros affichés')}</li>
          </ul>
        </div>
      </section>

      <div className="barre-devis-espace" aria-hidden="true" />
      <div className="barre-devis-mobile">
        <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)}><MessageCircle size={17} aria-hidden="true" /> {t('Demander un devis à {nom}', { nom: g.nom })}</button>
      </div>
      {contactOuvert && <ModaleContact grossiste={g} produit={null} onClose={() => setContactOuvert(false)} />}
      <CaptureSortie recherche={g.nom} />
    </>
  );
}
