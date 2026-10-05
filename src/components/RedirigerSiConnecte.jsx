import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recupererMonRole } from '../api/fournisseurs.js';

// Placé en haut d'une page d'accès (connexion, inscription) : une personne déjà connectée n'a rien à y faire,
// on l'envoie directement dans son espace (ou à l'adresse demandée).
export default function RedirigerSiConnecte({ vers }) {
  const navigate = useNavigate();
  useEffect(() => {
    let actif = true;
    recupererMonRole().then((r) => {
      if (actif && r.role) navigate(vers || (r.role === 'fournisseur' ? '/tableau-de-bord' : '/'), { replace: true });
    }).catch(() => {});
    return () => { actif = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
