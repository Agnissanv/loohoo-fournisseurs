import React from 'react';
import { Star } from 'lucide-react';
import { useLangue } from '../i18n/Langue.jsx';

// Affichage en lecture seule (note sur 5)
export function Etoiles({ note, taille = 16 }) {
  const { t } = useLangue();
  return (
    <span role="img" aria-label={t('{n} sur 5', { n: note })} style={{ display: 'inline-flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={taille} aria-hidden="true" fill={n <= Math.round(note) ? 'var(--loo-orange)' : 'none'} color="var(--loo-orange)" />
      ))}
    </span>
  );
}

// Choix de la note, utilisable au clavier (boutons radio)
export function ChoixNote({ valeur, onChange }) {
  const { t } = useLangue();
  return (
    <div role="radiogroup" aria-label={t('Votre note')} style={{ display: 'inline-flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={valeur === n} aria-label={t('{n} sur 5', { n })} onClick={() => onChange(n)}
          style={{ background: 'none', border: 0, padding: '2px', cursor: 'pointer' }}>
          <Star size={26} fill={n <= valeur ? 'var(--loo-orange)' : 'none'} color="var(--loo-orange)" />
        </button>
      ))}
    </div>
  );
}
