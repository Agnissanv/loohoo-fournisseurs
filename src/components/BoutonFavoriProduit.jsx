import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { recupererMonRole, estFavoriProduit, basculerFavoriProduit } from '../api/fournisseurs.js';
import { useLangue } from '../i18n/Langue.jsx';

// « Enregistrer » un produit pour le comparer plus tard : réservé aux acheteurs connectés.
// Un visiteur est invité à créer son compte acheteur ; un fournisseur ne voit pas le bouton.
export default function BoutonFavoriProduit({ produitId, className = 'btn btn-outline' }) {
  const { t } = useLangue();
  const navigate = useNavigate();
  const [role, setRole] = useState(undefined); // undefined = chargement, null = visiteur
  const [favori, setFavori] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let annule = false;
    recupererMonRole().then(async (r) => {
      if (annule) return;
      setRole(r.role);
      if (r.role === 'vendeur') { const f = await estFavoriProduit(produitId); if (!annule) setFavori(f); }
    }).catch(() => { if (!annule) setRole(null); });
    return () => { annule = true; };
  }, [produitId]);

  if (role === undefined || role === 'fournisseur') return null;

  async function cliquer() {
    if (role !== 'vendeur') { navigate('/inscription/acheteur'); return; }
    setEnvoi(true);
    try { setFavori(await basculerFavoriProduit(produitId)); } catch { /* réseau coupé : on ne change rien */ } finally { setEnvoi(false); }
  }

  return (
    <button type="button" className={className} onClick={cliquer} disabled={envoi} aria-pressed={favori}
      title={role === 'vendeur' ? undefined : t('Créez un compte acheteur pour enregistrer ce produit')}>
      <Heart size={16} fill={favori ? 'var(--loo-orange)' : 'none'} color={favori ? 'var(--loo-orange)' : 'currentColor'} />
      {favori ? t('Enregistré') : t('Enregistrer')}
    </button>
  );
}
