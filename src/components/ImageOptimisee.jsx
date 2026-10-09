import React, { useState } from 'react';

// Version réduite d'une photo hébergée sur Supabase Storage (2 à 3 fois plus légère) : on demande la largeur dont on a vraiment besoin.
// Si la réduction échoue (limite du serveur, format), on retombe sur l'image d'origine pour ne jamais afficher un trou.
export function urlReduite(url, largeur, qualite = 72) {
  if (!url) return url;
  if (url.includes('/storage/v1/object/public/')) {
    return `${url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=${largeur}&quality=${qualite}`;
  }
  if (url.includes('/upload/')) return url.replace('/upload/', `/upload/f_auto,q_auto,w_${largeur},c_limit/`);
  return url;
}

// Image qui apparaît en fondu une fois chargée, sur un fond coloré (jamais de zone vide).
// L'état « chargée » et « échec » est rattaché à l'adresse de l'image : changer d'image repart de zéro, sans effet ni course entre le chargement et l'état.
export default function ImageOptimisee({ src, largeur = 600, alt = '', className = '', style, prioritaire = false, ...reste }) {
  const [prete, setPrete] = useState(null);
  const [echec, setEchec] = useState(null);
  const enEchec = echec === src;
  const affichee = prete === src;

  return (
    <img
      {...reste}
      src={enEchec ? src : urlReduite(src, largeur)}
      alt={alt}
      style={style}
      className={`loo-img-fondu${affichee ? ' loo-img-prete' : ''} ${className}`.trim()}
      loading={prioritaire ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={prioritaire ? 'high' : undefined}
      onLoad={() => setPrete(src)}
      onError={() => { if (!enEchec) setEchec(src); else setPrete(src); }}
      ref={(el) => { if (el && el.complete && el.naturalWidth > 0) setPrete(src); }}
    />
  );
}
