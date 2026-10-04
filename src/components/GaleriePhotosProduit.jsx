import React, { useEffect, useState } from 'react';
import { X, Trash2, Upload, Video as IconeVideo } from 'lucide-react';
import {
  recupererGaleriePhotosProduit, ajouterPhotoProduit, supprimerPhotoProduit,
  mettreAJourVideoProduit,
} from '../api/fournisseurs.js';
import { televerserPhoto, supprimerPhotoStockage, televerserVideo, supprimerVideoStockage } from '../utils/stockagePhotos.js';

export default function GaleriePhotosProduit({ produit, grossisteId, onClose, onChange }) {
  const [photos, setPhotos] = useState(undefined);
  const [videoUrl, setVideoUrl] = useState(produit.video_url || null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    recupererGaleriePhotosProduit(produit.id).then(setPhotos).catch((err) => setErreur(err.message));
  }, [produit.id]);

  async function ajouter(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setEnvoi(true);
    setErreur('');
    try {
      const url = await televerserPhoto(grossisteId, fichier);
      await ajouterPhotoProduit(produit.id, url, photos.length);
      setPhotos((p) => [...p, { id: `temp-${Date.now()}`, url, ordre: p.length }]);
      onChange();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
      e.target.value = '';
    }
  }

  async function retirer(photo) {
    try {
      await supprimerPhotoProduit(photo.id);
      await supprimerPhotoStockage(photo.url);
      setPhotos((p) => p.filter((x) => x.id !== photo.id));
      onChange();
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function ajouterVideo(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setEnvoi(true);
    setErreur('');
    try {
      const url = await televerserVideo(grossisteId, fichier);
      await mettreAJourVideoProduit(produit.id, url);
      setVideoUrl(url);
      onChange();
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnvoi(false);
      e.target.value = '';
    }
  }

  async function retirerVideo() {
    try {
      if (videoUrl) await supprimerVideoStockage(videoUrl);
      await mettreAJourVideoProduit(produit.id, null);
      setVideoUrl(null);
      onChange();
    } catch (err) {
      setErreur(err.message);
    }
  }

  return (
    <div className="modale-fond" onClick={onClose}>
      <div className="modale" style={{ width: 'min(100%, 560px)' }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modale-fermer" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.3rem' }}>Photos & vidéo</h2>
        <p style={{ opacity: 0.7, fontSize: '0.88rem', marginBottom: '1.2rem' }}>{produit.nom}</p>

        {erreur && <p style={{ color: 'var(--loo-rouge)', fontSize: '0.85rem', marginBottom: '0.8rem' }}>{erreur}</p>}

        <h3 style={{ fontSize: '0.92rem', marginBottom: '0.6rem' }}>
          Photos ({photos === undefined ? '…' : photos.length}/4)
        </h3>
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginBottom: '1.6rem' }}>
          {photos === undefined && <div className="loo-squelette" style={{ width: '90px', height: '90px' }} />}
          {photos?.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <img src={p.url} alt="" style={{ width: '90px', height: '90px', objectFit: 'cover', borderRadius: 'var(--rayon-sm)' }} />
              <button type="button" onClick={() => retirer(p)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--loo-rouge)', color: '#fff', border: 0, borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {photos && photos.length < 4 && (
            <label className="btn btn-outline" style={{ width: '90px', height: '90px', flexDirection: 'column', gap: '0.3rem', fontSize: '0.72rem', cursor: 'pointer' }}>
              <Upload size={16} />
              {envoi ? 'Envoi…' : 'Ajouter'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={envoi} onChange={ajouter} />
            </label>
          )}
        </div>

        <h3 style={{ fontSize: '0.92rem', marginBottom: '0.6rem' }}>Vidéo (facultative, 50 Mo max)</h3>
        {videoUrl ? (
          <div>
            <video src={videoUrl} controls style={{ width: '100%', borderRadius: 'var(--rayon-sm)', marginBottom: '0.6rem' }} />
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.82rem' }} onClick={retirerVideo}>
              <Trash2 size={14} /> Retirer la vidéo
            </button>
          </div>
        ) : (
          <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'inline-flex' }}>
            <IconeVideo size={15} /> {envoi ? 'Envoi…' : 'Ajouter une vidéo'}
            <input type="file" accept="video/*" hidden disabled={envoi} onChange={ajouterVideo} />
          </label>
        )}
      </div>
    </div>
  );
}