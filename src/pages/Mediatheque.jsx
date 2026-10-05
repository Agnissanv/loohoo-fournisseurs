import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Trash2, Upload } from 'lucide-react';
import { suivreSession, recupererMonProfil, recupererMedia, ajouterMedia, supprimerMedia, modifierProduitPhoto } from '../api/fournisseurs.js';
import { televerserMedia, supprimerPhotoStockage } from '../utils/stockagePhotos.js';

function formaterPoids(octets) {
  if (!octets) return '—';
  return octets > 1024 * 1024 ? `${(octets / (1024 * 1024)).toFixed(1)} Mo` : `${Math.round(octets / 1024)} Ko`;
}

export default function Mediatheque() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [media, setMedia] = useState(undefined);
  const [filtre, setFiltre] = useState('tous'); // tous | utilisees | non_utilisees
  const [recherche, setRecherche] = useState('');
  const [televersement, setTeleversement] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then((p) => {
      setProfil(p);
      if (p) recupererMedia(p.id).then(setMedia).catch((err) => setErreur(err.message));
    });
  }, [session, navigate]);

  async function recharger() {
    if (profil) setMedia(await recupererMedia(profil.id));
  }

  async function surTeleversement(e) {
    const fichiers = Array.from(e.target.files || []);
    if (fichiers.length === 0) return;
    setTeleversement(true);
    setErreur('');
    try {
      for (const fichier of fichiers) {
        const resultat = await televerserMedia(profil.id, fichier);
        await ajouterMedia(profil.id, resultat, fichier.name);
      }
      await recharger();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setTeleversement(false);
      e.target.value = '';
    }
  }

  async function supprimer(item) {
    try {
      await supprimerMedia(item.id);
      await supprimerPhotoStockage(item.url);
      setMedia((m) => m.filter((x) => x.id !== item.id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function utiliserPourProduit(url) {
    const produitId = window.prompt('ID du produit auquel associer cette photo (visible dans « Mes produits ») :');
    if (!produitId) return;
    try {
      await modifierProduitPhoto(produitId.trim(), url);
      alert('Photo associée au produit.');
    } catch (err) {
      setErreur("Impossible d'associer cette photo : " + err.message);
    }
  }

  if (session === undefined || profil === undefined || media === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '300px' }} /></div></section>;
  }
  if (!profil) {
    return <section className="section"><div className="container"><p>Aucun profil fournisseur associé à ce compte.</p></div></section>;
  }

  const utilisees = new Set((profil.produit || []).map((p) => p.photo_url).filter(Boolean));
  const filtres = media
    .filter((m) => (filtre === 'tous' ? true : filtre === 'utilisees' ? utilisees.has(m.url) : !utilisees.has(m.url)))
    .filter((m) => m.nom.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <section className="section">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.6rem' }}>
          <h1 className="section-titre" style={{ margin: 0 }}>Médiathèque</h1>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Upload size={16} /> {televersement ? 'Envoi…' : 'Téléverser des images'}
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden disabled={televersement} onChange={surTeleversement} />
          </label>
        </div>

        {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>}

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.4rem', fontSize: '0.85rem' }}>
          <span><strong>{media.length}</strong> images</span>
          <span><strong>{utilisees.size}</strong> utilisées</span>
          <span><strong>{media.length - [...utilisees].filter((u) => media.some((m) => m.url === u)).length}</strong> non utilisées</span>
        </div>

        <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
          <input className="champ" style={{ flex: '1 1 240px' }} placeholder="Rechercher une image…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          <select className="champ" style={{ flex: '0 1 180px' }} value={filtre} onChange={(e) => setFiltre(e.target.value)}>
            <option value="tous">Toutes</option>
            <option value="utilisees">Utilisées</option>
            <option value="non_utilisees">Non utilisées</option>
          </select>
        </div>

        {filtres.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Aucune image.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {filtres.map((m) => (
              <div key={m.id} className="carte" style={{ overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img src={m.url} alt={m.nom} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover' }} />
                  <span className="badge" style={{
                    position: 'absolute', top: '0.5rem', left: '0.5rem',
                    background: utilisees.has(m.url) ? '#2f8f4e' : 'var(--loo-orange)', color: '#fff',
                  }}>
                    {utilisees.has(m.url) ? 'Utilisée' : 'Non utilisée'}
                  </span>
                </div>
                <div style={{ padding: '0.6rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', fontWeight: 600, wordBreak: 'break-all' }}>{m.nom}</p>
                  <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', opacity: 0.65 }}>{formaterPoids(m.taille_octets)}</p>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.6em', fontSize: '0.78rem' }} onClick={() => { navigator.clipboard.writeText(m.url); }}>
                      <Copy size={13} />
                    </button>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.6em', fontSize: '0.78rem' }} onClick={() => utiliserPourProduit(m.url)}>
                      Utiliser
                    </button>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.6em', fontSize: '0.78rem' }} onClick={() => supprimer(m)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}