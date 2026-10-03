import { supabase } from '../supabaseClient.js';

const TAILLE_MAX_PIXELS = 1600;
const QUALITE_JPEG = 0.82;

// Compresse une image côté navigateur avant envoi (même principe que MédiThé) :
// redimensionne si trop grande, réencode en JPEG pour limiter le poids.
function compresserImage(fichier) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const lecteur = new FileReader();

    lecteur.onerror = () => reject(new Error('Impossible de lire le fichier'));
    lecteur.onload = () => { image.src = lecteur.result; };

    image.onerror = () => reject(new Error('Fichier image invalide'));
    image.onload = () => {
      const ratio = Math.min(1, TAILLE_MAX_PIXELS / Math.max(image.width, image.height));
      const largeur = Math.round(image.width * ratio);
      const hauteur = Math.round(image.height * ratio);

      const canevas = document.createElement('canvas');
      canevas.width = largeur;
      canevas.height = hauteur;
      canevas.getContext('2d').drawImage(image, 0, 0, largeur, hauteur);

      canevas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Échec de la compression'))),
        'image/jpeg',
        QUALITE_JPEG
      );
    };

    lecteur.readAsDataURL(fichier);
  });
}

function nomFichierAleatoire() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
}

function mesurerDimensions(blob) {
  return new Promise((resolve) => {
    const image = new Image();
    const urlTemp = URL.createObjectURL(blob);
    image.onload = () => { resolve({ largeur: image.width, hauteur: image.height }); URL.revokeObjectURL(urlTemp); };
    image.onerror = () => { resolve({ largeur: null, hauteur: null }); URL.revokeObjectURL(urlTemp); };
    image.src = urlTemp;
  });
}

// Compresse puis envoie dans le dossier du fournisseur ; renvoie l'URL publique.
export async function televerserPhoto(grossisteId, fichier) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type)) {
    throw new Error('Formats acceptés : JPG, PNG, WebP');
  }
  const blobCompresse = await compresserImage(fichier);
  const chemin = `${grossisteId}/${nomFichierAleatoire()}`;

  const { error } = await supabase.storage.from('photos').upload(chemin, blobCompresse, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
  });
  if (error) throw error;

  const { data } = supabase.storage.from('photos').getPublicUrl(chemin);
  return data.publicUrl;
}

// Comme televerserPhoto, mais renvoie aussi les métadonnées utiles à la médiathèque
export async function televerserMedia(grossisteId, fichier) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(fichier.type)) {
    throw new Error('Formats acceptés : JPG, PNG, WebP');
  }
  const blobCompresse = await compresserImage(fichier);
  const { largeur, hauteur } = await mesurerDimensions(blobCompresse);
  const chemin = `${grossisteId}/${nomFichierAleatoire()}`;

  const { error } = await supabase.storage.from('photos').upload(chemin, blobCompresse, {
    contentType: 'image/jpeg', cacheControl: '3600',
  });
  if (error) throw error;

  const { data } = supabase.storage.from('photos').getPublicUrl(chemin);
  return { url: data.publicUrl, largeur, hauteur, taille_octets: blobCompresse.size };
}

// Supprime un fichier à partir de son URL publique (utile pour garder le stockage propre)
export async function supprimerPhotoStockage(url) {
  const marqueur = '/object/public/photos/';
  const index = url.indexOf(marqueur);
  if (index === -1) return; // URL d'une autre origine (ancienne donnée Cloudinary, par ex.) : rien à faire
  const chemin = url.slice(index + marqueur.length);
  await supabase.storage.from('photos').remove([chemin]);
}


const TAILLE_MAX_VIDEO = 50 * 1024 * 1024;

export async function televerserVideo(grossisteId, fichier) {
  if (!fichier.type.startsWith('video/')) throw new Error('Le fichier doit être une vidéo');
  if (fichier.size > TAILLE_MAX_VIDEO) throw new Error('Vidéo trop volumineuse (50 Mo max)');

  const chemin = `${grossisteId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.storage.from('videos').upload(chemin, fichier);
  if (error) throw error;

  const { data } = supabase.storage.from('videos').getPublicUrl(chemin);
  return data.publicUrl;
}

export async function supprimerVideoStockage(url) {
  const marqueur = '/object/public/videos/';
  const index = url.indexOf(marqueur);
  if (index === -1) return;
  await supabase.storage.from('videos').remove([url.slice(index + marqueur.length)]);
}