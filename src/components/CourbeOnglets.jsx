import React, { useMemo, useState } from 'react';
import { cleJour, trenteDerniersJours } from '../utils/profilFournisseur.js';

const prix = (n) => Number(n).toLocaleString('fr-FR');

// Courbe à onglets de l'espace fournisseur : ventes, contacts reçus, conversion — sur 30 jours.
// ventes : [{ montant_fcfa, date_reponse }] (affaires confirmées) ; contacts : [{ jour, nb }]
export default function CourbeOnglets({ ventes = [], contacts = [] }) {
  const [onglet, setOnglet] = useState('ventes');

  const { jours, serieVentes, serieContacts, serieConversion, totaux } = useMemo(() => {
    const j = trenteDerniersJours();
    const parJourVentes = Object.fromEntries(j.map((c) => [c, 0]));
    const nbVentes = Object.fromEntries(j.map((c) => [c, 0]));
    ventes.forEach((v) => {
      const c = cleJour(v.date_reponse);
      if (c in parJourVentes) { parJourVentes[c] += Number(v.montant_fcfa) || 0; nbVentes[c] += 1; }
    });
    const parJourContacts = Object.fromEntries(j.map((c) => [c, 0]));
    contacts.forEach((c) => { const k = cleJour(c.jour); if (k in parJourContacts) parJourContacts[k] += c.nb; });

    // Conversion : par semaine (4 tranches de 7 jours + 2 jours au début), sinon trop de jours vides
    const tranches = [];
    for (let i = 0; i < 30; i += 7) tranches.push(j.slice(i, i + 7));
    const conv = tranches.map((t) => {
      const c = t.reduce((n, k) => n + parJourContacts[k], 0);
      const v = t.reduce((n, k) => n + nbVentes[k], 0);
      return { jour: t[t.length - 1], valeur: c > 0 ? Math.round((v / c) * 100) : 0 };
    });
    const totalContacts = Object.values(parJourContacts).reduce((a, b) => a + b, 0);
    const totalNbVentes = Object.values(nbVentes).reduce((a, b) => a + b, 0);
    return {
      jours: j,
      serieVentes: j.map((c) => ({ jour: c, valeur: parJourVentes[c] })),
      serieContacts: j.map((c) => ({ jour: c, valeur: parJourContacts[c] })),
      serieConversion: conv,
      totaux: {
        ventes: Object.values(parJourVentes).reduce((a, b) => a + b, 0),
        nbVentes: totalNbVentes,
        contacts: totalContacts,
        conversion: totalContacts > 0 ? Math.round((totalNbVentes / totalContacts) * 100) : 0,
      },
    };
  }, [ventes, contacts]);

  const ONGLETS = {
    ventes: { titre: 'Ventes', serie: serieVentes, valeur: `${prix(totaux.ventes)} F CFA`, detail: `${totaux.nbVentes} vente${totaux.nbVentes > 1 ? 's' : ''} confirmée${totaux.nbVentes > 1 ? 's' : ''} sur 30 jours`, format: (v) => `${prix(v)} F CFA` },
    contacts: { titre: 'Contacts', serie: serieContacts, valeur: String(totaux.contacts), detail: 'demandes reçues sur 30 jours', format: (v) => `${v} demande${v > 1 ? 's' : ''}` },
    conversion: { titre: 'Conversion', serie: serieConversion, valeur: `${totaux.conversion} %`, detail: 'des demandes ont abouti à une vente confirmée (par semaine sur la courbe)', format: (v) => `${v} %` },
  };
  const actif = ONGLETS[onglet];
  const total = actif.serie.reduce((n, d) => n + d.valeur, 0);

  return (
    <div className="esp-carte">
      <div className="courbe-onglets" role="tablist" aria-label="Choisir la courbe">
        {Object.entries(ONGLETS).map(([cle, o]) => (
          <button key={cle} type="button" role="tab" aria-selected={onglet === cle} className={`courbe-onglet${onglet === cle ? ' courbe-onglet-actif' : ''}`} onClick={() => setOnglet(cle)}>{o.titre}</button>
        ))}
      </div>
      <div style={{ fontFamily: 'var(--police-affiche)', fontWeight: 800, fontSize: '1.7rem', marginTop: '0.8rem' }}>{actif.valeur}</div>
      <p className="esp-aide" style={{ margin: '0 0 0.6rem' }}>{actif.detail}</p>
      {total === 0
        ? <p className="esp-aide" style={{ padding: '1.4rem 0' }}>Rien à afficher sur cette période. Les chiffres apparaissent dès la première {onglet === 'ventes' ? 'vente confirmée' : 'demande reçue'}.</p>
        : <Trace serie={actif.serie} format={actif.format} libelle={`Courbe : ${actif.titre.toLowerCase()} sur 30 jours`} />}
    </div>
  );
}

function Trace({ serie, format, libelle }) {
  const L = 640; const H = 170; const m = { g: 8, d: 8, h: 14, b: 22 };
  const max = Math.max(1, ...serie.map((d) => d.valeur));
  const pas = (L - m.g - m.d) / Math.max(1, serie.length - 1);
  const x = (i) => m.g + i * pas;
  const y = (v) => m.h + (H - m.h - m.b) * (1 - v / max);
  const pts = serie.map((d, i) => `${x(i)},${y(d.valeur)}`).join(' ');
  const aire = `${m.g},${H - m.b} ${pts} ${x(serie.length - 1)},${H - m.b}`;
  const date = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const repères = [0, Math.floor((serie.length - 1) / 2), serie.length - 1];
  return (
    <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={libelle} style={{ width: '100%', height: 'auto' }}>
      <polygon points={aire} fill="var(--loo-orange)" opacity="0.16" />
      <polyline points={pts} fill="none" stroke="var(--loo-orange)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {serie.map((d, i) => d.valeur > 0 && <circle key={d.jour} cx={x(i)} cy={y(d.valeur)} r="3.5" fill="var(--loo-rouge)"><title>{`${date(d.jour)} : ${format(d.valeur)}`}</title></circle>)}
      {repères.map((i, k) => <text key={i} x={x(i)} y={H - 6} fontSize="11" fill="currentColor" opacity="0.6" textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}>{date(serie[i].jour)}</text>)}
    </svg>
  );
}
