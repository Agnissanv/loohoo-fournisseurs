import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, Check, ChevronRight, Copy, Factory, FileCheck2, Flag, MapPin, MessageCircle, Package, ShieldCheck, Star, Tag } from 'lucide-react';
import {
  recupererProduitPublic, recupererAutresProduitsFournisseur, rechercherCatalogue, recupererCertificats, recupererResumeAvis,
} from '../api/fournisseurs.js';
import ModaleContact from '../components/ModaleContact.jsx';
import ModaleSignalement from '../components/ModaleSignalement.jsx';
import IndicateursConfiance from '../components/IndicateursConfiance.jsx';
import ImageOptimisee from '../components/ImageOptimisee.jsx';
import BoutonFavoriProduit from '../components/BoutonFavoriProduit.jsx';
import RangeeProduits from '../components/RangeeProduits.jsx';
import { PaliersProduit } from '../components/PaliersPrix.jsx';
import { IconeWhatsApp } from '../components/IconesReseaux.jsx';
import { estNouveau, fourchettePrix, prixCFA, quantite } from '../utils/prix.js';
import { infosPays } from '../utils/pays.js';
import { anciennete } from '../utils/profilFournisseur.js';
import { initiales } from '../utils/messagerie.js';
import { noterVisite } from '../utils/suiviVisites.js';
import { useTitre } from '../utils/useTitre.js';
import { useLangue } from '../i18n/Langue.jsx';

const nombre = (n) => Number(n).toLocaleString('fr-FR');
const poids = (kg) => (kg < 1 ? `${nombre(Math.round(kg * 1000))} g` : `${nombre(kg)} kg`);

// La date la plus récente où le fournisseur (ou l'équipe) a confirmé le prix et le stock
function dateVerification(p) {
  const dates = [p.stock_maj_le, p.stock_verifie_le, p.date_ajout].filter(Boolean).map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()));
  return dates.length ? new Date(Math.max(...dates)) : null;
}

