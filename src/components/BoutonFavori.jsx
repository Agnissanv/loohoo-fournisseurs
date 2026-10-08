import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { recupererMonRole, estFavori, basculerFavori } from '../api/fournisseurs.js';

// « Suivre ce fournisseur » : réservé aux acheteurs connectés. Un visiteur est invité à créer son compte acheteur ; un fournisseur ne voit rien.
export default function BoutonFavori({ grossisteId }) {
  const navigate = useNavigate();
  const [role, setRole] = useState(undefined); // undefined = chargement, null = visiteur
  const [favori, setFavori] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let annule = false;
    recupererMonRole().then(async (r) => {
      if (annule) return;
      setRole(r.role);
      if (r.role === 'vendeur') { const f = await estFavori(grossisteId); if (!annule) setFavori(f); }
    }).catch(() => { if (!annule) setRole(null); });
    return () => { annule = true; };
  }, [grossisteId]);

  if (role === undefined || role === 'fournisseur') return null;

  async function cliquer() {
    if (role !== 'vendeur') { navigate('/inscription/acheteur'); return; }
    setEnvoi(true);
    try { setFavori(await basculerFavori(grossisteId)); } catch { /* migration 0020 absente ou réseau coupé : on ne change rien */ } finally { setEnvoi(false); }
  }

  return (
    <button type="button" className="btn btn-outline" onClick={cliquer} disabled={envoi} aria-pressed={favori} title={role === 'vendeur' ? undefined : 'Créez un compte acheteur pour suivre ce fournisseur'}>
      <Heart size={16} fill={favori ? 'var(--loo-rouge)' : 'none'} color={favori ? 'var(--loo-rouge)' : 'currentColor'} /> {favori ? 'Suivi' : 'Suivre'}
    </button>
  );
}
