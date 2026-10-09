import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Search, ShieldCheck, Truck } from 'lucide-react';
import { rechercherProduits, recupererFiltres, capturerLead, suivreSession, signalerRechercheVide } from '../api/fournisseurs.js';
import CarteProduit from '../components/CarteProduit.jsx';
import HeroCarrousel from '../components/HeroCarrousel.jsx';
import { ChiffresPublics, FournisseursALaUne, VerifieExplication, RejoindreReseau } from '../components/AccueilPublic.jsx';
import CaptureSortie from '../components/CaptureSortie.jsx';
import IconeCategorie from '../components/IconeCategorie.jsx';
import { noterPageInterne } from '../utils/suiviVisites.js';
import { useTitre } from '../utils/useTitre.js';

const PAR_PAGE = 24;
const TRIS = [
  ['pertinence', 'Pertinence'],
  ['prix_asc', 'Prix croissant'],
  ['prix_desc', 'Prix décroissant'],
  ['moq_asc', 'Plus petite quantité minimale'],
];

export default function Annuaire() {
  // Tout est dans l'adresse (?q=pagne&categorie=…) : une recherche se partage par lien
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const categorie = params.get('categorie') || '';
  const ville = params.get('ville') || '';
  const commune = params.get('commune') || '';
  const tri = params.get('tri') || 'pertinence';
  const verifies = params.get('verifies') === '1';
  const prixMax = Number(params.get('prix_max')) || 0;
  const moqMax = Number(params.get('moq_max')) || 0;

  const [saisie, setSaisie] = useState(q);
  const [filtres, setFiltres] = useState({ categories: [], villes: [], communes: [] });
  const [resultats, setResultats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [affiches, setAffiches] = useState(PAR_PAGE);

  const rechercheActive = !!(q || categorie || ville || commune || prixMax || moqMax);
  useTitre(categorie ? `${categorie} en gros` : q ? `« ${q} » en gros` : null, categorie || q ? `Fournisseurs vérifiés et prix de gros : ${categorie || q}.` : null);

  const changer = (cles) => setParams((p) => {
    const suivant = new URLSearchParams(p);
    Object.entries(cles).forEach(([k, v]) => (v ? suivant.set(k, v) : suivant.delete(k)));
    return suivant;
  }, { replace: true });

  useEffect(() => { recupererFiltres().then(setFiltres).catch(() => {}); noterPageInterne(); }, []);

  // La saisie met à jour l'adresse après une courte pause (pas de requête à chaque lettre)
  useEffect(() => {
    if (saisie === q) return undefined;
    const t = setTimeout(() => changer({ q: saisie.trim() }), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisie]);
  useEffect(() => { setSaisie(q); }, [q]);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    setErreur(false);
    setAffiches(PAR_PAGE);
    rechercherProduits({ q, categorie, ville, commune })
      .then((liste) => {
        if (annule) return;
        setResultats(liste);
        setChargement(false);
        if (liste.length === 0 && (q || categorie || ville || commune)) {
          const cle = `loo-vide:${q}|${categorie}|${ville}|${commune}`;
          try { if (sessionStorage.getItem(cle)) return; sessionStorage.setItem(cle, '1'); } catch { /* navigation privée : on signale quand même */ }
          signalerRechercheVide({ q, categorie, ville: ville || commune });
        }
      })
      .catch(() => { if (!annule) { setErreur(true); setChargement(false); } });
    return () => { annule = true; };
  }, [q, categorie, ville, commune]);

  const liste = useMemo(() => {
    if (!resultats) return [];
    let l = verifies ? resultats.filter((p) => p.badge_verifie) : resultats;
    if (prixMax) l = l.filter((p) => p.prix_gros_fcfa <= prixMax);
    if (moqMax) l = l.filter((p) => (p.moq || 1) <= moqMax);
    if (tri === 'prix_asc') l = [...l].sort((a, b) => a.prix_gros_fcfa - b.prix_gros_fcfa);
    if (tri === 'prix_desc') l = [...l].sort((a, b) => b.prix_gros_fcfa - a.prix_gros_fcfa);
    if (tri === 'moq_asc') l = [...l].sort((a, b) => (a.moq || 1) - (b.moq || 1));
    return l;
  }, [resultats, verifies, tri, prixMax, moqMax]);

  const nb = liste.length;

  return (
    <>
      <HeroCarrousel>
        <div>
          <span className="badge" style={styles.badgeMali}>Bientôt au Mali</span>
          <h1 style={styles.titre}>Le seul endroit où trouver un fournisseur vérifié.</h1>
          <p style={styles.sousTitre}>Recherchez directement le produit que vous voulez acheter en gros.</p>

          <form style={styles.recherche} onSubmit={(e) => { e.preventDefault(); changer({ q: saisie.trim() }); }} role="search">
            <input
              className="champ" style={{ flex: '1 1 320px' }} type="search" value={saisie} aria-label="Rechercher un produit"
              onChange={(e) => setSaisie(e.target.value)}
              placeholder="Que cherchez-vous ? (pagne, sac…)"
            />
            {filtres.categories.length > 0 && (
              <select className="champ loo-recherche-sel" style={styles.select} value={categorie} onChange={(e) => changer({ categorie: e.target.value })} aria-label="Catégorie">
                <option value="">Toutes les catégories</option>
                {filtres.categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select className="champ loo-recherche-sel" style={styles.select} value={ville} onChange={(e) => changer({ ville: e.target.value, commune: '' })} aria-label="Ville">
              <option value="">Toutes les villes</option>
              {filtres.villes.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            {filtres.communes.length > 0 && (
              <select className="champ loo-recherche-sel" style={styles.select} value={commune} onChange={(e) => changer({ commune: e.target.value })} aria-label="Commune">
                <option value="">Toutes les communes</option>
                {filtres.communes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button type="submit" className="btn btn-clair" style={{ justifyContent: 'center' }}><Search size={17} /> Rechercher</button>
          </form>
        </div>
      </HeroCarrousel>

      {!rechercheActive && <ChiffresPublics />}

      {/* Ce qui rassure l'acheteur, en trois phrases */}
      <section style={{ background: 'var(--loo-blanc)', borderBottom: '1px solid var(--loo-papier-ombre)' }}>
        <div className="container acc-confiance" style={{ padding: '1.2rem 1.5rem' }}>
          <div><ShieldCheck size={20} /><span><strong>Fournisseurs contrôlés.</strong> Notre équipe vérifie chaque profil avant publication.</span></div>
          <div><MessageSquare size={20} /><span><strong>Devis en un message.</strong> Dites la quantité et la ville, le fournisseur vous répond.</span></div>
          <div><Truck size={20} /><span><strong>Prix de gros affichés.</strong> Avec la quantité minimale, avant même de contacter.</span></div>
        </div>
      </section>

      {/* Parcourir par catégorie (uniquement celles où il existe des fournisseurs) */}
      {filtres.categories.length > 0 && (
        <section className="section" style={{ paddingTop: '2.2rem', paddingBottom: '0.5rem' }}>
          <div className="container">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Parcourir par catégorie</h2>
            <div className="acc-categories">
              {filtres.categories.map((c) => (
                <button key={c} type="button" className={`acc-categorie${c === categorie ? ' acc-categorie-active' : ''}`} onClick={() => changer({ categorie: c === categorie ? '' : c })} aria-pressed={c === categorie}>
                  <span className="pastille-icone"><IconeCategorie nom={c} /></span>{c}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: '2rem' }}>
        <div className="container">
          {erreur && (
            <div className="carte" style={{ padding: '1.4rem', textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.8rem' }}>Impossible de charger les produits pour le moment.</p>
              <button type="button" className="btn btn-primary" onClick={() => changer({})}>Réessayer</button>
            </div>
          )}
          {!erreur && resultats === null && <SqueletteGrille />}
          {!erreur && resultats !== null && (
            <>
              <div className="acc-barre-outils">
                <p className="etiquette" style={{ margin: 0 }}>
                  {nb} produit{nb > 1 ? 's' : ''}
                  {categorie ? ` · ${categorie}` : ''}{q ? ` · « ${q} »` : ''}
                </p>
                <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                    <input type="checkbox" checked={verifies} onChange={(e) => changer({ verifies: e.target.checked ? '1' : '' })} /> Fournisseurs vérifiés seulement
                  </label>
                  <label className="acc-filtre-nombre">Prix max
                    <input className="champ" type="number" inputMode="numeric" min="0" step="500" placeholder="F CFA" value={prixMax || ''} onChange={(e) => changer({ prix_max: e.target.value })} />
                  </label>
                  <label className="acc-filtre-nombre">Quantité min. max
                    <input className="champ" type="number" inputMode="numeric" min="0" placeholder="unités" value={moqMax || ''} onChange={(e) => changer({ moq_max: e.target.value })} />
                  </label>
                  <select className="champ" style={{ width: 'auto', padding: '0.5em 0.8em', fontSize: '0.88rem' }} value={tri} onChange={(e) => changer({ tri: e.target.value === 'pertinence' ? '' : e.target.value })} aria-label="Trier par">
                    {TRIS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                  {rechercheActive && (
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.9em', fontSize: '0.82rem' }} onClick={() => setParams({}, { replace: true })}>Effacer la recherche</button>
                  )}
                </div>
              </div>

              {nb === 0 ? (
                <AucunResultat recherche={q || categorie} catalogueVide={!rechercheActive && !verifies} />
              ) : (
                <>
                  <div className="loo-fournisseurs-grille" style={{ opacity: chargement ? 0.55 : 1 }}>
                    {liste.slice(0, affiches).map((p) => <CarteProduit key={p.id} p={p} />)}
                  </div>
                  {nb > affiches && (
                    <div style={{ textAlign: 'center', marginTop: '1.6rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setAffiches((n) => n + PAR_PAGE)}>
                        Voir plus de produits ({nb - affiches} restants)
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      {!rechercheActive && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Comment ça marche</h2>
            <div className="acc-etapes">
              {[
                ['1', 'Cherchez un produit', 'Tapez ce que vous voulez acheter en gros, filtrez par catégorie ou par ville.'],
                ['2', 'Comparez et demandez un devis', 'Badge, avis, ancienneté, prix de gros et quantité minimale sont affichés. Indiquez la quantité, la ville de livraison et le délai.'],
                ['3', 'Discutez directement', 'Échangez dans la messagerie LOOHOO, comparez les offres, puis concluez avec le fournisseur de votre choix.'],
              ].map(([n, titre, texte]) => (
                <div key={n} className="carte" style={{ padding: '1.2rem' }}>
                  <span className="etiquette">Étape {n}</span>
                  <h3 style={{ fontSize: '1.05rem', margin: '0.4rem 0' }}>{titre}</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8, lineHeight: 1.55 }}>{texte}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!rechercheActive && (
        <>
          <FournisseursALaUne />
          <VerifieExplication />
          <RejoindreReseau />
        </>
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

const styles = {
  badgeMali: { background: 'rgba(255,248,239,0.2)', color: 'var(--loo-papier)' },
  titre: { fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', lineHeight: 1.05, fontWeight: 600, letterSpacing: '-0.025em', margin: '1rem 0 0.8rem', color: '#fff', maxWidth: '18ch' },
  sousTitre: { maxWidth: '520px', opacity: 0.92, margin: '0 0 1.8rem', fontSize: '1.05rem' },
  recherche: { display: 'flex', gap: '0.7rem', flexWrap: 'wrap' },
  select: { flex: '0 1 180px', minWidth: 0 },
};