export default function ProduitDetail() {
  const { id } = useParams();
  const { t, langue } = useLangue();
  const [produit, setProduit] = useState(undefined);
  const [panne, setPanne] = useState(false);
  const [essai, setEssai] = useState(0);
  const [photoActive, setPhotoActive] = useState(0);
  const [contactOuvert, setContactOuvert] = useState(false);
  const [signalementOuvert, setSignalementOuvert] = useState(false);
  const [memeFournisseur, setMemeFournisseur] = useState([]);
  const [similaires, setSimilaires] = useState([]);
  const [certificats, setCertificats] = useState([]);
  const [avis, setAvis] = useState(null);
  const [lienCopie, setLienCopie] = useState(false);

  useTitre(
    produit ? `${produit.nom} en gros` : null,
    produit ? `${produit.nom} : ${fourchettePrix(produit)}, minimum ${quantite(produit.moq || 1, produit.unite)}. Vendu par ${produit.grossiste?.nom}. Demandez un devis sur LOOHOO.` : null,
  );

  useEffect(() => {
    let annule = false;
    setProduit(undefined);
    setPanne(false);
    setPhotoActive(0);
    setMemeFournisseur([]);
    setSimilaires([]);
    setCertificats([]);
    setAvis(null);
    window.scrollTo({ top: 0 });
    recupererProduitPublic(id).then((p) => {
      if (annule) return;
      setProduit(p);
      if (!p) return;
      noterVisite({ grossisteId: p.grossiste.id, produitId: p.id });
      // Tout le reste se charge à côté : rien de tout ça ne bloque l'affichage de la fiche
      recupererCertificats(p.id).then((l) => { if (!annule) setCertificats(l); });
      recupererResumeAvis(p.grossiste.id).then((a) => { if (!annule) setAvis(a); });
      recupererAutresProduitsFournisseur(p.grossiste.id, p.id).then((l) => {
        if (!annule) setMemeFournisseur(l.map((x) => ({ ...x, grossiste_nom: p.grossiste.nom, badge_verifie: p.grossiste.badge_verifie })));
      });
      if (p.categorie) {
        rechercherCatalogue({ categorie: p.categorie, limite: 14 }).then(({ produits }) => {
          if (!annule) setSimilaires(produits.filter((x) => x.id !== p.id && x.grossiste_id !== p.grossiste.id).slice(0, 12));
        }).catch(() => {});
      }
    }).catch(() => { if (!annule) { setProduit(null); setPanne(true); } });
    return () => { annule = true; };
  }, [id, essai]);

  if (produit === undefined) {
    return (
      <section className="section fp-page" aria-busy="true">
        <div className="container">
          <div className="fp-grille">
            <div className="fp-medias"><div className="loo-squelette fp-squelette-photo" /></div>
            <div className="fp-panneau"><div className="loo-squelette" style={{ height: '340px', borderRadius: '16px' }} /></div>
          </div>
        </div>
      </section>
    );
  }
  if (!produit && panne) {
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
  if (!produit) {
    return (
      <section className="section">
        <div className="container">
          <h1 className="section-titre">{t('Produit introuvable.')}</h1>
          <p className="section-intro">{t("Il n'est plus disponible ou a été retiré par le fournisseur.")}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1.2rem' }}>{t('Voir les autres produits')}</Link>
        </div>
      </section>
    );
  }

  const g = produit.grossiste;
  const p = produit;
  const unite = p.unite || 'pièce';
  const locale = langue === 'en' ? 'en-GB' : 'fr-FR';
  const dateFr = (d) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const lien = typeof window !== 'undefined' ? `${window.location.origin}/produit/${p.id}` : '';
  const pays = infosPays(g.pays_code || 'CI');
  const verifieLe = dateVerification(p);
  const certifVerifie = certificats.some((c) => c.statut === 'verifie');
  const lienProfil = `/grossiste/${g.id}`;
  const depuis = anciennete(g.date_ajout);

  // Caractéristiques : seulement ce que le fournisseur a renseigné. La référence reste à part, les mots-clés ne s'affichent pas.
  const dimensions = [p.longueur_cm, p.largeur_cm, p.hauteur_cm].every((v) => v != null)
    ? `${nombre(p.longueur_cm)} × ${nombre(p.largeur_cm)} × ${nombre(p.hauteur_cm)} cm` : null;
  const origine = p.origine_produit
    ? `${p.origine_produit} · ${p.origine_produit === pays?.nom ? t('fabrication locale') : t('importé')}` : null;
  const delai = p.delai_preparation_jours == null ? null
    : Number(p.delai_preparation_jours) === 0 ? t('Prêt tout de suite')
      : t(Number(p.delai_preparation_jours) > 1 ? '{n} jours' : '{n} jour', { n: p.delai_preparation_jours });
  const conditionnement = p.pieces_par_carton
    ? `${t('{q} par carton', { q: quantite(p.pieces_par_carton, unite === 'carton' ? 'pièce' : unite) })}${p.poids_carton_kg ? ` · ${t('{p} le carton', { p: poids(Number(p.poids_carton_kg)) })}` : ''}` : null;
  const echantillon = p.echantillon_disponible
    ? (p.prix_echantillon == null ? t('Disponible') : Number(p.prix_echantillon) === 0 ? t('Disponible, gratuit') : t('Disponible : {prix}', { prix: prixCFA(p.prix_echantillon) }))
    : null;
  const specs = [
    p.usage && [t('Usage'), p.usage],
    origine && [t('Origine'), origine],
    delai && [t('Délai de préparation'), delai],
    [t('Minimum de commande'), quantite(p.moq || 1, p.unite)],
    p.prix_unitaire_fcfa != null && [t("Prix à l'unité"), prixCFA(p.prix_unitaire_fcfa)],
    p.stock_disponible != null && [t('Stock disponible'), quantite(p.stock_disponible, p.unite)],
    conditionnement && [t('Conditionnement'), conditionnement],
    p.poids_grammes != null && [t("Poids d'une unité"), poids(p.poids_grammes / 1000)],
    dimensions && [t("Dimensions d'une unité"), dimensions],
    p.matiere && [t('Matière'), p.matiere],
    p.marque && [t('Marque'), p.marque],
    p.modele && [t('Modèle'), p.modele],
    p.variantes && [t('Couleurs et tailles'), p.variantes],
    p.capacite_mensuelle && [t('Capacité de production'), t('{q} par mois', { q: quantite(p.capacite_mensuelle, p.unite) })],
    p.personnalisable && [t('Personnalisation'), t('Possible (logo, couleur, emballage)')],
    echantillon && [t('Échantillon'), echantillon],
    p.categorie && [t('Catégorie'), p.sous_categorie ? `${t(p.categorie)} › ${p.sous_categorie}` : t(p.categorie)],
  ].filter(Boolean);

  const messageWhatsApp = [
    t('Regarde ce produit sur LOOHOO :'),
    `*${p.nom}*`,
    t('{prix} par {unite}, minimum {q}', { prix: fourchettePrix(p), unite, q: quantite(p.moq || 1, p.unite) }),
    t('Vendu par {nom}{verifie}', { nom: g.nom, verifie: g.badge_verifie ? ` (${t('fournisseur vérifié')})` : '' }),
    lien,
  ].join('\n');

  async function copierLien() {
    try {
      await navigator.clipboard.writeText(lien);
      setLienCopie(true);
      setTimeout(() => setLienCopie(false), 2000);
    } catch { /* presse-papiers indisponible */ }
  }

  return (
    <section className="section fp-page fiche-avec-cta">
      <div className="container">
        <nav aria-label={t("Fil d'Ariane")} className="fp-fil">
          <Link to="/">{t('Accueil')}</Link>
          {p.categorie && <><ChevronRight size={14} aria-hidden="true" /><Link to={`/?categorie=${encodeURIComponent(p.categorie)}`}>{t(p.categorie)}</Link></>}
          <ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{p.nom}</span>
        </nav>

        <div className="fp-grille">
          <div className="fp-medias">
            <div className="fp-photo">
              {p.photos[photoActive] ? (
                <ImageOptimisee key={p.photos[photoActive]} src={p.photos[photoActive]} largeur={1000} prioritaire alt={p.nom} />
              ) : (
                <Package size={48} color="var(--loo-orange)" aria-hidden="true" />
              )}
              {estNouveau(p.date_ajout) && <span className="badge-nouveau">{t('Nouveau')}</span>}
            </div>
            {p.photos.length > 1 && (
              <div className="fp-miniatures">
                {p.photos.map((url, i) => (
                  <button key={url} type="button" onClick={() => setPhotoActive(i)} aria-label={t('Photo {n}', { n: i + 1 })} aria-pressed={i === photoActive}
                    className={`fp-miniature${i === photoActive ? ' fp-miniature-active' : ''}`}>
                    <ImageOptimisee src={url} largeur={200} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <aside className="fp-panneau" aria-label={t('Prix et commande')}>
            <h1 className="fp-titre">{p.nom}</h1>
            <p className="fp-vendu">
              {t('Vendu par')} <Link to={lienProfil}>{g.nom}</Link>
              {g.badge_verifie && <span className="fp-vendu-verifie"><BadgeCheck size={15} aria-hidden="true" /> {t('Vérifié')}</span>}
              {certificats.length > 0 && (
                <a href="#certificats" className={`fp-certif${certifVerifie ? ' fp-certif-verifie' : ''}`}>
                  {certifVerifie ? <ShieldCheck size={14} aria-hidden="true" /> : <FileCheck2 size={14} aria-hidden="true" />}
                  {certifVerifie ? t('Certificat vérifié par LOOHOO') : t('Document fourni par le fournisseur')}
                </a>
              )}
              <span className="fp-vendu-lieu"><MapPin size={13} aria-hidden="true" /> {g.commune ? `${g.commune}, ${g.ville}` : g.ville}</span>
            </p>

            <div className="fp-prix">
              <strong>{fourchettePrix(p)}</strong> <span>/ {t(unite)}</span>
            </div>
            <p className="fp-minimum">{t('Minimum de commande : {q}', { q: quantite(p.moq || 1, p.unite) })}</p>

            <PaliersProduit moq={p.moq} prix={p.prix_gros_fcfa} paliers={p.paliers} unite={p.unite} />

            <p className="fp-ferme">{t('Prix fermes selon la quantité. Seuls la livraison et les demandes particulières (emballage, personnalisation) se discutent avec le fournisseur.')}</p>
            {verifieLe && (
              <p className="fp-verifie-le"><Check size={14} aria-hidden="true" /> {t('Prix et stock vérifiés le {date}', { date: dateFr(verifieLe) })}</p>
            )}

            <div className="fp-actions">
              <button type="button" className="btn btn-primary fp-devis" onClick={() => setContactOuvert(true)}>
                <MessageCircle size={17} aria-hidden="true" /> {t('Demander un devis')}
              </button>
              <div className="fp-actions-secondaires">
                <a className="btn btn-outline fp-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(messageWhatsApp)}`} target="_blank" rel="noreferrer">
                  <IconeWhatsApp size={17} /> {t('Partager sur WhatsApp')}
                </a>
                <BoutonFavoriProduit produitId={p.id} />
                <button type="button" className="btn btn-outline fp-copier" onClick={copierLien} aria-label={t('Copier le lien')} title={t('Copier le lien')}>
                  {lienCopie ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </aside>

          <div className="fp-details">
            {p.description && (
              <div className="fp-bloc">
                <h2>{t('Description')}</h2>
                <p className="fp-description">{p.description}</p>
              </div>
            )}

            <div className="fp-bloc">
              <h2>{t('Caractéristiques')}</h2>
              <dl className="fp-specs">
                {specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
              </dl>
              {p.sku && <p className="fp-reference">{t('Référence : {ref}', { ref: p.sku })}</p>}
            </div>

            {certificats.length > 0 && (
              <div className="fp-bloc" id="certificats">
                <h2>{t('Certificats')}</h2>
                <ul className="fp-certifs">
                  {certificats.map((c) => (
                    <li key={c.id}>
                      {c.statut === 'verifie' ? <ShieldCheck size={20} color="var(--loo-vert)" aria-hidden="true" /> : <FileCheck2 size={20} color="var(--loo-orange)" aria-hidden="true" />}
                      <div>
                        <strong>{c.type_certificat}</strong>
                        <span>{t('Délivré par {organisme}', { organisme: c.organisme })}{c.date_expiration ? ` · ${t("valable jusqu'au {date}", { date: dateFr(c.date_expiration) })}` : ''}</span>
                        <em className={c.statut === 'verifie' ? 'fp-certif-etat-ok' : ''}>
                          {c.statut === 'verifie' ? t('Certificat vérifié par LOOHOO') : t('Document fourni par le fournisseur')}
                        </em>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {p.video_url && (
              <div className="fp-bloc">
                <h2>{t('Vidéo')}</h2>
                <video src={p.video_url} controls preload="metadata" className="fp-video" />
              </div>
            )}
          </div>
        </div>

        <section className="fp-fournisseur" aria-labelledby="titre-fournisseur">
          <div className="fp-fournisseur-tete">
            {g.logo_url
              ? <ImageOptimisee src={g.logo_url} largeur={160} alt="" className="fp-logo" />
              : <span className="fp-logo fp-logo-initiales" aria-hidden="true">{initiales(g.nom)}</span>}
            <div style={{ minWidth: 0 }}>
              <span className="fp-surtitre">{t('Le fournisseur')}</span>
              <h2 id="titre-fournisseur"><Link to={lienProfil}>{g.nom}</Link></h2>
              <div className="fp-fournisseur-badges">
                {g.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={12} /> {t('Vérifié')}</span>}
                {g.est_fabricant && <span className="badge badge-fabricant"><Factory size={12} /> {t('Fabricant local')}</span>}
              </div>
              <p className="fp-fournisseur-infos">
                <span><MapPin size={13} aria-hidden="true" /> {g.commune ? `${g.commune}, ` : ''}{g.ville}{pays ? ` · ${pays.nom}` : ''}</span>
                {depuis && <span>{t('Membre depuis {duree}', { duree: depuis })}</span>}
                {avis?.nombre > 0 && (
                  <span><Star size={13} fill="var(--loo-orange)" color="var(--loo-orange)" aria-hidden="true" /> {avis.moyenne.toLocaleString(locale)} ({t('{n} avis', { n: avis.nombre })})</span>
                )}
              </p>
            </div>
          </div>
          <IndicateursConfiance grossisteId={g.id} verifie={false} compact />
          <div className="fp-fournisseur-actions">
            <Link to={lienProfil} className="btn btn-outline">{t('Voir le profil et le catalogue')}</Link>
            <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)}><MessageCircle size={16} aria-hidden="true" /> {t('Demander un devis')}</button>
          </div>
        </section>

        <ul className="fp-confiance" aria-label={t('Pourquoi LOOHOO')}>
          <li><ShieldCheck size={17} aria-hidden="true" /> {t('Fournisseur contrôlé')}</li>
          <li><MessageCircle size={17} aria-hidden="true" /> {t('Devis en un message')}</li>
          <li><Tag size={17} aria-hidden="true" /> {t('Prix de gros affichés')}</li>
        </ul>

        <div className="fp-rangees">
          <RangeeProduits titre={t('Autres produits de {nom}', { nom: g.nom })} produits={memeFournisseur}
            action={<Link to={lienProfil} className="rangee-tout">{t('Tout voir')}</Link>} />
          <RangeeProduits titre={t('Produits similaires')} produits={similaires}
            action={p.categorie ? <Link to={`/?categorie=${encodeURIComponent(p.categorie)}`} className="rangee-tout">{t('Tout voir')}</Link> : null} />
        </div>

        <p style={{ textAlign: 'center', margin: '0.5rem 0 0' }}>
          <button type="button" className="fp-signaler" onClick={() => setSignalementOuvert(true)}>
            <Flag size={14} aria-hidden="true" /> {t('Signaler ce produit')}
          </button>
        </p>
      </div>

      {/* Sur téléphone, le bouton principal reste toujours sous le pouce */}
      <div className="fiche-cta-mobile">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="fp-cta-prix">{fourchettePrix(p)}</div>
          <div style={{ fontSize: '0.74rem', opacity: 0.65 }}>{t('Minimum')} : {quantite(p.moq || 1, p.unite)}</div>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setContactOuvert(true)}><MessageCircle size={16} aria-hidden="true" /> {t('Demander un devis')}</button>
      </div>

      {contactOuvert && (
        <ModaleContact grossiste={g} produit={{ id: p.id, nom: p.nom, unite: p.unite, moq: p.moq }} onClose={() => setContactOuvert(false)} />
      )}
      {signalementOuvert && <ModaleSignalement produit={p} onClose={() => setSignalementOuvert(false)} />}
    </section>
  );
}
