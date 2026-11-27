import React, { useEffect, useRef, useState } from 'react';
import { EditeurPaliers, normaliserPaliers, controlerPaliers } from '../components/PaliersPrix.jsx';
import ConsigneImages from '../components/ConsigneImages.jsx';
import CertificatsProduit from '../components/CertificatsProduit.jsx';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Camera, Image as IconeImage, Video, X } from 'lucide-react';
import SelecteurPhoto from '../components/SelecteurPhoto.jsx';
import SelectCategorie from '../components/SelectCategorie.jsx';
import { useCategories } from '../utils/useCategories.js';
import {
  suivreSession, recupererMonProfil, ajouterProduit, modifierProduit, supprimerProduit,
  recupererGaleriePhotosProduit, ajouterPhotoProduit, supprimerPhotoProduit, ajouterMedia,
} from '../api/fournisseurs.js';
import { televerserMedia, televerserVideo, supprimerVideoStockage } from '../utils/stockagePhotos.js';
import { contientCoordonnees, promessesInterdites } from '../utils/messagerie.js';
import { uniteAccordee } from '../utils/prix.js';
import { infosPays } from '../utils/pays.js';

const UNITES = ['pièce', 'carton', 'kg', 'litre', 'sac', 'rouleau', 'paquet', 'mètre', 'lot'];
const MAX_PHOTOS = 4;
const TAILLE_MAX_IMAGE = 10 * 1024 * 1024;
// Pays d'importation les plus courants, proposés à la saisie (le fournisseur peut en taper un autre)
const PAYS_IMPORT = ['Chine', 'Turquie', 'Inde', 'Émirats arabes unis', 'Nigeria', 'Ghana', 'France', 'Maroc', 'Sénégal', 'Mali', 'Burkina Faso', 'Togo', 'Bénin', 'Cameroun', 'Thaïlande', 'Indonésie', 'Italie', 'Espagne'];

const STATUTS = {
  publie: { texte: 'En ligne', classe: 'esp-puce-vert', detail: 'Visible par les acheteurs. Notre équipe contrôle les produits publiés et peut retirer celui qui ne respecte pas les règles.' },
  rejete: { texte: 'Retiré par LOOHOO', classe: 'esp-puce-rouge', detail: 'Corrigez le produit puis enregistrez : notre équipe vérifie la correction avant de le remettre en ligne.' },
  en_attente: { texte: 'En vérification', classe: 'esp-puce-orange', detail: 'Notre équipe vérifie votre correction avant de remettre le produit en ligne.' },
};

const versNombre = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
const texteOuNull = (v) => (String(v ?? '').trim() || null);
const vide = (v) => v === '' || v == null;

// Les 5 champs qui bloquent la publication (rapport du 22 nov 2026, « formulaire simplifié ») : photo, nom, prix de gros avec unité,
// quantité minimale, disponibilité. Tout le reste est facultatif. id = identifiant de l'élément à atteindre dans la page.
function champsManquants(c, nbPhotos) {
  const liste = [];
  if (nbPhotos < 1) liste.push({ id: 'zone-photos', libelle: 'Photo', message: 'Ajoutez au moins une photo du produit.' });
  if (!c.nom.trim()) liste.push({ id: 'nom', libelle: 'Nom du produit', message: 'Indiquez le nom du produit.' });
  if (vide(c.prix_gros)) liste.push({ id: 'prix_gros', libelle: 'Prix de gros', message: 'Indiquez votre prix de gros.' });
  if (!(Number(c.moq) >= 1)) liste.push({ id: 'moq', libelle: 'Quantité minimale', message: 'Indiquez la quantité minimale (au moins 1).' });
  if (!c.disponibilite) liste.push({ id: 'disponibilite', libelle: 'Disponibilité', message: 'Indiquez si le produit est en stock ou sur commande.' });
  else if (c.disponibilite === 'stock' && vide(c.stock)) liste.push({ id: 'stock', libelle: 'Quantité en stock', message: 'Indiquez la quantité en stock.' });
  else if (c.disponibilite === 'commande' && vide(c.delai_preparation)) liste.push({ id: 'delai', libelle: 'Délai', message: 'Indiquez le délai en jours.' });
  return liste;
}

// Complétude de la fiche : les 5 essentiels valent 40 %, les 10 informations recommandées 6 % chacune
function completude(c, nbPhotos, nbPaliers) {
  const essentielsRemplis = Math.max(0, 5 - champsManquants(c, nbPhotos).length);
  const recommandees = [
    ['une description', Boolean(c.description.trim())],
    ['la catégorie', Boolean(c.categorie)],
    ['à quoi sert le produit', Boolean(c.usage.trim())],
    ['le poids', !vide(c.poids_kg)],
    ['les dimensions', !vide(c.longueur) && !vide(c.largeur) && !vide(c.hauteur)],
    ['le conditionnement en carton', !vide(c.pieces_par_carton)],
    ['le délai de préparation', !vide(c.delai_preparation)],
    ["l'origine", Boolean(c.origine_type)],
    ['des prix dégressifs', nbPaliers > 0],
    ['une deuxième photo', nbPhotos >= 2],
  ];
  const remplies = recommandees.filter(([, ok]) => ok).length;
  return { pct: Math.min(100, essentielsRemplis * 8 + remplies * 6), aCompleter: recommandees.filter(([, ok]) => !ok).map(([nom]) => nom) };
}

// Défile jusqu'à un élément de la page et lui donne le focus
function allerA(id) {
  const el = document.getElementById(id);
  if (!el) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus?.({ preventScroll: true });
}

const Obligatoire = () => <span className="esp-obligatoire" aria-hidden="true"> *</span>;

