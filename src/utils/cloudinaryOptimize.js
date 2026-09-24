// Même convention que sur les boutiques (ex. MédiThé) : insère les paramètres de
// transformation Cloudinary directement dans l'URL déjà uploadée par la boutique.
export function optimiserImageCloudinary(url, largeurMax = 400) {
  if (!url || !url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${largeurMax},c_limit/`);
}
