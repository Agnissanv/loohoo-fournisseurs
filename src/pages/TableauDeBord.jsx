import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { BadgeCheck, Check, Circle, Image as IconeImage, MessageCircle } from 'lucide-react';
import {
  suivreSession, recupererMonProfil, mettreAJourProfil, finaliserInscriptionEnAttente,
  recupererMesStats, recupererMesConversations,
} from '../api/fournisseurs.js';
import { telephoneDuProfil } from '../utils/telephone.js';

const STATUTS = {
  en_attente: { texte: 'En attente de vérification', classe: 'esp-puce-orange' },
  publie: { texte: "Publié dans l'annuaire", classe: 'esp-puce-vert' },
  suspendu: { texte: 'Suspendu', classe: 'esp-puce-rouge' },
};
const STATUTS_PRODUIT = {
  publie: { texte: 'Publié', classe: 'esp-puce-vert' },
  rejete: { texte: 'Rejeté', classe: 'esp-puce-rouge' },
  en_attente: { texte: 'En vérification', classe: 'esp-puce-orange' },
};

const formatRelatif = (iso) => {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 60 * 24) return `Il y a ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function TableauDeBord() {
  const navigate = useNavigate();
  const { rafraichirIdentite } = useOutletContext() || {};
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id)
      .then(async (p) => {
        if (p) return p;
        // Compte confirmé par e-mail mais profil pas encore créé : on le crée avec les infos saisies à l'inscription
        const cree = await finaliserInscriptionEnAttente().catch(() => false);
        if (cree) { rafraichirIdentite?.(); return recupererMonProfil(session.user.id); }
        return null;
      })
      .then(setProfil)
      .catch((err) => setErreur('Impossible de charger votre profil : ' + err.message));
    // Ces blocs sont secondaires : s'ils échouent, le reste du tableau de bord s'affiche quand même
    recupererMesStats().then(setStats).catch(() => {});
    recupererMesConversations().then(setConversations).catch(() => {});
  }, [session, navigate, rafraichirIdentite]);

  if (erreur) return <p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>;
  if (session === undefined || profil === undefined) return <div className="loo-squelette" style={{ height: '240px' }} />;
  if (!profil) return <p>Aucun profil fournisseur associé à ce compte.</p>;

  async function basculerStock(e) {
    const valeur = e.target.checked;
    try {
      await mettreAJourProfil(profil.id, { stock_confirme: valeur });
      setProfil((p) => ({ ...p, stock_confirme: valeur }));
      rafraichirIdentite?.();
    } catch (err) {
      setErreur('Impossible de mettre à jour le stock : ' + err.message);
    }
  }

  const produits = profil.produit || [];
  const produitsPublies = produits.filter((p) => p.statut === 'publie' && p.actif);
  const recents = [...produits].sort((a, b) => new Date(b.date_ajout || 0) - new Date(a.date_ajout || 0)).slice(0, 4);
  const telephone = telephoneDuProfil(profil);

  // Ce qui reste à faire pour être publié et bien visible
  const etapes = [
    { fait: !!profil.logo_url, texte: 'Ajouter votre logo', vers: '/profil' },
    { fait: (profil.grossiste_photo || []).length >= 1, texte: 'Ajouter au moins 1 photo réelle de votre entreprise', vers: '/profil' },
    { fait: !!telephone, texte: 'Renseigner votre téléphone (privé)', vers: '/profil' },
    { fait: produits.length >= 1, texte: 'Ajouter votre premier produit', vers: '/produits' },
    { fait: !!profil.stock_confirme, texte: 'Confirmer que votre stock est disponible', action: true },
    { fait: produitsPublies.length >= 1, texte: 'Avoir un produit validé par notre équipe', attente: produits.length >= 1 },
  ];
  const nbFaites = etapes.filter((e) => e.fait).length;
  const complet = nbFaites === etapes.length;

  // Conversations à traiter : le dernier message vient de l'acheteur
  const demandes = conversations
    .map((c) => {
      const tries = [...(c.message || [])].sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi));
      const dernier = tries[0];
      const nonLus = tries.filter((m) => !m.lu && m.expediteur === 'vendeur').length;
      return { ...c, dernier, nonLus, repondu: dernier?.expediteur === 'fournisseur' };
    })
    .slice(0, 4);
  const totalNonLus = conversations.reduce((n, c) => n + (c.message || []).filter((m) => !m.lu && m.expediteur === 'vendeur').length, 0);

  const evolution = stats?.evolution || [];
  const maxJour = Math.max(1, ...evolution.map((e) => e.nb));
  const statut = STATUTS[profil.statut] || STATUTS.en_attente;

  return (
    <>
      <div className="esp-bandeau">
        <div>
          <h1>Bonjour {profil.nom}</h1>
          <p>Voici un aperçu de votre activité sur LOOHOO Fournisseurs.</p>
        </div>
        <div className="esp-kpis">
          <Kpi etiquette="Produits actifs" valeur={stats?.produits_actifs ?? produitsPublies.length} />
          <Kpi etiquette="Demandes (30 j)" valeur={stats?.contacts_30_jours ?? '–'} />
          <Kpi etiquette="Vues du profil" valeur={stats?.vues_profil ?? '–'} />
          <div className="esp-kpi">
            <div className="esp-kpi-etiquette">Votre profil</div>
            <span className={`esp-puce ${statut.classe}`}>
              {profil.badge_verifie && <BadgeCheck size={13} />} {profil.badge_verifie ? 'Vérifié' : statut.texte}
            </span>
          </div>
        </div>
      </div>

      {!complet && (
        <div className="esp-carte" style={{ marginTop: '1rem' }}>
          <h2 className="esp-carte-titre">
            <span>Publiez votre profil : {nbFaites} étape{nbFaites > 1 ? 's' : ''} sur {etapes.length}</span>
            <span className={`esp-puce ${statut.classe}`}>{statut.texte}</span>
          </h2>
          <div className="esp-progression"><div style={{ width: `${(nbFaites / etapes.length) * 100}%` }} /></div>
          <div style={{ marginTop: '0.8rem' }}>
            {etapes.map((e) => (
              <div key={e.texte} className="esp-liste-ligne">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', opacity: e.fait ? 0.55 : 1, textDecoration: e.fait ? 'line-through' : 'none' }}>
                  {e.fait ? <Check size={17} color="#1f7a3d" /> : <Circle size={17} opacity={0.4} />} {e.texte}
                </span>
                {!e.fait && e.action && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input type="checkbox" checked={!!profil.stock_confirme} onChange={basculerStock} /> Mon stock est disponible
                  </label>
                )}
                {!e.fait && e.vers && <Link to={e.vers} style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--loo-rouge)' }}>Compléter</Link>}
                {!e.fait && e.attente && <span style={{ fontSize: '0.8rem', opacity: 0.65 }}>Notre équipe examine vos produits</span>}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.82rem', opacity: 0.65, margin: '0.8rem 0 0' }}>
            Un profil sans stock confirmé n'est jamais publié. Les documents (RCCM, pièce d'identité…) sont facultatifs mais accélèrent la vérification et le badge « Vérifié ».
          </p>
        </div>
      )}

      <div className="esp-grille esp-deux" style={{ marginTop: '1rem' }}>
        <div className="esp-carte">
          <h2 className="esp-carte-titre"><span>Produits récents</span><Link to="/produits">Voir tous les produits →</Link></h2>
          {recents.length === 0 && <p style={{ opacity: 0.65, margin: 0 }}>Aucun produit pour l'instant. <Link to="/produits" style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>Ajouter un produit</Link></p>}
          {recents.map((p) => {
            const st = STATUTS_PRODUIT[p.statut] || STATUTS_PRODUIT.en_attente;
            return (
              <div key={p.id} className="esp-liste-ligne">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0 }}>
                  {p.photo_url
                    ? <img src={p.photo_url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    : <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--loo-papier-ombre)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconeImage size={18} opacity={0.5} /></div>}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
                    <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>
                      {p.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA{p.stock_disponible != null ? ` · ${p.stock_disponible} en stock` : ''}
                    </div>
                  </div>
                </div>
                <span className={`esp-puce ${st.classe}`}>{st.texte}</span>
              </div>
            );
          })}
        </div>

        <div className="esp-carte">
          <h2 className="esp-carte-titre"><span>Dernières demandes</span><Link to="/conversations">Voir toutes →</Link></h2>
          {demandes.length === 0 && <p style={{ opacity: 0.65, margin: 0 }}>Aucune demande reçue pour l'instant. Elles arriveront ici dès qu'un acheteur vous écrira.</p>}
          {demandes.map((c) => (
            <Link key={c.id} to={`/conversations/${c.id}`} className="esp-liste-ligne">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{c.vendeur?.nom || 'Acheteur'}</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.65, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.dernier ? formatRelatif(c.dernier.date_envoi) : ''}{c.produit?.nom ? ` · ${c.produit.nom}` : ''}
                </div>
              </div>
              <span className={`esp-puce ${c.nonLus > 0 ? 'esp-puce-orange' : c.repondu ? 'esp-puce-vert' : 'esp-puce-neutre'}`}>
                {c.nonLus > 0 ? 'Nouvelle' : c.repondu ? 'Répondu' : 'En cours'}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="esp-grille esp-deux" style={{ marginTop: '1rem' }}>
        <div className="esp-carte">
          <h2 className="esp-carte-titre"><span>Demandes reçues, 30 derniers jours</span><Link to="/statistiques">Détails →</Link></h2>
          {evolution.length === 0 ? (
            <p style={{ opacity: 0.65, margin: 0 }}>Aucune demande sur cette période.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '130px' }}>
              {evolution.map((e) => (
                <div key={e.jour} title={`${e.jour} : ${e.nb}`} style={{ flex: 1, background: 'var(--loo-orange)', borderRadius: '3px 3px 0 0', height: `${(e.nb / maxJour) * 100}%`, minHeight: '3px' }} />
              ))}
            </div>
          )}
        </div>

        <div className="esp-carte" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
          <MessageCircle size={30} color="var(--loo-rouge)" />
          <div style={{ fontFamily: 'var(--police-affiche)', fontWeight: 800, fontSize: '2.2rem', lineHeight: 1 }}>{totalNonLus}</div>
          <div style={{ opacity: 0.75 }}>{totalNonLus > 1 ? 'messages non lus' : 'message non lu'}</div>
          <Link to="/conversations" className="btn btn-primary" style={{ marginTop: '0.4rem' }}>Accéder à la messagerie</Link>
        </div>
      </div>
    </>
  );
}

function Kpi({ etiquette, valeur }) {
  return (
    <div className="esp-kpi">
      <div className="esp-kpi-etiquette">{etiquette}</div>
      <div className="esp-kpi-valeur">{valeur}</div>
    </div>
  );
}
