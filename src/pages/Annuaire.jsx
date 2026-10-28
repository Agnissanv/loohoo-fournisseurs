import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import {
  rechercherCatalogue, recupererCategoriesCatalogue, recupererOrigines, recupererPromotionsEnCours, recupererTendances,
  capturerLead, suivreSession, signalerRechercheVide,
} from '../api/fournisseurs.js';
import CartePromotion from '../components/CartePromotion.jsx';
import CarteProduit from '../components/CarteProduit.jsx';
import RangeeProduits from '../components/RangeeProduits.jsx';
import PanneauFiltres from '../components/PanneauFiltres.jsx';
import { FournisseursALaUne, VerifieExplication, ChiffresEtArguments, RejoindreReseau } from '../components/AccueilPublic.jsx';
import CaptureSortie from '../components/CaptureSortie.jsx';
import IconeCategorie from '../components/IconeCategorie.jsx';
import { noterPageInterne } from '../utils/suiviVisites.js';
import { usePays } from '../utils/usePays.js';
import { drapeau, infosPays } from '../utils/pays.js';
import { prixCFA } from '../utils/prix.js';
import { useLangue } from '../i18n/Langue.jsx';
import { useTitre } from '../utils/useTitre.js';

const PAR_PAGE = 24;
const TRIS = [
  ['pertinence', 'Pertinence'],
  ['nouveautes', 'Nouveautés'],
  ['prix_asc', 'Prix croissant'],
  ['prix_desc', 'Prix décroissant'],
  ['moq_asc', 'Plus petit minimum'],
];

