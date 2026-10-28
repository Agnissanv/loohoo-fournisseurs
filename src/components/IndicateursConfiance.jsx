import React, { useEffect, useState } from 'react';
import { BadgeCheck, Handshake, Timer, PackageCheck } from 'lucide-react';
import { recupererIndicateursConfiance } from '../api/fournisseurs.js';
import { useLangue } from '../i18n/Langue.jsx';

const formatDelai = (h, t) => {
  if (h < 1) return t("moins d'1 h");
  if (h < 24) return t('environ {n} h', { n: Math.round(h) });
  const j = Math.round(h / 24);
  return j > 1 ? t('environ {n} jours', { n: j }) : t('environ 1 jour');
};

// Ce qui permet à un acheteur de décider : chiffres réels, calculés par LOOHOO. Une ligne n'apparaît que si la donnée existe.
export default function IndicateursConfiance({ grossisteId, verifie, compact = false }) {
  const { t, langue } = useLangue();
  const formatDate = (iso) => new Date(iso).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long' });
  const [ind, setInd] = useState(null);

  useEffect(() => {
    let annule = false;
    recupererIndicateursConfiance(grossisteId).then((i) => { if (!annule) setInd(i); }).catch(() => {});
    return () => { annule = true; };
  }, [grossisteId]);

  const lignes = [];
  if (verifie) lignes.push({ icone: BadgeCheck, texte: t('Entreprise contrôlée par LOOHOO') });
  if (ind?.stock_verifie_le) lignes.push({ icone: PackageCheck, texte: t('Stock vérifié le {date}', { date: formatDate(ind.stock_verifie_le) }) });
  if (ind?.delai_reponse_heures != null) lignes.push({ icone: Timer, texte: t('Répond en {delai}', { delai: formatDelai(Number(ind.delai_reponse_heures), t) }) + (ind.taux_reponse != null ? ` · ${t('{n} % des demandes reçoivent une réponse', { n: ind.taux_reponse })}` : '') });
  if (ind?.affaires_confirmees > 0) {
    lignes.push({ icone: Handshake, texte: ind.affaires_confirmees > 1
      ? t('{n} affaires conclues sur LOOHOO, confirmées par les deux parties', { n: ind.affaires_confirmees })
      : t('1 affaire conclue sur LOOHOO, confirmée par les deux parties') });
  }
  if (lignes.length === 0) return null;

  return (
    <ul className="confiance-liste" style={compact ? { marginTop: '0.8rem', fontSize: '0.84rem' } : undefined} aria-label={t('Indicateurs de confiance')}>
      {lignes.map(({ icone: Icone, texte }) => (
        <li key={texte}><Icone size={compact ? 15 : 17} aria-hidden="true" /> <span>{texte}</span></li>
      ))}
    </ul>
  );
}