// Brouillon dans le stockage de l'appareil (jamais bloquant : si le stockage est refusé, le formulaire marche sans)
const PREFIXE_BROUILLON = 'loohoo:brouillon-produit:';
function lireBrouillon(cle) {
  try { const b = JSON.parse(localStorage.getItem(cle) || 'null'); return b && b.donnees ? b : null; } catch { return null; }
}
function ecrireBrouillon(cle, valeur) {
  try { localStorage.setItem(cle, JSON.stringify(valeur)); return true; } catch { return false; }
}
function effacerBrouillon(cle) {
  try { localStorage.removeItem(cle); } catch { /* stockage indisponible : rien à effacer */ }
}
const heureFr = (ts) => { const d = new Date(ts); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, '0')}`; };

export default function ProduitFormulaire() {
  const { id } = useParams(); // absent = création
  const navigate = useNavigate();
  const { sous } = useCategories(); // sous-catégories par catégorie (hook : avant tout retour anticipé)
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [produit, setProduit] = useState(null);
  const [champs, setChamps] = useState({
    nom: '', categorie: '', sous_categorie: '', description: '', prix_gros: '', prix_unitaire: '', moq: '1',
    disponibilite: '', // 'stock' | 'commande' | '' (pas encore choisi)
    stock: '', unite: 'pièce', sku: '', poids_kg: '', longueur: '', largeur: '', hauteur: '', actif: true,
    usage: '', pieces_par_carton: '', poids_carton_kg: '', origine_type: '', origine_pays: '', delai_preparation: '',
    matiere: '', marque: '', modele: '', variantes: '', capacite_mensuelle: '', personnalisable: false,
    echantillon_disponible: false, prix_echantillon: '',
  });
  const [tags, setTags] = useState([]);
  const [paliers, setPaliers] = useState([]); // { min, prix } saisis en texte
  const [saisieTag, setSaisieTag] = useState('');
  const [photos, setPhotos] = useState([]); // { id?, url }
  const [videoUrl, setVideoUrl] = useState(null);
  const [nouvelleVideo, setNouvelleVideo] = useState(null); // fichier choisi, envoyé à l'enregistrement
  const [survol, setSurvol] = useState(false);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [detailsOuverts, setDetailsOuverts] = useState(false);
  const [completerOuvert, setCompleterOuvert] = useState(false); // « Compléter ma fiche » : fermé à la création, ouvert en modification
  const [tentative, setTentative] = useState(false); // « Publier » a déjà été cliqué : on montre les champs manquants
  const [paliersConfirmes, setPaliersConfirmes] = useState(''); // avertissements de prix déjà confirmés par le fournisseur
  const [brouillonTrouve, setBrouillonTrouve] = useState(null); // { enregistre, donnees } : un brouillon attend la décision du fournisseur
  const [heureBrouillon, setHeureBrouillon] = useState(null);
  const etatInitial = useRef(null); // le formulaire tel qu'il était à l'ouverture : un brouillon n'est écrit que s'il en diffère
  const termine = useRef(false); // publication réussie : plus de brouillon
  const champFichier = useRef(null);
  const champCamera = useRef(null);
  // Garde anti double-soumission SYNCHRONE : un useState ne bloque pas deux clics
  // dans le meme tick (bug mesure le 22/11 : doublon « Mini fer a repasser »).
  const soumission = useRef(false);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then(async (p) => {
      setProfil(p);
      if (!p) return;
      if (!id) {
        // Valeurs automatiques : la catégorie et l'origine viennent du profil, l'unité par défaut est la pièce
        setChamps((c) => ({
          ...c, categorie: p.categorie || '', unite: 'pièce',
          ...(p.origine === 'local' ? { origine_type: 'local' } : p.pays_provenance ? { origine_type: 'importe', origine_pays: p.pays_provenance } : {}),
        }));
        return;
      }
      const existant = (p.produit || []).find((x) => x.id === id);
      if (!existant) { setProduit(false); return; }
      setProduit(existant);
      setCompleterOuvert(true);
      const paysLocal = infosPays(p.pays_code || 'CI')?.nom;
      const origine = existant.origine_produit || '';
      setChamps({
        nom: existant.nom || '', categorie: existant.categorie || '', sous_categorie: existant.sous_categorie || '',
        description: existant.description || '', prix_gros: existant.prix_gros_fcfa ?? '', prix_unitaire: existant.prix_unitaire_fcfa ?? '',
        moq: existant.moq ?? '1',
        disponibilite: existant.sur_commande ? 'commande' : existant.stock_disponible != null ? 'stock' : '',
        stock: existant.stock_disponible ?? '', unite: existant.unite || 'pièce', sku: existant.sku || '',
        poids_kg: existant.poids_grammes != null ? String(existant.poids_grammes / 1000) : '',
        longueur: existant.longueur_cm ?? '', largeur: existant.largeur_cm ?? '', hauteur: existant.hauteur_cm ?? '',
        actif: existant.actif,
        usage: existant.usage || '', pieces_par_carton: existant.pieces_par_carton ?? '', poids_carton_kg: existant.poids_carton_kg ?? '',
        origine_type: !origine ? '' : origine === paysLocal ? 'local' : 'importe', origine_pays: origine && origine !== paysLocal ? origine : '',
        delai_preparation: existant.delai_preparation_jours ?? '',
        matiere: existant.matiere || '', marque: existant.marque || '', modele: existant.modele || '', variantes: existant.variantes || '',
        capacite_mensuelle: existant.capacite_mensuelle ?? '', personnalisable: existant.personnalisable === true,
        echantillon_disponible: existant.echantillon_disponible === true, prix_echantillon: existant.prix_echantillon ?? '',
      });
      setDetailsOuverts(Boolean(existant.matiere || existant.marque || existant.modele || existant.variantes || existant.capacite_mensuelle
        || existant.personnalisable || existant.echantillon_disponible));
      setTags(existant.tags || []);
      setPaliers((existant.paliers || []).map((x) => ({ min: String(x.min), prix: String(x.prix) })));
      setVideoUrl(existant.video_url || null);
      setPhotos(await recupererGaleriePhotosProduit(id));
    }).catch((err) => setErreur(err.message));
  }, [session, id, navigate]);

  // Brouillon enregistré sur l'appareil (rapport du 22 nov 2026, F6) : une page actualisée, un téléphone en veille ou une connexion
  // coupée ne font plus perdre la saisie. Un brouillon par produit (ou « nouveau »), effacé après une publication réussie.
  const cleBrouillon = profil ? (id ? (produit ? `${PREFIXE_BROUILLON}${profil.id}:${id}` : null) : `${PREFIXE_BROUILLON}${profil.id}:nouveau`) : null;
  const instantane = JSON.stringify({ champs, tags, paliers, photos: id ? [] : photos.map((p) => p.url) });
  useEffect(() => { // à l'ouverture : photographie du formulaire de départ, et recherche d'un brouillon à proposer
    if (!cleBrouillon || etatInitial.current !== null) return;
    etatInitial.current = instantane;
    const trouve = lireBrouillon(cleBrouillon);
    if (trouve) setBrouillonTrouve(trouve);
  }, [cleBrouillon]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // une seconde après la dernière frappe, sans bouton à toucher
    if (!cleBrouillon || etatInitial.current === null || brouillonTrouve || termine.current || instantane === etatInitial.current) return undefined;
    const minuterie = setTimeout(() => {
      const maintenant = Date.now();
      if (ecrireBrouillon(cleBrouillon, { enregistre: maintenant, donnees: JSON.parse(instantane) })) setHeureBrouillon(maintenant);
    }, 1000);
    return () => clearTimeout(minuterie);
  }, [instantane, cleBrouillon, brouillonTrouve]);

  if (session === undefined || profil === undefined) return <div className="loo-squelette" style={{ height: '260px' }} />;
  if (!profil) return <p>Aucun profil fournisseur associé à ce compte.</p>;
  if (id && produit === false) {
    return (
      <>
        <p>Ce produit n'existe pas ou ne vous appartient pas.</p>
        <Link to="/produits" className="btn btn-outline">Retour à mes produits</Link>
      </>
    );
  }

  const maj = (cle) => (e) => setChamps((c) => ({ ...c, [cle]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const sousCategories = sous[champs.categorie] || [];
  const paysLocal = infosPays(profil.pays_code || 'CI')?.nom || "Côte d'Ivoire";
  const texteControle = `${champs.nom} ${champs.description} ${tags.join(' ')} ${champs.usage}`;
  const coordonnees = contientCoordonnees(`${texteControle} ${champs.sku}`);
  const promesses = promessesInterdites(texteControle);
  const unite = champs.unite || 'pièce';
  const surCommande = champs.disponibilite === 'commande';
  // Champs manquants : mis à jour pendant la saisie une fois « Publier » cliqué, ils disparaissent dès que le champ est rempli
  const listeManquants = tentative ? champsManquants(champs, photos.length) : [];
  const manquants = Object.fromEntries(listeManquants.map((m) => [m.id, m.message]));
  const classe = (...ids) => `champ${ids.some((i) => manquants[i]) ? ' champ-erreur' : ''}`;
  const signaturePaliers = controlerPaliers(paliers, champs.moq, champs.prix_gros, champs.disponibilite === 'stock' ? champs.stock : '').avertissements.join('|');
  const { pct: pourcentFiche, aCompleter } = completude(champs, photos.length, paliers.length);
  // Erreur affichée en haut de page : on y remonte pour qu'elle soit vue
  function echouer(message, cible) {
    setErreur(message);
    if (cible) allerA(cible); else window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function ajouterTag(brut) {
    const t = brut.trim().replace(/,$/, '').trim();
    if (t && !tags.some((x) => x.toLowerCase() === t.toLowerCase()) && tags.length < 15) setTags([...tags, t]);
    setSaisieTag('');
  }
  function toucheTag(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); ajouterTag(saisieTag); }
    else if (e.key === 'Backspace' && !saisieTag && tags.length) setTags(tags.slice(0, -1));
  }

  async function recevoirFichiers(liste) {
    const fichiers = [...liste].filter((f) => f.type.startsWith('image/'));
    if (fichiers.length === 0) return;
    const place = MAX_PHOTOS - photos.length;
    if (place <= 0) { setErreur(`Maximum ${MAX_PHOTOS} photos par produit.`); return; }
    setEnvoiPhoto(true);
    setErreur('');
    try {
      let ordre = photos.length;
      for (const fichier of fichiers.slice(0, place)) {
        if (fichier.size > TAILLE_MAX_IMAGE) throw new Error(`« ${fichier.name} » dépasse 10 Mo.`);
        const resultat = await televerserMedia(profil.id, fichier);
        await ajouterMedia(profil.id, resultat, fichier.name); // elle rejoint aussi la médiathèque, réutilisable
        const nouvelle = { url: resultat.url };
        if (produit) { // produit existant : rattachée tout de suite
          await ajouterPhotoProduit(produit.id, resultat.url, ordre);
        }
        setPhotos((p) => [...p, nouvelle]);
        ordre += 1;
      }
      if (produit) setPhotos(await recupererGaleriePhotosProduit(produit.id));
      if (fichiers.length > place) setErreur(`Seules ${place} photo(s) ont été ajoutées (maximum ${MAX_PHOTOS}).`);
    } catch (err) {
      setErreur(err.message || "L'envoi de la photo a échoué.");
    } finally {
      setEnvoiPhoto(false);
    }
  }

  async function retirerPhoto(photo) {
    setErreur('');
    try {
      // On détache seulement : le fichier reste dans la médiathèque
      if (photo.id) await supprimerPhotoProduit(photo.id);
      setPhotos((p) => p.filter((x) => x !== photo));
    } catch (err) {
      setErreur(err.message);
    }
  }

  function choisirVideo(e) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (!fichier.type.startsWith('video/')) { setErreur('Le fichier doit être une vidéo.'); return; }
    if (fichier.size > 50 * 1024 * 1024) { setErreur('Vidéo trop volumineuse (50 Mo maximum).'); return; }
    setErreur('');
    setNouvelleVideo(fichier);
  }

  async function enregistrer(e) {
    e.preventDefault();
    setErreur('');
    setTentative(true);
    // Champs obligatoires : bandeau en haut, défilement jusqu'au premier champ manquant (le navigateur ne le montrait pas)
    const manquantsMaintenant = champsManquants(champs, photos.length);
    if (manquantsMaintenant.length) { allerA(manquantsMaintenant[0].id); return; }
    if (Number(champs.prix_gros) < 0) { echouer('Le prix de gros ne peut pas être négatif.', 'prix_gros'); return; }
    if (coordonnees || promesses.length) {
      if (!completerOuvert) setCompleterOuvert(true);
      echouer('Retirez du texte les coordonnées et les promesses signalées en orange pour publier le produit.', champs.description.trim() && !contientCoordonnees(champs.nom) ? 'description' : 'nom');
      return;
    }
    const verif = normaliserPaliers(paliers, champs.moq, champs.prix_gros);
    if (verif.erreur) { echouer(verif.erreur, 'bloc-paliers'); return; }
    if (signaturePaliers && paliersConfirmes !== signaturePaliers) {
      echouer('Vérifiez les prix signalés en orange, puis confirmez-les pour publier.', 'bloc-paliers');
      return;
    }
    if (soumission.current) return; // 2e clic : rien ne part
    soumission.current = true;
    setEnregistrement(true);
    let produitCree = null;
    try {
      const donnees = {
        nom: champs.nom.trim(),
        categorie: champs.categorie || null,
        sous_categorie: champs.sous_categorie || null,
        description: champs.description.trim() || null,
        tags,
        prix_gros_fcfa: Number(champs.prix_gros),
        prix_unitaire_fcfa: versNombre(champs.prix_unitaire),
        moq: Number(champs.moq) || 1,
        // Disponibilité : « en stock » (quantité) ou « sur commande » (délai en jours)
        stock_disponible: champs.disponibilite === 'stock' ? versNombre(champs.stock) : null,
        sur_commande: champs.disponibilite === 'commande',
        unite,
        sku: champs.sku.trim() || null,
        poids_grammes: champs.poids_kg === '' ? null : Math.round(versNombre(champs.poids_kg) * 1000),
        longueur_cm: versNombre(champs.longueur),
        largeur_cm: versNombre(champs.largeur),
        hauteur_cm: versNombre(champs.hauteur),
        actif: champs.actif,
        // Caractéristiques (migration 0027), toutes facultatives
        usage: texteOuNull(champs.usage),
        pieces_par_carton: versNombre(champs.pieces_par_carton),
        poids_carton_kg: versNombre(champs.poids_carton_kg),
        origine_produit: champs.origine_type === 'local' ? paysLocal : champs.origine_type === 'importe' ? texteOuNull(champs.origine_pays) : null,
        delai_preparation_jours: versNombre(champs.delai_preparation),
        matiere: texteOuNull(champs.matiere),
        marque: texteOuNull(champs.marque),
        modele: texteOuNull(champs.modele),
        variantes: texteOuNull(champs.variantes),
        capacite_mensuelle: versNombre(champs.capacite_mensuelle),
        personnalisable: champs.personnalisable,
        echantillon_disponible: champs.echantillon_disponible,
        prix_echantillon: champs.echantillon_disponible ? versNombre(champs.prix_echantillon) : null,
      };
      // Envoyé seulement s'il y en a (ou s'il y en avait) : un produit sans palier s'enregistre même avant la migration 0017
      if (verif.paliers.length > 0 || produit?.paliers?.length > 0) donnees.paliers = verif.paliers;
      if (nouvelleVideo) {
        if (videoUrl) await supprimerVideoStockage(videoUrl).catch(() => {});
        donnees.video_url = await televerserVideo(profil.id, nouvelleVideo);
      }
      if (produit) {
        await modifierProduit(produit.id, donnees);
      } else {
        produitCree = await ajouterProduit(profil.id, donnees);
        for (let i = 0; i < photos.length; i += 1) await ajouterPhotoProduit(produitCree, photos[i].url, i);
      }
      termine.current = true;
      effacerBrouillon(cleBrouillon);
      soumission.current = false;
      navigate('/produits');
    } catch (err) {
      // On ne laisse JAMAIS un produit sans ses photos : c'est ce demi-enregistrement
      // qui affichait une erreur, poussait le fournisseur a recliquer et creait un
      // doublon (rapport du 22/11, F1).
      console.error('produit/enregistrer', err);
      let nettoye = true;
      if (produitCree) {
        try { await supprimerProduit(produitCree); } catch { nettoye = false; }
      }
      setErreur(nettoye
        ? "La publication n'a pas abouti, rien n'a été enregistré. Vérifiez votre connexion et réessayez."
        : "La fiche a été créée sans ses photos. Ouvrez-la depuis « Mes produits » pour les ajouter.");
      soumission.current = false;
      setEnregistrement(false);
    }
  }

  function reprendreBrouillon() {
    const d = brouillonTrouve.donnees;
    setChamps((c) => ({ ...c, ...d.champs }));
    setTags(d.tags || []);
    setPaliers(d.paliers || []);
    if (!id && Array.isArray(d.photos)) setPhotos(d.photos.map((url) => ({ url }))); // photos déjà envoyées : gardées avec le brouillon
    const c = d.champs || {};
    if (id || (d.paliers || []).length || c.description || c.usage || c.poids_kg || c.pieces_par_carton || c.longueur) setCompleterOuvert(true);
    setBrouillonTrouve(null);
  }
  function effacerLeBrouillon() {
    effacerBrouillon(cleBrouillon);
    setBrouillonTrouve(null);
    setHeureBrouillon(null);
  }

  const statut = produit ? (STATUTS[produit.statut] || STATUTS.en_attente) : null;
  const texteNom = `${champs.nom}`;
  const alerteNom = contientCoordonnees(texteNom) || promessesInterdites(texteNom).length > 0;

  return (
    <form onSubmit={enregistrer} noValidate>
      <div className="esp-fil">
        <Link to="/produits">Mes produits</Link><span>›</span><span>{produit ? 'Modifier' : 'Ajouter un produit'}</span>
      </div>
      <h1 className="esp-titre-page">{produit ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</h1>

      {brouillonTrouve && (
        <div className="esp-bandeau-brouillon" role="status">
          <span>
            {produit
              ? 'Vous avez des modifications non enregistrées sur ce produit'
              : `Vous avez un produit en cours${brouillonTrouve.donnees.champs?.nom?.trim() ? ` : ${brouillonTrouve.donnees.champs.nom.trim()}` : ''}`}
            {brouillonTrouve.enregistre ? ` (brouillon de ${heureFr(brouillonTrouve.enregistre)})` : ''}.
          </span>
          <span style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn btn-primary" style={{ padding: '0.45em 1em', fontSize: '0.85rem' }} onClick={reprendreBrouillon}>Reprendre</button>
            <button type="button" className="btn btn-outline" style={{ padding: '0.45em 1em', fontSize: '0.85rem' }} onClick={effacerLeBrouillon}>Effacer</button>
          </span>
        </div>
      )}
      {heureBrouillon && !brouillonTrouve && <p className="esp-aide" aria-live="polite" style={{ margin: '-0.4rem 0 0.8rem' }}>Brouillon enregistré à {heureFr(heureBrouillon)}</p>}

      {listeManquants.length > 0 && (
        <div className="esp-bandeau-manquants" role="alert">
          {listeManquants.length} information{listeManquants.length > 1 ? 's' : ''} à compléter : {listeManquants.map((m) => m.libelle).join(', ')}.
        </div>
      )}
      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, margin: '0 0 1rem' }}>{erreur}</p>}

      <div className="esp-formulaire">
        <div style={{ display: 'grid', gap: '1rem' }}>
          {/* L'essentiel : les 5 champs qui permettent de publier en moins d'une minute depuis un téléphone */}
          <div className="esp-carte">
            <h2 className="esp-carte-titre"><span>L'essentiel</span><span style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.6 }}>5 informations pour publier</span></h2>

            <div className="esp-champ-bloc" id="zone-photos" tabIndex={-1} style={{ outline: 'none' }}>
              <label>Photos du produit<Obligatoire /><span className="esp-aide" style={{ marginLeft: '0.5rem', display: 'inline' }}>{photos.length}/{MAX_PHOTOS}</span></label>
              <ConsigneImages />
              <div className="esp-actions-photo">
                <button type="button" className="btn btn-primary" onClick={() => champCamera.current?.click()} disabled={photos.length >= MAX_PHOTOS || envoiPhoto}>
                  <Camera size={17} /> Prendre une photo
                </button>
                <button type="button" className="btn btn-outline" onClick={() => champFichier.current?.click()} disabled={photos.length >= MAX_PHOTOS || envoiPhoto}>
                  <IconeImage size={16} /> Choisir dans la galerie
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setSelecteurOuvert(true)} disabled={photos.length >= MAX_PHOTOS}>
                  Ma médiathèque
                </button>
              </div>
              <div
                className={`esp-zone-depot${survol ? ' esp-zone-depot-survol' : ''}${manquants['zone-photos'] ? ' esp-zone-erreur' : ''}`} role="button" tabIndex={0}
                onClick={() => champFichier.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); champFichier.current?.click(); } }}
                onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
                onDragLeave={() => setSurvol(false)}
                onDrop={(e) => { e.preventDefault(); setSurvol(false); recevoirFichiers(e.dataTransfer.files); }}
              >
                <div style={{ color: 'var(--loo-rouge)', fontWeight: 700 }}>
                  {envoiPhoto ? 'Envoi en cours…' : 'Ou glissez vos images ici'}
                </div>
                <div className="esp-aide">JPG, PNG, WEBP (10 Mo max par image, réduites automatiquement)</div>
              </div>
              <input ref={champFichier} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { recevoirFichiers(e.target.files); e.target.value = ''; }} />
              <input ref={champCamera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { recevoirFichiers(e.target.files); e.target.value = ''; }} />
              {photos.length > 0 && (
                <div className="esp-vignettes">
                  {photos.map((p, i) => (
                    <div key={p.id || p.url} className={`esp-vignette${i === 0 ? ' esp-vignette-principale' : ''}`}>
                      <img src={p.url} alt="" />
                      <button type="button" onClick={() => retirerPhoto(p)} aria-label="Retirer cette photo"><X size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              {manquants['zone-photos'] && <p className="esp-erreur-champ" role="alert">{manquants['zone-photos']}</p>}
            </div>

            <div className="esp-champ-bloc">
              <label htmlFor="nom">Nom du produit<Obligatoire /></label>
              <input id="nom" className={classe('nom')} required maxLength={150} placeholder="Ex. : Pagne wax 6 yards" value={champs.nom} onChange={maj('nom')} />
              {manquants.nom && <p className="esp-erreur-champ" role="alert">{manquants.nom}</p>}
              {alerteNom && <p role="alert" className="esp-aide" style={{ color: '#B8650A', opacity: 1, fontWeight: 600 }}>Le nom ne doit contenir ni numéro, e-mail, lien ni promesse de santé ou de résultat.</p>}
            </div>

            <div className="esp-champ-bloc">
              <label htmlFor="prix_gros">Prix de gros<Obligatoire /></label>
              <div className="prix-par-unite">
                <input id="prix_gros" className={classe('prix_gros')} type="number" inputMode="numeric" min="0" required placeholder="0" value={champs.prix_gros} onChange={maj('prix_gros')} />
                <span>F CFA par</span>
                <select id="unite" className="champ" aria-label="Unité de vente" value={unite} onChange={maj('unite')}>
                  {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {manquants.prix_gros ? <p className="esp-erreur-champ" role="alert">{manquants.prix_gros}</p> : <p className="esp-aide">Le prix pour une commande en gros. 6 000 F la pièce ou 6 000 F le carton, ce n'est pas le même produit.</p>}
            </div>

            <div className="esp-champ-bloc">
              <label htmlFor="moq">Quantité minimale de commande<Obligatoire /></label>
              <div className="prix-par-unite">
                <input id="moq" className={classe('moq')} type="number" inputMode="numeric" min="1" required value={champs.moq} onChange={maj('moq')} />
                <span>{uniteAccordee(Number(champs.moq) || 1, unite)}</span>
              </div>
              {manquants.moq ? <p className="esp-erreur-champ" role="alert">{manquants.moq}</p> : <p className="esp-aide">Le minimum que l'acheteur doit commander.</p>}
            </div>

            <div className="esp-champ-bloc" id="disponibilite" tabIndex={-1} role="radiogroup" aria-labelledby="dispo-etiquette" style={{ outline: 'none', marginBottom: 0 }}>
              <label id="dispo-etiquette">Disponibilité<Obligatoire /></label>
              <div className="dispo-choix">
                <button type="button" role="radio" aria-checked={champs.disponibilite === 'stock'} className={`dispo-bouton${champs.disponibilite === 'stock' ? ' dispo-actif' : ''}`}
                  onClick={() => setChamps((c) => ({ ...c, disponibilite: 'stock' }))}>En stock</button>
                <button type="button" role="radio" aria-checked={surCommande} className={`dispo-bouton${surCommande ? ' dispo-actif' : ''}`}
                  onClick={() => setChamps((c) => ({ ...c, disponibilite: 'commande' }))}>Sur commande</button>
              </div>
              {champs.disponibilite === 'stock' && (
                <div className="prix-par-unite" style={{ marginTop: '0.5rem' }}>
                  <input id="stock" className={classe('stock')} type="number" inputMode="numeric" min="0" aria-label="Quantité en stock" placeholder="Quantité" value={champs.stock} onChange={maj('stock')} />
                  <span>{uniteAccordee(2, unite)} en stock</span>
                </div>
              )}
              {surCommande && (
                <div className="prix-par-unite" style={{ marginTop: '0.5rem' }}>
                  <input id="delai" className={classe('delai')} type="number" inputMode="numeric" min="0" aria-label="Délai en jours" placeholder="Délai" value={champs.delai_preparation} onChange={maj('delai_preparation')} />
                  <span>jours pour préparer la commande</span>
                </div>
              )}
              {(manquants.disponibilite || manquants.stock || manquants.delai) && <p className="esp-erreur-champ" role="alert">{manquants.disponibilite || manquants.stock || manquants.delai}</p>}
            </div>
          </div>

          {/* Compléter ma fiche : recommandé, jamais bloquant */}
          <div className="esp-carte esp-completer">
            <button type="button" className="esp-completer-entete" aria-expanded={completerOuvert} onClick={() => setCompleterOuvert((o) => !o)}>
              <span>
                <strong>Compléter ma fiche</strong>
                <span className="esp-aide" style={{ display: 'block' }}>Facultatif, mais une fiche détaillée reçoit plus de demandes.</span>
              </span>
              <span className="esp-completude">{pourcentFiche} %</span>
            </button>
            <div className="esp-progression" role="progressbar" aria-valuenow={pourcentFiche} aria-valuemin={0} aria-valuemax={100} aria-label="Fiche complète">
              <div style={{ width: `${pourcentFiche}%` }} />
            </div>
            <p className="esp-aide" style={{ marginTop: '0.5rem' }}>
              {aCompleter.length === 0
                ? 'Votre fiche est complète.'
                : `Fiche complète à ${pourcentFiche} %. Ajoutez ${aCompleter.slice(0, 2).join(' et ')} pour recevoir plus de demandes.`}
            </p>
          </div>

          {completerOuvert && (
            <>
              <div className="esp-carte">
                <h2 className="esp-carte-titre">Description et catégorie</h2>

                <div className="esp-ligne-champs">
                  <div className="esp-champ-bloc">
                    <label htmlFor="categorie">Catégorie</label>
                    <SelectCategorie id="categorie" value={champs.categorie} valeurActuelle={champs.categorie} vide="Sélectionnez une catégorie"
                      onChange={(e) => setChamps((c) => ({ ...c, categorie: e.target.value, sous_categorie: '' }))} />
                  </div>
                  <div className="esp-champ-bloc">
                    <label htmlFor="sous_categorie">Sous-catégorie</label>
                    <select id="sous_categorie" className="champ" value={champs.sous_categorie} onChange={maj('sous_categorie')} disabled={!champs.categorie}>
                      <option value="">{champs.categorie ? 'Sélectionnez une sous-catégorie' : "Choisissez d'abord une catégorie"}</option>
                      {champs.sous_categorie && !sousCategories.includes(champs.sous_categorie) && <option value={champs.sous_categorie}>{champs.sous_categorie}</option>}
                      {sousCategories.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="esp-champ-bloc">
                  <label htmlFor="description">Description</label>
                  <textarea id="description" className="champ" rows={4} maxLength={1000} placeholder="Décrivez votre produit : composition, finitions, conseils d'utilisation…" value={champs.description} onChange={maj('description')} />
                  <p className="esp-aide" style={{ textAlign: 'right' }}>{champs.description.length}/1000</p>
                  {(coordonnees || promesses.length > 0) && (
                    <div role="alert" className="esp-aide" style={{ color: '#B8650A', opacity: 1, fontWeight: 600 }}>
                      {coordonnees && <p style={{ margin: '0 0 0.2rem' }}>Retirez les numéros, e-mails et liens : les acheteurs vous contactent par LOOHOO.</p>}
                      {promesses.length > 0 && <p style={{ margin: 0 }}>Votre texte contient {promesses.join(', ')}. Ces promesses ne sont pas autorisées : décrivez le produit tel qu'il est.</p>}
                    </div>
                  )}
                </div>

                <div className="esp-champ-bloc">
                  <label htmlFor="prix_unitaire">Prix à l'unité (facultatif)</label>
                  <input id="prix_unitaire" className="champ" type="number" min="0" placeholder="0" value={champs.prix_unitaire} onChange={maj('prix_unitaire')} style={{ maxWidth: '16rem' }} />
                  <p className="esp-aide">Pour une petite quantité, si vous en vendez.</p>
                </div>

                <EditeurPaliers paliers={paliers} onChange={setPaliers} moq={champs.moq} prixBase={champs.prix_gros}
                  unite={unite} stock={champs.disponibilite === 'stock' ? champs.stock : ''} confirmation={paliersConfirmes} onConfirmer={setPaliersConfirmes} />
              </div>

              <div className="esp-carte">
                <h2 className="esp-carte-titre">Caractéristiques</h2>
                <p className="esp-aide" style={{ margin: '-0.3rem 0 0.9rem' }}>Les acheteurs comparent ces informations avant de demander un devis. Quand l'une manque, ils doivent vous la demander : mieux vaut la renseigner.</p>

                <div className="esp-champ-bloc">
                  <label htmlFor="usage">À quoi sert ce produit ?</label>
                  <input id="usage" className="champ" maxLength={200} placeholder="Ex. : tenue de cérémonie, revente en boutique, emballage alimentaire…" value={champs.usage} onChange={maj('usage')} />
                </div>

                <div className="esp-ligne-champs">
                  <div className="esp-champ-bloc">
                    <label htmlFor="poids">Poids d'une unité (kg)</label>
                    <input id="poids" className="champ" type="number" min="0" step="0.001" placeholder="0,5" value={champs.poids_kg} onChange={maj('poids_kg')} />
                  </div>
                  <div className="esp-champ-bloc">
                    <label id="dimensions">Dimensions d'une unité (cm)</label>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} role="group" aria-labelledby="dimensions">
                      <input id="longueur" className="champ" type="number" min="0" step="0.1" placeholder="L" aria-label="Longueur (cm)" value={champs.longueur} onChange={maj('longueur')} />×
                      <input id="largeur" className="champ" type="number" min="0" step="0.1" placeholder="l" aria-label="Largeur (cm)" value={champs.largeur} onChange={maj('largeur')} />×
                      <input id="hauteur" className="champ" type="number" min="0" step="0.1" placeholder="H" aria-label="Hauteur (cm)" value={champs.hauteur} onChange={maj('hauteur')} />
                    </div>
                  </div>
                </div>

                <div className="esp-ligne-champs">
                  <div className="esp-champ-bloc">
                    <label htmlFor="pieces_par_carton">Pièces par carton (ou par colis)</label>
                    <input id="pieces_par_carton" className="champ" type="number" min="1" placeholder="Ex. : 24" value={champs.pieces_par_carton} onChange={maj('pieces_par_carton')} />
                  </div>
                  <div className="esp-champ-bloc">
                    <label htmlFor="poids_carton">Poids du carton plein (kg)</label>
                    <input id="poids_carton" className="champ" type="number" min="0.001" step="0.001" placeholder="Ex. : 12" value={champs.poids_carton_kg} onChange={maj('poids_carton_kg')} />
                  </div>
                  {!surCommande && (
                    <div className="esp-champ-bloc">
                      <label htmlFor="delai">Délai de préparation (jours)</label>
                      <input id="delai" className="champ" type="number" min="0" placeholder="Ex. : 2" value={champs.delai_preparation} onChange={maj('delai_preparation')} />
                      <p className="esp-aide">0 si la commande est prête tout de suite.</p>
                    </div>
                  )}
                </div>

                <fieldset className="esp-champ-bloc" style={{ border: 0, padding: 0, margin: '0 0 0.9rem' }}>
                  <legend style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>Origine du produit</legend>
                  <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                    <label style={styles.choix}><input id="origine-local" type="radio" name="origine" value="local" checked={champs.origine_type === 'local'} onChange={maj('origine_type')} /> Fabriqué en {paysLocal}</label>
                    <label style={styles.choix}>
                      <input type="radio" name="origine" value="importe" checked={champs.origine_type === 'importe'}
                        onChange={() => setChamps((c) => ({ ...c, origine_type: 'importe', origine_pays: c.origine_pays || 'Chine' }))} /> Importé
                    </label>
                  </div>
                  {champs.origine_type === 'importe' && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <label htmlFor="origine_pays" style={{ fontSize: '0.84rem' }}>Pays de fabrication</label>
                      <input id="origine_pays" className="champ" list="pays-import" maxLength={60} placeholder="Ex. : Chine" value={champs.origine_pays} onChange={maj('origine_pays')} />
                      <p className="esp-aide">« Chine » est proposé par défaut : changez-le si le produit vient d'ailleurs.</p>
                      <datalist id="pays-import">{PAYS_IMPORT.map((p) => <option key={p} value={p} />)}</datalist>
                    </div>
                  )}
                </fieldset>

                <details className="esp-details" open={detailsOuverts} onToggle={(e) => setDetailsOuverts(e.currentTarget.open)}>
                  <summary>Détails facultatifs : matière, marque, variantes, échantillon…</summary>
                  <div className="esp-ligne-champs" style={{ marginTop: '0.8rem' }}>
                    <div className="esp-champ-bloc">
                      <label htmlFor="matiere">Matière (facultatif)</label>
                      <input id="matiere" className="champ" maxLength={100} placeholder="Ex. : coton 100 %" value={champs.matiere} onChange={maj('matiere')} />
                    </div>
                    <div className="esp-champ-bloc">
                      <label htmlFor="marque">Marque (facultatif)</label>
                      <input id="marque" className="champ" maxLength={80} value={champs.marque} onChange={maj('marque')} />
                    </div>
                    <div className="esp-champ-bloc">
                      <label htmlFor="modele">Modèle (facultatif)</label>
                      <input id="modele" className="champ" maxLength={80} value={champs.modele} onChange={maj('modele')} />
                    </div>
                  </div>
                  <div className="esp-ligne-champs">
                    <div className="esp-champ-bloc">
                      <label htmlFor="variantes">Couleurs, tailles disponibles (facultatif)</label>
                      <input id="variantes" className="champ" maxLength={200} placeholder="Ex. : rouge, bleu, noir · tailles S à XL" value={champs.variantes} onChange={maj('variantes')} />
                    </div>
                    <div className="esp-champ-bloc">
                      <label htmlFor="capacite">Capacité de production par mois (facultatif)</label>
                      <input id="capacite" className="champ" type="number" min="1" placeholder="Ex. : 5000" value={champs.capacite_mensuelle} onChange={maj('capacite_mensuelle')} />
                    </div>
                  </div>
                  <label style={{ ...styles.choix, marginBottom: '0.6rem' }}>
                    <input type="checkbox" checked={champs.personnalisable} onChange={maj('personnalisable')} /> Personnalisation possible (logo, couleur, emballage)
                  </label>
                  <label style={styles.choix}>
                    <input type="checkbox" checked={champs.echantillon_disponible} onChange={maj('echantillon_disponible')} /> Échantillon disponible avant une grosse commande
                  </label>
                  {champs.echantillon_disponible && (
                    <div className="esp-champ-bloc" style={{ marginTop: '0.5rem', maxWidth: '16rem' }}>
                      <label htmlFor="prix_echantillon">Prix de l'échantillon (F CFA)</label>
                      <input id="prix_echantillon" className="champ" type="number" min="0" placeholder="0 si gratuit" value={champs.prix_echantillon} onChange={maj('prix_echantillon')} />
                    </div>
                  )}
                </details>
              </div>

              <div className="esp-carte">
                <h2 className="esp-carte-titre">Vidéo (facultatif)</h2>
                {(nouvelleVideo || videoUrl) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                    <Video size={16} /> {nouvelleVideo ? nouvelleVideo.name : 'Vidéo enregistrée'}
                    <button type="button" className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.3em 0.8em' }} onClick={() => { setNouvelleVideo(null); setVideoUrl(null); }}>Retirer</button>
                  </div>
                ) : (
                  <label className="btn btn-outline" style={{ cursor: 'pointer', fontSize: '0.82rem', padding: '0.5em 1em' }}>
                    <Video size={15} /> Ajouter une vidéo (50 Mo max)
                    <input type="file" accept="video/*" hidden onChange={choisirVideo} />
                  </label>
                )}
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
          <div className="esp-carte">
            <h2 className="esp-carte-titre">Statut et visibilité</h2>
            <label className="esp-interrupteur">
              <span>
                <strong style={{ display: 'block', fontSize: '0.92rem' }}>Produit actif</strong>
                <span className="esp-aide">Désactivez-le pour le masquer aux acheteurs sans le supprimer.</span>
              </span>
              <input type="checkbox" checked={champs.actif} onChange={maj('actif')} />
              <span className="esp-interrupteur-piste" aria-hidden="true" />
            </label>
            <div style={{ marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--loo-papier-ombre)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.4rem' }}>Publication</div>
              {statut ? (
                <>
                  <span className={`esp-puce ${statut.classe}`}>{statut.texte}</span>
                  <p className="esp-aide" style={{ marginTop: '0.4rem' }}>{statut.detail}</p>
                  {produit.statut === 'rejete' && produit.motif_rejet && <p className="esp-aide" style={{ opacity: 0.9 }}>Motif : {produit.motif_rejet}</p>}
                </>
              ) : (
                <p className="esp-aide">Votre produit est publié dès l'enregistrement. Notre équipe contrôle ensuite les produits en ligne.</p>
              )}
            </div>
          </div>

          {completerOuvert && (
            <>
              <div className="esp-carte">
                <h2 className="esp-carte-titre">Certificats (facultatif)</h2>
                <CertificatsProduit grossisteId={profil.id} produitId={produit ? produit.id : null} />
              </div>

              <div className="esp-carte">
                <h2 className="esp-carte-titre">Référence et mots-clés</h2>
                <div className="esp-champ-bloc">
                  <label htmlFor="sku">Référence (facultatif)</label>
                  <input id="sku" className="champ" maxLength={60} placeholder="Ex. : PAG-WAX-6Y" value={champs.sku} onChange={maj('sku')} />
                </div>
                <div className="esp-champ-bloc" style={{ marginBottom: 0 }}>
                  <label htmlFor="tags">Mots-clés</label>
                  <div className="esp-pastilles-saisie">
                    {tags.map((t) => (
                      <span key={t} className="esp-tag">{t}
                        <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Retirer ${t}`}><X size={13} /></button>
                      </span>
                    ))}
                    <input id="tags" value={saisieTag} onChange={(e) => setSaisieTag(e.target.value)} onKeyDown={toucheTag} onBlur={() => saisieTag && ajouterTag(saisieTag)} placeholder={tags.length ? '' : 'Ajoutez des mots-clés…'} />
                  </div>
                  <p className="esp-aide">Appuyez sur Entrée ou virgule. Invisibles sur la fiche, ils aident les acheteurs à trouver le produit dans la recherche (ex. « cabas », « accessoire femme »).</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="esp-barre-actions">
        <Link to="/produits" className="btn btn-outline">Annuler</Link>
        <button type="submit" className="btn btn-primary" disabled={enregistrement || envoiPhoto}>
          {enregistrement ? (produit ? 'Enregistrement…' : 'Publication en cours…') : (produit ? 'Enregistrer les modifications' : 'Publier le produit')}
        </button>
      </div>

      {selecteurOuvert && (
        <SelecteurPhoto
          grossisteId={profil.id}
          onClose={() => setSelecteurOuvert(false)}
          onChoisir={async (url) => {
            setSelecteurOuvert(false);
            if (photos.some((p) => p.url === url)) return;
            try {
              if (produit) { await ajouterPhotoProduit(produit.id, url, photos.length); setPhotos(await recupererGaleriePhotosProduit(produit.id)); }
              else setPhotos((p) => [...p, { url }]);
            } catch (err) { setErreur(err.message); }
          }}
        />
      )}
    </form>
  );
}

const styles = {
  choix: { display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', cursor: 'pointer' },
};
