import React, { useEffect, useState } from 'react';

// Version réduite d'une photo hébergée sur Supabase Storage (2 à 3 fois plus légère) : on demande la largeur dont on a vraiment besoin.
// Si la réduction échoue (formule du serveur, limite atteinte), on retombe sur l'image d'origine pour ne jamais afficher un trou.
export function urlReduite(url, largeur, qualite = 72) {
  if (!url) return url;
  if (url.includes('/storage/v1/object/public/')) {
    return `${url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=${largeur}&quality=${qualite}`;
  }
  if (url.includes('/upload/')) return url.replace('/upload/', `/upload/f_auto,q_auto,w_${largeur},c_limit/`);
  return url;
}

// Image qui apparaît en fondu une fois chargée, sur un fond coloré (jamais de zone vide)
export default function ImageOptimisee({ src, largeur = 600, alt = '', className = '', style, prioritaire = false, ...reste }) {
  const [echec, setEchec] = useState(false);
  const [prete, setPrete] = useState(false);
  useEffect(() => { setEchec(false); setPrete(false); }, [src]);

  return (
    <img
      {...reste}
      src={echec ? src : urlReduite(src, largeur)}
      alt={alt}
      style={style}
      className={`loo-img-fondu${prete ? ' loo-img-prete' : ''} ${className}`.trim()}
      loading={prioritaire ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={prioritaire ? 'high' : undefined}
      onLoad={() => setPrete(true)}
      onError={() => { if (!echec) setEchec(true); else setPrete(true); }}
      ref={(el) => { if (el && el.complete && el.naturalWidth > 0 && !prete) setPrete(true); }}
    />
  );
}
