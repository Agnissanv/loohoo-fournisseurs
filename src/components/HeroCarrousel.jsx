import React, { useEffect, useState } from 'react';

// Pour changer une image : remplacer le fichier dans public/images/ (ou modifier cette liste).
const IMAGES = [
  { src: '/images/hero-adjame.jpg', alt: "Pagnes et tissus empilés sur un étal du marché d'Adjamé, à Abidjan", credit: 'Eva Blue, Unsplash', position: 'center 40%' },
  { src: '/images/hero-marche.jpg', alt: 'Une rue commerçante animée, étals et acheteurs', credit: 'Al-amin Muhammad, Pexels', position: 'center 55%' },
  { src: '/images/hero-etal.jpg', alt: 'Une commerçante souriante derrière son étal', credit: 'iv image.ng, Pexels', position: 'center 30%' },
];
const DUREE_MS = 6000;

// Bandeau d'accueil : photos plein cadre qui défilent en fondu, avec le contenu (children) par-dessus.
export default function HeroCarrousel({ children }) {
  const [actif, setActif] = useState(0);
  const [pause, setPause] = useState(false);
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduit(mq.matches);
    const maj = (e) => setReduit(e.matches);
    mq.addEventListener('change', maj);
    return () => mq.removeEventListener('change', maj);
  }, []);

  // Arrêté si la personne survole le bandeau, préfère moins d'animation, ou si l'onglet est caché
  useEffect(() => {
    if (pause || reduit) return undefined;
    const t = setInterval(() => { if (document.visibilityState === 'visible') setActif((i) => (i + 1) % IMAGES.length); }, DUREE_MS);
    return () => clearInterval(t);
  }, [pause, reduit]);

  return (
    <section className="loo-hero" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)} aria-roledescription="carrousel" aria-label="Photos de marchés et de commerçants">
      {IMAGES.map((img, i) => (
        <img key={img.src} className={`loo-hero-fond${i === actif ? ' loo-hero-fond-actif' : ''}`} src={img.src}
          alt={i === actif ? img.alt : ''} aria-hidden={i === actif ? undefined : 'true'} style={{ objectPosition: img.position }}
          loading={i === 0 ? 'eager' : 'lazy'} fetchpriority={i === 0 ? 'high' : undefined} />
      ))}
      <div className="loo-hero-voile" aria-hidden="true" />

      <div className="container loo-hero-contenu">
        {children}
        <div className="loo-hero-points" role="tablist" aria-label="Choisir la photo">
          {IMAGES.map((img, i) => (
            <button key={img.src} type="button" role="tab" aria-selected={i === actif} aria-label={`Photo ${i + 1} sur ${IMAGES.length}`}
              className={`loo-hero-point${i === actif ? ' loo-hero-point-actif' : ''}`} onClick={() => setActif(i)} />
          ))}
        </div>
      </div>

      <span className="loo-hero-credit">Photo : {IMAGES[actif].credit}</span>
    </section>
  );
}
