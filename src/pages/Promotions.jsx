import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Megaphone, Users } from 'lucide-react';
import {
  suivreSession, recupererMonProfil, publierPromotion, retirerMaPromotion, recupererMesPromotions, compterMesAbonnes,
} from '../api/fournisseurs.js';
import { contientCoordonnees, promessesInterdites } from '../utils/messagerie.js';

const dansJours = (n) => { const d = new Date(Date.now() + n * 86400000); return d.toISOString().slice(0, 10); };
const dateCourte = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

// Espace fournisseur : les promotions arrivent dans la cloche des acheteurs qui vous suivent (migration 0030).
export default function Promotions() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [liste, setListe] = useState(undefined); // null = migration absente
  const [abonnes, setAbonnes] = useState(null);
  const [champs, setChamps] = useState({ titre: '', texte: '', produitId: '', dateFin: dansJours(14) });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  useEffect(() => suivreSession(setSession), []);
  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then(setProfil).catch(() => setProfil(null));
    recupererMesPromotions().then(setListe);
    compterMesAbonnes().then(setAbonnes);
  }, [session, navigate]);

  if (session === undefined || profil === undefined || liste === undefined) return <div className="loo-squelette" style={{ height: '260px' }} />;
  if (!profil) return <p>Aucun profil fournisseur associé à ce compte.</p>;
  if (liste === null) {
    return (
      <>
        <h1 className="esp-titre-page">Promotions</h1>
        <p className="esp-aide">Les promotions seront disponibles après la mise à jour de la base (migration 0030).</p>
      </>
    );
  }

  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.value }));
  const produits = (profil.produit || []).filter((p) => p.statut === 'publie' && p.actif);
  const texteControle = `${champs.titre} ${champs.texte}`;
  const coordonnees = contientCoordonnees(texteControle);
  const promesses = promessesInterdites(texteControle);
  const semaine = liste.filter((p) => Date.now() - new Date(p.date_publication).getTime() < 7 * 86400000).length;

  async function publier(e) {
    e.preventDefault();
    setErreur('');
    setSucces('');
    if (coordonnees || promesses.length) { setErreur('Retirez du texte les coordonnées et les promesses signalées en orange.'); return; }
    setEnvoi(true);
    try {
      await publierPromotion({ titre: champs.titre.trim(), texte: champs.texte.trim(), produitId: champs.produitId, dateFin: new Date(`${champs.dateFin}T23:59:59`).toISOString() });
      setChamps({ titre: '', texte: '', produitId: '', dateFin: dansJours(14) });
      setListe(await recupererMesPromotions());
      setSucces(abonnes ? `Promotion envoyée à vos ${abonnes} abonné${abonnes > 1 ? 's' : ''}.` : 'Promotion publiée. Elle arrivera chez vos abonnés dès qu\'ils vous suivront.');
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  async function retirer(p) {
    if (!window.confirm(`Retirer « ${p.titre} » ? Vos abonnés ne la verront plus.`)) return;
    try {
      await retirerMaPromotion(p.id);
      setListe(await recupererMesPromotions());
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <>
      <h1 className="esp-titre-page">Promotions</h1>
      <div className="esp-carte promo-abonnes">
        <Users size={22} aria-hidden="true" />
        <div>
          <strong>{abonnes == null ? '–' : abonnes} acheteur{abonnes > 1 ? 's' : ''} vous sui{abonnes > 1 ? 'vent' : 't'}</strong>
          <p className="esp-aide" style={{ margin: '0.15rem 0 0' }}>
            Vos promotions arrivent dans leur cloche de notifications. Pour gagner des abonnés, partagez votre page : le bouton « Suivre » y est en haut.
          </p>
        </div>
        <Link to={`/grossiste/${profil.id}`} target="_blank" className="btn btn-outline" style={{ fontSize: '0.84rem', padding: '0.45em 1em' }}>Voir ma page</Link>
      </div>

      <div className="esp-grille esp-deux" style={{ marginTop: '1rem', alignItems: 'start' }}>
        <form className="esp-carte" onSubmit={publier}>
          <h2 className="esp-carte-titre"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><Megaphone size={18} aria-hidden="true" /> Nouvelle promotion</span></h2>
          <div className="esp-champ-bloc">
            <label htmlFor="promo-titre">Titre</label>
            <input id="promo-titre" className="champ" required maxLength={80} placeholder="Ex. : -10 % sur le pagne wax cette semaine" value={champs.titre} onChange={maj('titre')} />
          </div>
          <div className="esp-champ-bloc">
            <label htmlFor="promo-texte">Détails (facultatif)</label>
            <textarea id="promo-texte" className="champ" rows={3} maxLength={300} placeholder="Ex. : dès 20 pièces, dans la limite du stock." value={champs.texte} onChange={maj('texte')} />
            <p className="esp-aide" style={{ textAlign: 'right' }}>{champs.texte.length}/300</p>
          </div>
          <div className="esp-ligne-champs">
            <div className="esp-champ-bloc">
              <label htmlFor="promo-produit">Produit concerné (facultatif)</label>
              <select id="promo-produit" className="champ" value={champs.produitId} onChange={maj('produitId')}>
                <option value="">Tout le catalogue</option>
                {produits.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div className="esp-champ-bloc">
              <label htmlFor="promo-fin">Jusqu'au</label>
              <input id="promo-fin" className="champ" type="date" required min={dansJours(1)} max={dansJours(60)} value={champs.dateFin} onChange={maj('dateFin')} />
            </div>
          </div>
          {(coordonnees || promesses.length > 0) && (
            <div role="alert" className="esp-aide" style={{ color: '#B8650A', opacity: 1, fontWeight: 600, marginBottom: '0.6rem' }}>
              {coordonnees && <p style={{ margin: '0 0 0.2rem' }}>Retirez les numéros, e-mails et liens : les acheteurs vous contactent par LOOHOO.</p>}
              {promesses.length > 0 && <p style={{ margin: 0 }}>Votre texte contient {promesses.join(', ')}. Ces promesses ne sont pas autorisées.</p>}
            </div>
          )}
          {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, margin: '0 0 0.6rem' }}>{erreur}</p>}
          {succes && <p role="status" style={{ color: '#1f7a3d', fontWeight: 600, margin: '0 0 0.6rem' }}>{succes}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={envoi || semaine >= 3}>{envoi ? 'Envoi…' : 'Envoyer à mes abonnés'}</button>
            <span className="esp-aide">{semaine >= 3 ? 'Trois promotions cette semaine : la prochaine sera possible dans quelques jours.' : `${3 - semaine} promotion${3 - semaine > 1 ? 's' : ''} possible${3 - semaine > 1 ? 's' : ''} cette semaine.`}</span>
          </div>
        </form>

        <div className="esp-carte">
          <h2 className="esp-carte-titre">Vos promotions</h2>
          {liste.length === 0 && <p className="esp-aide" style={{ margin: 0 }}>Aucune promotion pour le moment.</p>}
          {liste.map((p) => {
            const active = !p.retiree && (!p.date_fin || new Date(p.date_fin) > new Date());
            return (
              <div key={p.id} className="esp-liste-ligne" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{p.titre}</div>
                  <div className="esp-aide">
                    {p.produit_nom ? `${p.produit_nom} · ` : ''}envoyée le {dateCourte(p.date_publication)}{p.date_fin ? ` · jusqu'au ${dateCourte(p.date_fin)}` : ''}
                  </div>
                  <span className={`esp-puce ${active ? 'esp-puce-vert' : p.retiree ? 'esp-puce-rouge' : 'esp-puce-orange'}`} style={{ marginTop: '0.3rem' }}>
                    {active ? 'En cours' : p.retiree ? 'Retirée' : 'Terminée'}
                  </span>
                </div>
                {active && <button type="button" className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.35em 0.8em' }} onClick={() => retirer(p)}>Retirer</button>}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
