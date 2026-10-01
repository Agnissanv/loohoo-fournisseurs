import React, { useEffect, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { recupererMedia, ajouterMedia } from '../api/fournisseurs.js';
import { televerserMedia } from '../utils/stockagePhotos.js';

export default function SelecteurPhoto({ grossisteId, onChoisir, onClose }) {
  const [media, setMedia] = useState(undefined);
  const [televersement, setTeleversement] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    recupererMedia(grossisteId).then(setMedia).catch((err) => setErreur(err.message));
  }, [grossisteId]);

  async function surTeleversement(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setTeleversement(true);
    setErreur('');
    try {
      const resultat = await televerserMedia(grossisteId, fichier);
      await ajouterMedia(grossisteId, resultat, fichier.name);
      setMedia((m) => [{ id: `temp-${Date.now()}`, url: resultat.url, nom: fichier.name }, ...(m || [])]);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setTeleversement(false);
      e.target.value = '';
    }
  }

  return (
    <div className="modale-fond" onClick={onClose}>
      <div className="modale" style={{ width: 'min(100%, 640px)' }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modale-fermer" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Choisir une photo</h2>

        <label className="btn btn-outline" style={{ cursor: 'pointer', marginBottom: '1rem', display: 'inline-flex' }}>
          <Upload size={15} /> {televersement ? 'Envoi…' : 'Téléverser une nouvelle image'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={televersement} onChange={surTeleversement} />
        </label>

        {erreur && <p style={{ color: 'var(--loo-rouge)', fontSize: '0.85rem' }}>{erreur}</p>}

        {media === undefined && <div className="loo-squelette" style={{ height: '140px' }} />}
        {media && media.length === 0 && <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Votre médiathèque est vide pour l'instant.</p>}

        {media && media.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }}>
            {media.map((m) => (
              <button
                key={m.id} type="button" onClick={() => onChoisir(m.url)}
                style={{ border: '2px solid var(--loo-papier-ombre)', borderRadius: 'var(--rayon-sm)', padding: 0, cursor: 'pointer', background: 'none' }}
              >
                <img src={m.url} alt={m.nom} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '6px' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}