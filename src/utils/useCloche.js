import { useCallback, useEffect, useState } from 'react';
import { recupererCloche, marquerClocheLue, recupererVideosYoutube } from '../api/fournisseurs.js';

const CLE = 'loo-cloche-vu-le';
const PREMIER_PASSAGE_JOURS = 14; // premier passage : seuls les éléments récents comptent comme nouveaux
const RAFRAICHIR_MS = 10 * 60 * 1000;

function lireLocal() {
  try { return localStorage.getItem(CLE); } catch { return null; }
}
function ecrireLocal(valeur) {
  try { localStorage.setItem(CLE, valeur); } catch { /* navigation privée : on ne retient rien */ }
}

// La cloche : annonces LOOHOO, promotions des fournisseurs suivis et vidéos YouTube, triées de la plus récente à la plus ancienne.
// « connecte » : la date de dernière ouverture est gardée sur le compte ; sinon dans le navigateur.
// session : undefined pendant le chargement de la session (on attend), null pour un visiteur, ou la session.
export function useCloche(session) {
  const [etat, setEtat] = useState({ elements: [], vuLe: null, charge: false });
  const connecte = !!session;

  const charger = useCallback(async () => {
    const [cloche, videos] = await Promise.all([recupererCloche(30), recupererVideosYoutube()]);
    const elements = [
      ...cloche.elements.map((e) => ({ ...e, date: e.date_publication })),
      ...videos.map((v) => ({ id: `yt-${v.id}`, type: 'video', titre: v.titre, lien: v.lien, date: v.date })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    setEtat({ elements, vuLe: connecte ? cloche.vuLe : lireLocal(), charge: true });
  }, [connecte]);

  useEffect(() => {
    if (session === undefined) return undefined;
    charger();
    const auRetour = () => { if (document.visibilityState === 'visible') charger(); };
    document.addEventListener('visibilitychange', auRetour);
    const minuteur = setInterval(charger, RAFRAICHIR_MS);
    return () => { document.removeEventListener('visibilitychange', auRetour); clearInterval(minuteur); };
  }, [session, charger]);

  const seuil = etat.vuLe ? new Date(etat.vuLe) : new Date(Date.now() - PREMIER_PASSAGE_JOURS * 86400000);
  const estNouveau = useCallback((e) => new Date(e.date) > seuil, [seuil.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const nouveaux = etat.elements.filter(estNouveau).length;

  const marquerLues = useCallback(() => {
    const maintenant = new Date().toISOString();
    if (connecte) marquerClocheLue(); else ecrireLocal(maintenant);
    setEtat((e) => ({ ...e, vuLe: maintenant }));
  }, [connecte]);

  return { elements: etat.elements, charge: etat.charge, nouveaux, estNouveau, marquerLues };
}
