import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Download, Eye, MessageSquare, Package, Reply } from 'lucide-react';
import {
  suivreSession, recupererMesStats, recupererMesConversations, recupererStatsVisites,
} from '../api/fournisseurs.js';
import { calculerStats, exporterCsv, formaterDuree } from '../utils/statsDemandes.js';

const PERIODES = [[7, '7 derniers jours'], [30, '30 derniers jours'], [90, '90 derniers jours']];
const SOURCES = {
  recherche_loohoo: 'Recherche LOOHOO',
  lien_direct: 'Lien direct',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  google: 'Google',
  autre: 'Autres',
};
const COULEURS_REPARTITION = [
  ['nouvelle', 'Nouvelles', 'var(--loo-rouge)'],
  ['en_cours', 'En attente de réponse', 'var(--loo-orange)'],
  ['repondue', 'Répondues', '#2f8f4e'],
];

export default function Statistiques() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [jours, setJours] = useState(30);
  const [conversations, setConversations] = useState(undefined);
  const [statsGlobales, setStatsGlobales] = useState(null);
  const [visites, setVisites] = useState(undefined); // undefined = chargement, null = migration 0003 absente
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMesConversations().then(setConversations).catch((err) => setErreur(err.message));
    recupererMesStats().then(setStatsGlobales).catch(() => {});
  }, [session, navigate]);

  useEffect(() => {
    if (!session) return;
    setVisites(undefined);
    recupererStatsVisites(jours).then(setVisites);
  }, [session, jours]);

  const stats = useMemo(() => (conversations ? calculerStats(conversations, jours) : null), [conversations, jours]);

  if (erreur) return <p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>;
  if (session === undefined || !stats) return <div className="loo-squelette" style={{ height: '300px' }} />;

  const vuesPeriode = visites ? visites.total : null;
  const totalRepartition = stats.repartition.nouvelle + stats.repartition.en_cours + stats.repartition.repondue;
  const totalSources = visites ? visites.par_source.reduce((n, s) => n + s.nb, 0) : 0;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <h1 className="esp-titre-page" style={{ margin: 0 }}>Statistiques</h1>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <select className="champ" style={{ width: 'auto', padding: '0.6em 0.9em' }} value={jours} onChange={(e) => setJours(Number(e.target.value))} aria-label="Période">
            {PERIODES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={() => exporterCsv(stats.analyses)} disabled={stats.analyses.length === 0}>
            <Download size={16} /> Exporter
          </button>
        </div>
      </div>

      <div className="esp-kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <Indicateur icone={MessageSquare} titre="Demandes reçues" valeur={stats.nbDemandes}
          detail={stats.variation == null ? 'Pas de période de comparaison' : `${stats.variation >= 0 ? '+' : ''}${stats.variation} % vs période précédente`} bon={stats.variation == null ? null : stats.variation >= 0} />
        <Indicateur icone={Reply} titre="Taux de réponse" valeur={stats.tauxReponse == null ? '–' : `${stats.tauxReponse} %`}
          detail="Demandes auxquelles vous avez répondu" />
        <Indicateur icone={Clock} titre="Délai de réponse" valeur={formaterDuree(stats.delaiMedianMs)} detail="Médiane, première réponse" />
        <Indicateur icone={Eye} titre="Vues du profil" valeur={vuesPeriode ?? (statsGlobales ? statsGlobales.vues_profil : '–')}
          detail={vuesPeriode != null ? 'Sur la période' : 'Total depuis le début'} />
        <Indicateur icone={Package} titre="Produits actifs" valeur={statsGlobales ? statsGlobales.produits_actifs : '–'} detail="Publiés et visibles" />
      </div>

      <div className="esp-grille" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', marginTop: '1rem' }}>
        <div className="esp-carte" style={{ gridColumn: 'span 1' }}>
          <h2 className="esp-carte-titre">Évolution des demandes</h2>
          <Courbe donnees={stats.evolution} />
        </div>

        <div className="esp-carte">
          <h2 className="esp-carte-titre">Répartition des demandes</h2>
          {totalRepartition === 0 ? <p className="esp-aide">Aucune demande sur cette période.</p> : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.4rem', flexWrap: 'wrap' }}>
              <Anneau total={totalRepartition} parts={COULEURS_REPARTITION.map(([cle, , couleur]) => ({ valeur: stats.repartition[cle], couleur }))} />
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                {COULEURS_REPARTITION.map(([cle, libelle, couleur]) => (
                  <span key={cle} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i style={{ width: 11, height: 11, borderRadius: '50%', background: couleur, display: 'inline-block' }} />
                    {libelle} : <strong>{stats.repartition[cle]}</strong> ({Math.round((stats.repartition[cle] / totalRepartition) * 100)} %)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="esp-grille" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', marginTop: '1rem' }}>
        <div className="esp-carte">
          <h2 className="esp-carte-titre">Produits les plus demandés</h2>
          {stats.topProduits.length === 0 ? <p className="esp-aide">Pas encore assez de données.</p> : (
            <Barres lignes={stats.topProduits.map((p) => ({ nom: p.nom, nb: p.nb }))} />
          )}
        </div>

        <div className="esp-carte">
          <h2 className="esp-carte-titre">Produits les plus vus</h2>
          {visites === undefined && <div className="loo-squelette" style={{ height: 90 }} />}
          {visites === null && <p className="esp-aide">Disponible après l'activation du suivi des visites.</p>}
          {visites && (visites.top_produits.length === 0
            ? <p className="esp-aide">Aucune consultation de produit sur cette période.</p>
            : <Barres lignes={visites.top_produits.map((p) => ({ nom: p.nom, nb: p.nb }))} />)}
        </div>

        <div className="esp-carte">
          <h2 className="esp-carte-titre">Origine des visites</h2>
          {visites === undefined && <div className="loo-squelette" style={{ height: 90 }} />}
          {visites === null && <p className="esp-aide">Disponible après l'activation du suivi des visites.</p>}
          {visites && (totalSources === 0
            ? <p className="esp-aide">Aucune visite enregistrée sur cette période.</p>
            : <Barres lignes={visites.par_source.map((s) => ({ nom: SOURCES[s.source] || 'Autres', nb: s.nb, pourcent: Math.round((s.nb / totalSources) * 100) }))} />)}
        </div>
      </div>

      <p className="esp-aide" style={{ marginTop: '1.2rem', maxWidth: '70ch' }}>
        Ces chiffres sont calculés à partir de vos vraies conversations et des visites de votre page. Le délai de réponse est la médiane
        entre le premier message d'un acheteur et votre première réponse. Un acheteur qui reçoit une réponse rapide est plus susceptible de commander.
      </p>
    </>
  );
}

function Indicateur({ icone: Icone, titre, valeur, detail, bon }) {
  return (
    <div className="esp-carte" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.5rem' }}>
        <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#FFF1E0', color: 'var(--loo-rouge)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icone size={18} /></span>
        <span style={{ fontSize: '0.84rem', opacity: 0.75 }}>{titre}</span>
      </div>
      <div style={{ fontFamily: 'var(--police-affiche)', fontWeight: 800, fontSize: '1.7rem', lineHeight: 1.1 }}>{valeur}</div>
      <div style={{ fontSize: '0.76rem', marginTop: '0.3rem', opacity: 0.8, color: bon === true ? '#1f7a3d' : bon === false ? 'var(--loo-rouge)' : 'inherit' }}>{detail}</div>
    </div>
  );
}

// Courbe SVG avec zone remplie. Les étiquettes de dates sont espacées pour rester lisibles.
function Courbe({ donnees }) {
  const L = 640; const H = 190; const marge = { g: 28, d: 8, h: 10, b: 24 };
  const max = Math.max(1, ...donnees.map((d) => d.nb));
  const pas = (L - marge.g - marge.d) / Math.max(1, donnees.length - 1);
  const x = (i) => marge.g + i * pas;
  const y = (v) => marge.h + (H - marge.h - marge.b) * (1 - v / max);
  const points = donnees.map((d, i) => `${x(i)},${y(d.nb)}`).join(' ');
  const aire = `${marge.g},${H - marge.b} ${points} ${x(donnees.length - 1)},${H - marge.b}`;
  const total = donnees.reduce((n, d) => n + d.nb, 0);
  const etiquette = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const indicesDates = [0, Math.floor((donnees.length - 1) / 2), donnees.length - 1];
  if (total === 0) return <p className="esp-aide">Aucune demande sur cette période.</p>;
  return (
    <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label="Évolution du nombre de demandes par jour" style={{ width: '100%', height: 'auto' }}>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={marge.g} x2={L - marge.d} y1={y(max * t)} y2={y(max * t)} stroke="var(--loo-papier-ombre)" strokeDasharray="3 4" />
          <text x={marge.g - 6} y={y(max * t) + 4} textAnchor="end" fontSize="11" fill="currentColor" opacity="0.6">{Math.round(max * t)}</text>
        </g>
      ))}
      <polygon points={aire} fill="var(--loo-orange)" opacity="0.15" />
      <polyline points={points} fill="none" stroke="var(--loo-orange)" strokeWidth="2.5" strokeLinejoin="round" />
      {donnees.map((d, i) => d.nb > 0 && (
        <circle key={d.jour} cx={x(i)} cy={y(d.nb)} r="3.5" fill="var(--loo-rouge)"><title>{`${etiquette(d.jour)} : ${d.nb}`}</title></circle>
      ))}
      {indicesDates.map((i, k) => (
        <text key={k} x={x(i)} y={H - 6} textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'} fontSize="11" fill="currentColor" opacity="0.6">{etiquette(donnees[i].jour)}</text>
      ))}
    </svg>
  );
}

function Anneau({ parts, total }) {
  const R = 52; const C = 2 * Math.PI * R;
  let cumul = 0;
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Répartition des demandes par statut">
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--loo-papier-ombre)" strokeWidth="18" />
      {parts.map((p, i) => {
        const longueur = (p.valeur / total) * C;
        const decalage = -cumul;
        cumul += longueur;
        return p.valeur > 0 && (
          <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={p.couleur} strokeWidth="18"
            strokeDasharray={`${longueur} ${C - longueur}`} strokeDashoffset={decalage} transform="rotate(-90 70 70)" />
        );
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">{total}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.65">Total</text>
    </svg>
  );
}

function Barres({ lignes }) {
  const max = Math.max(1, ...lignes.map((l) => l.nb));
  return (
    <div style={{ display: 'grid', gap: '0.7rem' }}>
      {lignes.map((l) => (
        <div key={l.nom}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', fontSize: '0.86rem', marginBottom: '0.25rem' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nom}</span>
            <strong style={{ whiteSpace: 'nowrap' }}>{l.nb}{l.pourcent != null ? ` (${l.pourcent} %)` : ''}</strong>
          </div>
          <div style={{ background: 'var(--loo-papier-ombre)', borderRadius: 999, height: 8 }}>
            <div style={{ width: `${(l.nb / max) * 100}%`, background: 'var(--gradient-marque)', height: '100%', borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
