import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { recupererMesConversations, suivreSession, recupererMonRole } from '../api/fournisseurs.js';
import { analyserConversation } from '../utils/statsDemandes.js';

const STATUTS = {
  nouvelle: { texte: 'Nouvelle', classe: 'esp-puce-rouge' },
  en_cours: { texte: 'En attente de réponse', classe: 'esp-puce-orange' },
  repondue: { texte: 'Répondue', classe: 'esp-puce-vert' },
};

const formatRelatif = (iso) => {
  const minutes = Math.round((Date.now() - new Date(iso)) / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 60 * 24) return `Il y a ${Math.round(minutes / 60)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function Conversations() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [liste, setListe] = useState(undefined);
  const [filtre, setFiltre] = useState('toutes');
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonRole().then((r) => setRole(r.role)).catch((err) => setErreur(err.message));
    recupererMesConversations().then(setListe).catch((err) => setErreur(err.message));
  }, [session, navigate]);

  const estFournisseur = role === 'fournisseur';

  // Côté fournisseur : une ligne = une demande d'acheteur, avec son statut
  const demandes = useMemo(
    () => (liste || []).map((c) => ({ ...analyserConversation(c), brut: c }))
      .sort((a, b) => new Date(b.dernier?.date_envoi || b.dateDemande) - new Date(a.dernier?.date_envoi || a.dateDemande)),
    [liste],
  );

  if (erreur) {
    return <section className="section"><div className="container"><p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p></div></section>;
  }
  if (session === undefined || liste === undefined || role === null) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '200px' }} /></div></section>;
  }

  if (!estFournisseur) {
    // Compte acheteur : liste simple, avec l'interlocuteur et le dernier message
    return (
      <section className="section">
        <div className="container">
          <Link to="/" style={{ display: 'inline-block', marginBottom: '1.2rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-rouge)' }}>
            ← Retour à l'annuaire
          </Link>
          <h1 className="section-titre">Mes conversations</h1>
          {liste.length === 0 && <p style={{ opacity: 0.7 }}>Aucune conversation pour l'instant. Trouvez un produit et contactez son fournisseur.</p>}
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {liste.map((c) => {
              const dernier = [...c.message].sort((a, b) => new Date(b.date_envoi) - new Date(a.date_envoi))[0];
              const nonLus = c.message.filter((m) => !m.lu && m.expediteur !== role).length;
              return (
                <Link key={c.id} to={`/conversations/${c.id}`} className="carte" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{c.grossiste?.nom}</strong>
                    {c.produit?.nom && <span style={{ opacity: 0.7, fontSize: '0.85rem' }}> — {c.produit.nom}</span>}
                    {dernier && <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', opacity: 0.75 }}>{dernier.contenu.slice(0, 80)}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {nonLus > 0 && <span className="badge badge-verifie">{nonLus}</span>}
                    <MessageCircle size={18} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const compte = (s) => demandes.filter((d) => d.statut === s).length;
  const onglets = [
    ['toutes', `Toutes (${demandes.length})`],
    ['nouvelle', `Nouvelles (${compte('nouvelle')})`],
    ['en_cours', `En attente de réponse (${compte('en_cours')})`],
    ['repondue', `Répondues (${compte('repondue')})`],
  ];
  const visibles = demandes.filter((d) => filtre === 'toutes' || d.statut === filtre);

  return (
    <>
      <h1 className="esp-titre-page">Demandes et messages</h1>

      {demandes.length === 0 ? (
        <div className="esp-carte" style={{ textAlign: 'center', padding: '2.2rem 1.2rem' }}>
          <MessageCircle size={32} color="var(--loo-rouge)" />
          <h2 style={{ fontSize: '1.15rem', margin: '0.7rem 0 0.4rem' }}>Aucune demande pour l'instant</h2>
          <p style={{ opacity: 0.75, maxWidth: '48ch', margin: '0 auto 1rem' }}>
            Quand un acheteur vous écrira, sa demande apparaîtra ici. Pour en recevoir : des produits publiés, des photos nettes, un prix de gros clair.
          </p>
          <Link to="/produits" className="btn btn-primary">Voir mes produits</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {onglets.map(([cle, texte]) => (
              <button key={cle} type="button" onClick={() => setFiltre(cle)} className="esp-puce" style={{
                border: 0, cursor: 'pointer', fontSize: '0.8rem', padding: '0.4em 0.9em',
                background: filtre === cle ? 'var(--loo-encre)' : 'var(--loo-papier-ombre)',
                color: filtre === cle ? 'var(--loo-papier)' : 'var(--loo-encre)',
              }}>{texte}</button>
            ))}
          </div>

          {visibles.length === 0 && <p style={{ opacity: 0.7 }}>Aucune demande dans cette catégorie.</p>}
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {visibles.map((d) => (
              <Link key={d.id} to={`/conversations/${d.id}`} className="esp-carte" style={{ padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{d.acheteur}</strong>
                    {d.produit && <span style={{ fontSize: '0.84rem', opacity: 0.7 }}>à propos de {d.produit}</span>}
                  </div>
                  {d.dernier && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.88rem', opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.dernier.expediteur === 'fournisseur' ? 'Vous : ' : ''}{d.dernier.contenu}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                  <span style={{ fontSize: '0.78rem', opacity: 0.6, whiteSpace: 'nowrap' }}>{formatRelatif(d.dernier?.date_envoi || d.dateDemande)}</span>
                  <span className={`esp-puce ${STATUTS[d.statut].classe}`}>{STATUTS[d.statut].texte}{d.nonLus > 1 ? ` · ${d.nonLus}` : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
