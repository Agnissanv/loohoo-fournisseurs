import React from 'react';
import { usePays } from '../utils/usePays.js';
import { drapeau, FORMATS } from '../utils/pays.js';

// Numéro de téléphone avec l'indicatif du pays devant. Si onPaysChange est fourni, l'indicatif se choisit dans une liste ;
// sinon il suit le pays donné (par exemple le pays choisi plus haut dans le formulaire).
export default function ChampTelephone({ id, value, onChange, pays = 'CI', onPaysChange, required, autoFocus, placeholder }) {
  const { tous, parCode } = usePays();
  const infos = parCode[pays] || { indicatif: '225' };
  const exemple = placeholder || FORMATS[pays]?.exemple || '';

  return (
    <div className="champ-telephone">
      {onPaysChange ? (
        <select className="champ" value={pays} onChange={(e) => onPaysChange(e.target.value)} aria-label="Indicatif du pays">
          {tous.map((p) => <option key={p.code} value={p.code}>{drapeau(p.code)} +{p.indicatif}</option>)}
        </select>
      ) : (
        <span className="champ-telephone-prefixe" aria-hidden="true">{drapeau(pays)} +{infos.indicatif}</span>
      )}
      <input id={id} className="champ" type="tel" inputMode="tel" autoComplete="tel-national" required={required} autoFocus={autoFocus}
        placeholder={exemple} value={value} onChange={onChange} />
    </div>
  );
}
