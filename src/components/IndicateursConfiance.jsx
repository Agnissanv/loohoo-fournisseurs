import React, { useEffect, useState } from 'react';
import { BadgeCheck, Handshake, Timer, PackageCheck } from 'lucide-react';
import { recupererIndicateursConfiance } from '../api/fournisseurs.js';

const formatDelai = (h) => {
  if (h < 1) return 'moins d\'1 h';
  if (h < 24) return `environ ${Math.round(h)} h`;
  const j = Math.round(h / 24);
  return `environ ${j} jour${j > 1 ? 's' : ''}`;
};
const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

// Ce qui permet à un acheteur de décider : chiffres réels, calculés par LOOHOO. Une ligne n'apparaît que si la donnée existe.
export default function IndicateursConfiance({ grossisteId, verifie, compact = false }) {
  const [ind, setInd] = useState(null);

  useEffect(() => {
    let annule = false;
    recupererIndicateursConfiance(grossisteId).then((i) => { if (!annule) setInd(i); }).catch(() => {});
    return () => { annule = true; };
  }, [grossisteId]);

  const lignes = [];
  if (verifie) lignes.push({ icone: BadgeCheck, texte: 'Entreprise contrôlée par LOOHOO' });
  if (ind?.stock_verifie_le) lignes.push({ icone: PackageCheck, texte: `Stock vérifié le ${formatDate(ind.stock_verifie_le)}` });
  if (ind?.delai_reponse_heures != null) lignes.push({ icone: Timer, texte: `Répond en ${formatDelai(Number(ind.delai_reponse_heures))}${ind.taux_reponse != null ? ` · ${ind.taux_reponse} % des demandes reçoivent une réponse` : ''}` });
  if (ind?.affaires_confirmees > 0) {
    lignes.push({ icone: Handshake, texte: `${ind.affaires_confirmees} affaire${ind.affaires_confirmees > 1 ? 's' : ''} conclue${ind.affaires_confirmees > 1 ? 's' : ''} sur LOOHOO, confirmée${ind.affaires_confirmees > 1 ? 's' : ''} par les deux parties` });
  }
  if (lignes.length === 0) return null;

  return (
    <ul className="confiance-liste" style={compact ? { marginTop: '0.8rem', fontSize: '0.84rem' } : undefined} aria-label="Indicateurs de confiance">
      {lignes.map(({ icone: Icone, texte }) => (
        <li key={texte}><Icone size={compact ? 15 : 17} aria-hidden="true" /> <span>{texte}</span></li>
      ))}
    </ul>
  );
}
