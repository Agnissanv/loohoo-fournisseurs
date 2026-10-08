import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as IconeImage, Pencil, Plus } from 'lucide-react';
import { modifierProduit } from '../api/fournisseurs.js';
import { ilYa } from '../utils/profilFournisseur.js';

const LIMITE = 6;

// Mise à jour rapide du stock, sans ouvrir chaque produit. Les ruptures passent en premier.
export default function GestionStock({ produits, onChange }) {
  const [enEdition, setEnEdition] = useState(null);
  const [valeur, setValeur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  const actifs = produits.filter((p) => p.actif !== false);
  const tries = [...actifs].sort((a, b) => {
    const ra = a.stock_disponible === 0 ? 0 : 1;
    const rb = b.stock_disponible === 0 ? 0 : 1;
    return ra - rb || a.nom.localeCompare(b.nom, 'fr');
  }).slice(0, LIMITE);

  function ouvrir(p) {
    setEnEdition(p.id);
    setValeur(p.stock_disponible == null ? '' : String(p.stock_disponible));
    setErreur('');
  }

  async function enregistrer(e, p) {
    e.preventDefault();
    const n = Number(valeur);
    if (valeur === '' || !Number.isInteger(n) || n < 0) { setErreur('Indiquez un nombre entier, 0 si le produit est épuisé.'); return; }
    setEnvoi(true);
    setErreur('');
    try {
      await modifierProduit(p.id, { stock_disponible: n });
      onChange(p.id, { stock_disponible: n, stock_maj_le: new Date().toISOString() });
      setEnEdition(null);
    } catch (err) {
      setErreur('Impossible de mettre à jour le stock : ' + err.message);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="esp-carte">
      <h2 className="esp-carte-titre">
        <span>Gérer vos stocks</span>
        <Link to="/produits/nouveau" className="btn btn-outline" style={{ padding: '0.3em 0.8em', fontSize: '0.8rem' }}><Plus size={14} /> Produit</Link>
      </h2>
      {tries.length === 0 && <p className="esp-aide" style={{ margin: 0 }}>Aucun produit actif. Ajoutez-en un pour suivre son stock ici.</p>}
      {tries.map((p) => {
        const rupture = p.stock_disponible === 0;
        const inconnu = p.stock_disponible == null;
        return (
          <div key={p.id} className="esp-liste-ligne" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, flex: '1 1 200px' }}>
              {p.photo_url
                ? <img src={p.photo_url} alt="" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                : <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--loo-papier-ombre)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconeImage size={17} opacity={0.5} /></div>}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
                <div style={{ fontSize: '0.78rem', color: rupture ? 'var(--loo-rouge)' : undefined, opacity: rupture ? 1 : 0.65 }}>
                  {inconnu ? 'Stock non renseigné' : rupture ? `Rupture, ${ilYa(p.stock_maj_le) || 'à mettre à jour'}` : `Mis à jour ${ilYa(p.stock_maj_le) || 'récemment'}`}
                </div>
              </div>
            </div>

            {enEdition === p.id ? (
              <form onSubmit={(e) => enregistrer(e, p)} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input className="champ" style={{ width: '5.5rem', padding: '0.4em 0.6em' }} type="number" min="0" inputMode="numeric" autoFocus value={valeur} onChange={(e) => setValeur(e.target.value)} aria-label={`Nouveau stock de ${p.nom}`} />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.4em 0.9em', fontSize: '0.8rem' }} disabled={envoi}>{envoi ? '…' : 'OK'}</button>
                <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.7em', fontSize: '0.8rem' }} onClick={() => setEnEdition(null)}>Annuler</button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <strong style={{ fontFamily: 'var(--police-affiche)', fontSize: '1.15rem', color: rupture ? 'var(--loo-rouge)' : undefined }}>{inconnu ? '–' : p.stock_disponible}</strong>
                <button type="button" className="esp-bouton-icone" aria-label={`Modifier le stock de ${p.nom}`} onClick={() => ouvrir(p)}><Pencil size={15} /></button>
              </div>
            )}
          </div>
        );
      })}
      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.85rem', margin: '0.5rem 0 0' }}>{erreur}</p>}
      {actifs.length > LIMITE && <p style={{ margin: '0.6rem 0 0' }}><Link to="/produits" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.88rem' }}>Voir tous les produits →</Link></p>}
      <p className="esp-aide" style={{ margin: '0.6rem 0 0' }}>Changer la quantité retire la mention « stock vérifié » : notre équipe la confirmera à nouveau.</p>
    </div>
  );
}