// Accueil public « le produit d'abord » (retours du client, 13 oct.) : accroche compacte, catégories, produits tout de suite,
// puis fournisseurs à la une, comment ça marche, « vérifié », chiffres. Tous les filtres passent par le bouton « Filtres ».
export default function Annuaire() {
  const { t } = useLangue();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const categorie = params.get('categorie') || '';
  const pays = params.get('pays') || '';
  const ville = params.get('ville') || '';
  const commune = params.get('commune') || '';
  const tri = params.get('tri') || (q ? 'pertinence' : 'nouveautes');
  const verifies = params.get('verifies') === '1';
  const prixMax = Number(params.get('prix_max')) || 0;
  const qteMax = Number(params.get('moq_max')) || 0;
  const origine = params.get('origine') || '';
  const rechercheActive = !!(q || categorie || pays || ville || commune || prixMax || qteMax || verifies || origine);

  const { parCode } = usePays();
  const [categories, setCategories] = useState([]);
  const [origines, setOrigines] = useState([]);
  const [rangees, setRangees] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [tendances, setTendances] = useState([]);
  const [resultats, setResultats] = useState(null); // { produits, total }
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  useTitre(
    categorie ? t('{nom} en gros', { nom: t(categorie) }) : q ? t('{nom} en gros', { nom: `« ${q} »` }) : null,
    categorie || q ? t('Fournisseurs vérifiés et prix de gros : {q}.', { q: categorie ? t(categorie) : q }) : null,
  );

  const changer = (cles) => setParams((p) => {
    const suivant = new URLSearchParams(p);
    Object.entries(cles).forEach(([k, v]) => (v ? suivant.set(k, v) : suivant.delete(k)));
    return suivant;
  }, { replace: true });

  useEffect(() => {
    recupererCategoriesCatalogue().then(setCategories);
    recupererOrigines().then(setOrigines);
    recupererPromotionsEnCours(16).then(setPromotions);
    recupererTendances(12).then(setTendances);
    noterPageInterne();
  }, []);

  // Le bouton « Filtres » de l'en-tête arrive ici avec ?filtres=1 : on ouvre le panneau
  useEffect(() => {
    if (params.get('filtres') === '1') { setFiltresOuverts(true); changer({ filtres: '' }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Rangées de l'accueil : les nouveautés, puis une rangée par catégorie bien fournie
  useEffect(() => {
    if (rechercheActive) return;
    rechercherCatalogue({ tri: 'nouveautes', limite: 48 }).then(({ produits }) => {
      const parCategorie = {};
      produits.forEach((p) => { if (p.categorie) (parCategorie[p.categorie] ||= []).push(p); });
      const lignes = [{ titre: t('Nouveautés'), produits: produits.slice(0, 12) }];
      Object.entries(parCategorie).filter(([c, l]) => l.length >= 3 && c !== 'Autre').slice(0, 3)
        .forEach(([c, l]) => lignes.push({ titre: t(c), categorie: c, produits: l.slice(0, 12) }));
      setRangees(produits.length >= 4 ? lignes : []);
    }).catch(() => setRangees([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rechercheActive]);

  // La grille complète (ou les résultats d'une recherche)
  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur(false);
    rechercherCatalogue({ q, categorie, pays, ville, commune, prixMax, qteMax, verifies, origine, tri, limite: PAR_PAGE })
      .then((r) => {
        if (annule) return;
        setResultats(r);
        setChargement(false);
        if (r.total === 0 && (q || categorie || ville || commune)) {
          const cle = `loo-vide:${q}|${categorie}|${ville}|${commune}`;
          try { if (sessionStorage.getItem(cle)) return; sessionStorage.setItem(cle, '1'); } catch { /* navigation privée */ }
          signalerRechercheVide({ q, categorie, ville: ville || commune });
        }
      })
      .catch(() => { if (!annule) { setErreur(true); setChargement(false); } });
    return () => { annule = true; };
  }, [q, categorie, pays, ville, commune, prixMax, qteMax, verifies, origine, tri]);

  async function voirPlus() {
    const suite = await rechercherCatalogue({ q, categorie, pays, ville, commune, prixMax, qteMax, verifies, origine, tri, limite: PAR_PAGE, decalage: resultats.produits.length });
    setResultats((r) => ({ total: suite.total || r.total, produits: [...r.produits, ...suite.produits] }));
  }

  const valeursFiltres = { pays, ville, commune, categorie, prixMax, qteMax, verifies, origine };
  // Les filtres actifs, en petites étiquettes qu'on retire d'un clic
  const pastilles = useMemo(() => [
    q && { cle: 'q', texte: `« ${q} »` },
    categorie && { cle: 'categorie', texte: t(categorie) },
    pays && { cle: 'pays', texte: `${drapeau(pays)} ${parCode[pays]?.nom || pays}`, aussi: { ville: '', commune: '' } },
    ville && { cle: 'ville', texte: ville, aussi: { commune: '' } },
    commune && { cle: 'commune', texte: commune },
    prixMax && { cle: 'prix_max', texte: `≤ ${prixCFA(prixMax)}` },
    qteMax && { cle: 'moq_max', texte: t('Minimum ≤ {n}', { n: qteMax }) },
    verifies && { cle: 'verifies', texte: t('Vérifiés') },
    origine && { cle: 'origine', texte: t('Origine : {pays}', { pays: `${drapeau(origine)} ${infosPays(origine)?.nom || origine}` }) },
  ].filter(Boolean), [q, categorie, pays, ville, commune, prixMax, qteMax, verifies, origine, parCode, t]);

  const produits = resultats?.produits || [];
  const total = resultats?.total || 0;

  return (
    <>
      {!rechercheActive && (
        <section className="accroche">
          <div className="container">
            <span className="accroche-badge">🌍 {t('Construisons ensemble le plus grand réseau de fournisseurs fiables en Afrique')}</span>
            <h1>{t('Trouvez un fournisseur vérifié. Simple, rapide, gratuit.')}</h1>
            <p className="accroche-confiance">{t('Fournisseurs vérifiés')} · {t('Prix de gros affichés')}</p>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <nav className="puces-categories" aria-label={t('Catégories')}>
          <div className="container puces-piste">
            <button type="button" className={`puce${!categorie ? ' puce-active' : ''}`} onClick={() => changer({ categorie: '' })} aria-pressed={!categorie}>{t('Tout')}</button>
            {categories.map((c) => (
              <button key={c.categorie} type="button" className={`puce${c.categorie === categorie ? ' puce-active' : ''}`}
                onClick={() => changer({ categorie: c.categorie === categorie ? '' : c.categorie })} aria-pressed={c.categorie === categorie}>
                <IconeCategorie nom={c.categorie} size={16} /> {t(c.categorie)}
              </button>
            ))}
          </div>
        </nav>
      )}

      {!rechercheActive && (rangees?.length > 0 || promotions.length > 0) && (
        <div className="container" style={{ paddingTop: '1.2rem' }}>
          {promotions.length > 0 && (
            <section className="rangee" aria-label={t('Promotions en cours')}>
              <div className="rangee-tete"><h2>{t('Promotions en cours')}</h2></div>
              <div className="rangee-piste">
                {promotions.map((pr) => <div key={pr.id} className="rangee-element"><CartePromotion promo={pr} /></div>)}
              </div>
            </section>
          )}
          {tendances.length >= 4 && <RangeeProduits titre={t('Tendances de la semaine')} produits={tendances} />}
          {(rangees || []).map((r) => (
            <RangeeProduits key={r.titre} titre={r.titre} produits={r.produits}
              action={r.categorie ? <button type="button" className="rangee-tout" onClick={() => changer({ categorie: r.categorie })}>{t('Tout voir')}</button> : null} />
          ))}
        </div>
      )}

      <section className="section resultats" style={{ paddingTop: '1.4rem' }}>
        <div className={`container${rechercheActive ? ' resultats-avec-colonne' : ''}`}>
          {rechercheActive && (
            <aside className="colonne-filtres" aria-label={t('Filtres')}>
              <h2>{t('Filtres')}</h2>
              <PanneauFiltres valeurs={valeursFiltres} changer={changer} categories={categories} origines={origines} />
            </aside>
          )}

          <div style={{ minWidth: 0 }}>
            <div className="acc-barre-outils">
              <h2 className="accueil-titre" style={{ margin: 0 }}>
                {rechercheActive ? t('{n} produits', { n: total }) : t('Tous les produits')}
              </h2>
              <select className="champ tri" value={tri} onChange={(e) => changer({ tri: e.target.value })} aria-label={t('Trier par')}>
                {TRIS.map(([v, libelle]) => <option key={v} value={v}>{t(libelle)}</option>)}
              </select>
            </div>

            {pastilles.length > 0 && (
              <div className="pastilles-filtres">
                {pastilles.map((f) => (
                  <button key={f.cle} type="button" className="pastille-filtre" onClick={() => changer({ [f.cle]: '', ...(f.aussi || {}) })} aria-label={t('Retirer le filtre {f}', { f: f.texte })}>
                    {f.texte} <X size={13} aria-hidden="true" />
                  </button>
                ))}
                <button type="button" className="pastille-effacer" onClick={() => setParams({}, { replace: true })}>{t('Tout effacer')}</button>
              </div>
            )}

            {erreur && (
              <div className="carte" style={{ padding: '1.4rem', textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.8rem' }}>{t('Impossible de charger les produits pour le moment.')}</p>
                <button type="button" className="btn btn-primary" onClick={() => changer({})}>{t('Réessayer')}</button>
              </div>
            )}
            {!erreur && resultats === null && <SqueletteGrille />}
            {!erreur && resultats !== null && (
              total === 0 ? (
                <AucunResultat recherche={q || categorie} catalogueVide={!rechercheActive} />
              ) : (
                <>
                  <div className="loo-fournisseurs-grille" style={{ opacity: chargement ? 0.55 : 1 }}>
                    {produits.map((p) => <CarteProduit key={p.id} p={p} />)}
                  </div>
                  {total > produits.length && (
                    <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
                      <button type="button" className="btn btn-outline" onClick={voirPlus}>{t('Voir plus de produits ({n} restants)', { n: total - produits.length })}</button>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </section>

      {!rechercheActive && (
        <>
          <FournisseursALaUne />
          <section className="section" style={{ paddingTop: '1rem' }}>
            <div className="container">
              <h2 className="accueil-titre">{t('Comment ça marche')}</h2>
              <div className="acc-etapes">
                {[
                  ['1', 'Cherchez un produit', 'Tapez ce que vous voulez acheter en gros, ou choisissez une catégorie.'],
                  ['2', 'Comparez et demandez un devis', 'Badge, avis, ancienneté, prix de gros et quantité minimale sont affichés. Indiquez la quantité, la ville de livraison et le délai.'],
                  ['3', 'Discutez dans la messagerie', 'Échangez dans la messagerie LOOHOO, comparez les offres, puis concluez avec le fournisseur de votre choix.'],
                ].map(([n, titre, texte]) => (
                  <div key={n} className="carte" style={{ padding: '1.2rem' }}>
                    <span className="etiquette">{t('Étape {n}', { n })}</span>
                    <h3 style={{ fontSize: '1.05rem', margin: '0.4rem 0' }}>{t(titre)}</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.55 }}>{t(texte)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <VerifieExplication />
          <ChiffresEtArguments />
          <RejoindreReseau />
        </>
      )}

      {filtresOuverts && (
        <div className="modale-fond" onClick={() => setFiltresOuverts(false)}>
          <div className="modale modale-filtres" role="dialog" aria-modal="true" aria-label={t('Filtres')} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modale-fermer" onClick={() => setFiltresOuverts(false)} aria-label={t('Fermer')}><X size={20} /></button>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{t('Filtres')}</h2>
            <PanneauFiltres valeurs={valeursFiltres} changer={changer} categories={categories} origines={origines} />
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.2rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setParams(q ? { q } : {}, { replace: true })}>{t('Effacer')}</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setFiltresOuverts(false)}>
                {chargement ? t('Voir les produits') : t('Voir les {n} produits', { n: total })}
              </button>
            </div>
          </div>
        </div>
      )}
      <CaptureSortie recherche={q} />
    </>
  );
}

// Aucun produit : on garde la demande plutôt que de perdre l'acheteur
function AucunResultat({ recherche, catalogueVide }) {
  const [email, setEmail] = useState('');
  const [besoin, setBesoin] = useState(recherche || '');
  const [connecte, setConnecte] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession((s) => setConnecte(!!s)), []);

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await capturerLead(email.trim(), besoin.trim());
      setEnvoye(true);
    } catch {
      setErreur("Impossible d'enregistrer votre demande pour le moment. Réessayez dans un instant.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="carte" style={{ padding: '1.6rem', maxWidth: '560px' }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>
        {catalogueVide ? 'Les premiers fournisseurs arrivent bientôt' : "Aucun produit ne correspond pour l'instant"}
      </h2>
      <p style={{ margin: '0 0 1rem', opacity: 0.8, lineHeight: 1.55 }}>
        {catalogueVide
          ? "Le catalogue est en cours de constitution. Dites-nous ce que vous cherchez : nous vous prévenons dès qu'un fournisseur le propose."
          : "Essayez un mot plus simple ou une autre catégorie. Sinon, dites-nous ce que vous cherchez : nous vous prévenons dès qu'un fournisseur le propose."}
      </p>
      {envoye ? (
        <p role="status" style={{ color: '#1f7a3d', fontWeight: 700, margin: 0 }}>Merci, c'est noté. Nous vous écrirons dès qu'un fournisseur correspond.</p>
      ) : (
        <form onSubmit={soumettre} style={{ display: 'grid', gap: '0.7rem' }}>
          <input className="champ" required placeholder="Ce que vous cherchez (ex. pagnes wax en gros)" value={besoin} onChange={(e) => setBesoin(e.target.value)} />
          <input className="champ" required type="email" placeholder="Votre e-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{erreur}</p>}
          <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>{envoi ? 'Envoi…' : 'Me prévenir'}</button>
          {!connecte && <p style={{ margin: 0, fontSize: '0.76rem', opacity: 0.65 }}>Votre e-mail sert uniquement à vous répondre, voir la politique de confidentialité.</p>}
        </form>
      )}
    </div>
  );
}

function SqueletteGrille() {
  return (
    <div className="loo-fournisseurs-grille">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="carte" style={{ padding: '0.9rem' }}>
          <div className="loo-squelette" style={{ aspectRatio: '4 / 3', marginBottom: '0.7rem' }} />
          <div className="loo-squelette" style={{ width: '80%', height: '13px', marginBottom: '0.5rem' }} />
          <div className="loo-squelette" style={{ width: '45%', height: '13px' }} />
        </div>
      ))}
    </div>
  );
}

