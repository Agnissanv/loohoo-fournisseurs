import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Calculator, Heart, MessageCircle, Rocket } from 'lucide-react';
import {
  suivreSession, recupererMonRole, recupererSessionVendeur, recupererMesConversations, recupererMesVentes, recupererMesFavoris, capturerLead,
} from '../api/fournisseurs.js';
import { anciennete } from '../utils/profilFournisseur.js';
import { infosPays } from '../utils/pays.js';
import { useTitre } from '../utils/useTitre.js';

const f = (n) => Math.round(n).toLocaleString('fr-FR');

const ilYa = (iso) => {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

// Espace de l'acheteur : son activité sur LOOHOO, ses fournisseurs suivis, ses messages et ses outils.
export default function EspaceAcheteur() {
  useTitre('Mon espace acheteur');
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [vendeur, setVendeur] = useState(undefined);
  const [conversations, setConversations] = useState([]);
  const [achats, setAchats] = useState([]);
  const [favoris, setFavoris] = useState([]);
  const [erreur, setErreur] = useState('');
  const [prevenu, setPrevenu] = useState(false);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion', { state: { retour: '/mon-espace' } }); return; }
    recupererMonRole().then((r) => {
      if (r.role === 'fournisseur') { navigate('/tableau-de-bord', { replace: true }); return; }
      recupererSessionVendeur().then((s) => setVendeur(s?.vendeur || null)).catch((err) => setErreur(err.message));
      recupererMesConversations().then(setConversations).catch(() => {});
      recupererMesVentes().then(setAchats);
      recupererMesFavoris().then(setFavoris);
    }).catch((err) => setErreur(err.message));
  }, [session, navigate]);

  if (erreur) return <section className="section"><div className="container"><p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p></div></section>;
  if (session === undefined || vendeur === undefined) return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '260px' }} /></div></section>;
  if (!vendeur) return <section className="section"><div className="container"><p>Aucun compte acheteur associé à cette connexion. <Link to="/inscription/acheteur" style={{ color: 'var(--loo-rouge)', fontWeight: 700 }}>Créer un compte acheteur</Link></p></div></section>;

  const contactes = new Set(conversations.map((c) => c.grossiste?.id).filter(Boolean)).size;
  const montantAchats = achats.reduce((n, a) => n + Number(a.montant_fcfa || 0), 0);
  const nonLus = conversations.reduce((n, c) => n + (c.message || []).filter((m) => !m.lu && m.expediteur === 'fournisseur').length, 0);
  const recentes = conversations.slice(0, 4).map((c) => {
    const msgs = [...(c.message || [])].sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi));
    return { ...c, dernier: msgs[0], nonLus: msgs.filter((m) => !m.lu && m.expediteur === 'fournisseur').length };
  });
  const initiales = (vendeur.nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();
  const depuis = anciennete(vendeur.date_inscription);

  async function etrePrevenu() {
    try { await capturerLead(session.user.email, 'espace-acheteur-boutique'); setPrevenu(true); } catch { setErreur("Impossible d'enregistrer votre demande pour le moment."); }
  }

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        <div className="esp-carte entete-fournisseur">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="entete-logo entete-initiales" aria-hidden="true">{initiales}</div>
            <div style={{ flex: '1 1 240px' }}>
              <h1 style={{ fontSize: 'clamp(1.35rem, 2.4vw, 1.8rem)', margin: '0 0 0.2rem' }}>Bonjour {vendeur.nom}</h1>
              <div className="entete-ligne">
                {vendeur.activite ? `${vendeur.activite}` : 'Acheteur'}
                {infosPays(vendeur.pays_code) && <span> · {infosPays(vendeur.pays_code).drapeau} {infosPays(vendeur.pays_code).nom}</span>}
                {depuis && <span> · sur LOOHOO depuis {depuis}</span>}
              </div>
            </div>
            <span className="esp-puce esp-puce-vert"><BadgeCheck size={13} /> Acheteur LOOHOO</span>
          </div>
        </div>

        <div className="esp-kpis" style={{ margin: '1rem 0 0' }}>
          <Stat etiquette="Fournisseurs contactés" valeur={contactes} />
          <Stat etiquette="Achats confirmés" valeur={`${f(montantAchats)} F`} />
          <Stat etiquette="Fournisseurs suivis" valeur={favoris.length} />
          <Stat etiquette="Messages non lus" valeur={nonLus} />
        </div>

        <h2 className="espace-titre">Vos outils</h2>
        <div className="a-la-une-grille">
          <Link to="/calculateur-marge" className="carte a-la-une-carte" style={{ alignItems: 'flex-start' }}>
            <Calculator size={26} color="var(--loo-rouge)" aria-hidden="true" />
            <strong>Calculateur de marge</strong>
            <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>À quel prix revendre pour gagner ce que vous visez ?</span>
            <span className="badge badge-verifie">Gratuit</span>
          </Link>
        </div>

        <div className="esp-grille esp-deux" style={{ marginTop: '1.4rem' }}>
          <div className="esp-carte">
            <h2 className="esp-carte-titre"><span><Heart size={16} aria-hidden="true" /> Fournisseurs suivis</span></h2>
            {favoris.length === 0 && <p className="esp-aide" style={{ margin: 0 }}>Aucun fournisseur suivi. Sur la page d'un fournisseur, appuyez sur « Suivre » pour le retrouver ici.</p>}
            {favoris.map((g) => (
              <Link key={g.id} to={`/grossiste/${g.id}`} className="esp-liste-ligne">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{g.badge_verifie && <BadgeCheck size={13} aria-label="Vérifié" />} {g.nom}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>{g.ville}{g.categorie ? ` · ${g.categorie}` : ''}</div>
                </div>
                {g.prix_min != null && <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>dès {f(g.prix_min)} F</span>}
              </Link>
            ))}
          </div>

          <div className="esp-carte">
            <h2 className="esp-carte-titre"><span><MessageCircle size={16} aria-hidden="true" /> Vos messages</span><Link to="/conversations">Tout voir →</Link></h2>
            {recentes.length === 0 && <p className="esp-aide" style={{ margin: 0 }}>Aucune conversation. Demandez un devis à un fournisseur pour commencer.</p>}
            {recentes.map((c) => (
              <Link key={c.id} to={`/conversations/${c.id}`} className="esp-liste-ligne">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{c.grossiste?.nom || 'Fournisseur'}</div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>{c.dernier ? ilYa(c.dernier.date_envoi) : ''}{c.produit?.nom ? ` · ${c.produit.nom}` : ''}</div>
                </div>
                {c.nonLus > 0 && <span className="esp-puce esp-puce-orange">{c.nonLus} nouveau{c.nonLus > 1 ? 'x' : ''}</span>}
              </Link>
            ))}
          </div>
        </div>

        <div className="esp-carte" style={{ marginTop: '1.4rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Rocket size={26} color="var(--loo-rouge)" aria-hidden="true" />
          <div style={{ flex: '1 1 260px' }}>
            <strong>Bientôt : créez votre boutique en ligne</strong>
            <p className="esp-aide" style={{ margin: '0.2rem 0 0' }}>Vendez directement sur LOOHOO, sur votre propre adresse. Soyez prévenu dès l'ouverture.</p>
          </div>
          {prevenu
            ? <span className="esp-puce esp-puce-vert">C'est noté, nous vous prévenons</span>
            : <button type="button" className="btn btn-primary" onClick={etrePrevenu}>Être prévenu en premier</button>}
        </div>
      </div>
    </section>
  );
}

function Stat({ etiquette, valeur }) {
  return (
    <div className="esp-kpi esp-kpi-carte">
      <div className="esp-kpi-etiquette">{etiquette}</div>
      <div className="esp-kpi-valeur">{valeur}</div>
    </div>
  );
}
