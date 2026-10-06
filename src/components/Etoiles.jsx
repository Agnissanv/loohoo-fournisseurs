import React from 'react';
import { Star } from 'lucide-react';

// Affichage en lecture seule (note sur 5)
export function Etoiles({ note, taille = 16 }) {
  return (
    <span role="img" aria-label={`${note} sur 5`} style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={taille} aria-hidden="true" fill={n <= Math.round(note) ? 'var(--loo-orange)' : 'none'} color="var(--loo-orange)" />
      ))}
    </span>
  );
}

// Choix de la note, utilisable au clavier (boutons radio)
export function ChoixNote({ valeur, onChange }) {
  return (
    <div role="radiogroup" aria-label="Votre note" style={{ display: 'inline-flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valeur === n} aria-label={`${n} sur 5`} onClick={() => onChange(n)}
          style={{ background: 'none', border: 0, padding: '2px', cursor: 'pointer' }}>
          <Star size={26} fill={n <= valeur ? 'var(--loo-orange)' : 'none'} color="var(--loo-orange)" />
        </button>
      ))}
    </div>
  );
}
