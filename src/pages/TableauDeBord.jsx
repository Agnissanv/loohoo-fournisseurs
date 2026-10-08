import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { AlertTriangle, Check, Circle, MessageCircle } from 'lucide-react';
import {
  suivreSession, recupererMonProfil, mettreAJourProfil, finaliserInscriptionEnAttente,
  recupererMesStats, recupererMesConversations, recupererDocuments, recupererMotifDecision,
  recupererMonAbonnement, recupererMesVentes, recupererAvisPublics, recupererIndicateursConfiance,
} from '../api/fournisseurs.js';
import EnTeteFournisseur from '../components/EnTeteFournisseur.jsx';
import CourbeOnglets from '../components/CourbeOnglets.jsx';
import GestionStock from '../components/GestionStock.jsx';
import BlocAbonnement from '../components/BlocAbonnement.jsx';
import { completudeProfil } from '../utils/profilFournisseur.js';
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
  const [documents, setDocuments] = useState([]);
  const [motifStatut, setMotifStatut] = useState('');
  const [ventes, setVentes] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [avis, setAvis] = useState(null);
  const [indicateurs, setIndicateurs] = useState(null);
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
    recupererMesVentes().then(setVentes);
    recupererMonAbonnement().then(setAbonnement);
  }, [session, navigate, rafraichirIdentite]);

  // Les décisions de l'équipe sur les documents (motif en cas de rejet)
  const idProfil = profil?.id;
  useEffect(() => {
    if (idProfil) {
      recupererDocuments(idProfil).then(setDocuments).catch(() => {});
      recupererMotifDecision(idProfil).then(setMotifStatut);
      recupererAvisPublics(idProfil).then(setAvis);
      recupererIndicateursConfiance(idProfil).then(setIndicateurs).catch(() => {});
    }
  }, [idProfil]);

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

  // Ce que l'équipe a décidé et qui demande une réaction du fournisseur
  const decisions = [
    profil.statut === 'suspendu' && {
      cle: 'profil', grave: true, titre: "Votre profil est suspendu : il n'apparaît plus dans l'annuaire.",
      motif: motifStatut ? `Motif : ${motifStatut}` : "Contactez l'équipe LOOHOO pour en savoir plus.",
      vers: '/profil', action: 'Voir mon profil',
    },
    ...produits.filter((p) => p.statut === 'rejete').map((p) => ({
      cle: `p-${p.id}`, titre: `Produit rejeté : ${p.nom}`, motif: p.motif_rejet ? `Motif : ${p.motif_rejet}` : 'Corrigez le produit puis enregistrez-le : il repartira en vérification.',
      vers: `/produits/${p.id}/modifier`, action: 'Corriger',
    })),
    ...documents.filter((d) => d.statut === 'rejete').map((d) => ({
      cle: `d-${d.id}`, titre: `Document refusé : ${d.nom_fichier || d.type}`, motif: d.motif_rejet ? `Motif : ${d.motif_rejet}` : "Merci d'envoyer un nouveau document.",
      vers: '/profil', action: 'Renvoyer',
    })),
  ].filter(Boolean);

  const evolution = stats?.evolution || [];
  const statut = STATUTS[profil.statut] || STATUTS.en_attente;
  const completude = completudeProfil(profil, documents, telephone);
  const ruptures = produits.filter((p) => p.actif !== false && p.stock_disponible === 0);

  // Ventes confirmées : 30 derniers jours, et variation par rapport aux 30 jours d'avant
  const maintenant = Date.now();
  const somme = (de, a) => ventes.filter((v) => { const t = maintenant - new Date(v.date_reponse).getTime(); return t >= de * 86400000 && t < a * 86400000; });
  const ventes30 = somme(0, 30).reduce((n, v) => n + Number(v.montant_fcfa || 0), 0);
  const ventesAvant = somme(30, 60).reduce((n, v) => n + Number(v.montant_fcfa || 0), 0);
  const variationVentes = ventesAvant > 0 ? `${ventes30 >= ventesAvant ? '+' : ''}${Math.round(((ventes30 - ventesAvant) / ventesAvant) * 100)} % vs 30 jours avant` : null;
  const contacts30 = stats?.contacts_30_jours;
  const conversion = contacts30 > 0 ? Math.round((somme(0, 30).length / contacts30) * 100) : null;

  const majProduit = (id, champs) => setProfil((p) => ({ ...p, produit: p.produit.map((x) => (x.id === id ? { ...x, ...champs } : x)) }));

  return (
    <>
      <EnTeteFournisseur profil={profil} avis={avis} indicateurs={indicateurs} completude={completude} />

      <div className="esp-kpis" style={{ margin: '1rem 0 0' }}>
        <Kpi etiquette="Ventes (30 j)" valeur={`${ventes30.toLocaleString('fr-FR')} F`} detail={variationVentes} />
        <Kpi etiquette="Contacts reçus (30 j)" valeur={stats?.contacts_30_jours ?? '–'} />
        <Kpi etiquette="Vues du profil" valeur={stats?.vues_profil ?? '–'} />
        <Kpi etiquette="Taux de conversion" valeur={conversion == null ? '–' : `${conversion} %`} />
      </div>

      {ruptures.length > 0 && (
        <div className="esp-carte" role="status" style={{ marginTop: '1rem', borderColor: 'var(--loo-orange)', background: '#FFFAF3', display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <AlertTriangle size={20} color="var(--loo-orange)" aria-hidden="true" />
          <span>{ruptures.length} produit{ruptures.length > 1 ? 's' : ''} en rupture de stock à mettre à jour : {ruptures.slice(0, 2).map((p) => p.nom).join(', ')}{ruptures.length > 2 ? '…' : ''}</span>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="esp-carte" style={{ marginTop: '1rem', borderColor: 'var(--loo-orange)', background: '#FFFAF3' }}>
          <h2 className="esp-carte-titre"><span>Messages de l'équipe LOOHOO</span></h2>
          {decisions.map((d) => (
            <div key={d.cle} className="esp-liste-ligne" style={{ alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: d.grave ? 'var(--loo-rouge)' : undefined }}>{d.titre}</div>
                <div style={{ fontSize: '0.86rem', opacity: 0.85, lineHeight: 1.5 }}>{d.motif}</div>
              </div>
              {d.vers && <Link to={d.vers} style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--loo-rouge)', whiteSpace: 'nowrap' }}>{d.action}</Link>}
            </div>
          ))}
        </div>
      )}

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
        <GestionStock produits={produits} onChange={majProduit} />

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
        <CourbeOnglets ventes={ventes} contacts={evolution} />

        <div style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
          <div className="esp-carte" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <MessageCircle size={28} color="var(--loo-rouge)" aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--police-affiche)', fontWeight: 800, fontSize: '1.7rem', lineHeight: 1 }}>{totalNonLus}</div>
              <div style={{ opacity: 0.75, fontSize: '0.9rem' }}>{totalNonLus > 1 ? 'messages non lus' : 'message non lu'}</div>
            </div>
            <Link to="/conversations" className="btn btn-primary">Messagerie</Link>
          </div>
          <BlocAbonnement abonnement={abonnement} />
        </div>
      </div>
    </>
  );
}

function Kpi({ etiquette, valeur, detail }) {
  return (
    <div className="esp-kpi esp-kpi-carte">
      <div className="esp-kpi-etiquette">{etiquette}</div>
      <div className="esp-kpi-valeur">{valeur}</div>
      {detail && <div style={{ fontSize: '0.76rem', marginTop: '0.2rem', color: detail.startsWith('+') ? '#1f7a3d' : 'var(--loo-rouge)' }}>{detail}</div>}
    </div>
  );
}
