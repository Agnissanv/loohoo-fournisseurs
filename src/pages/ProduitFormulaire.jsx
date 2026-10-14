import React, { useEffect, useRef, useState } from 'react';
import { EditeurPaliers, normaliserPaliers } from '../components/PaliersPrix.jsx';
import ConsigneImages from '../components/ConsigneImages.jsx';
import CertificatsProduit from '../components/CertificatsProduit.jsx';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Image as IconeImage, Video, X } from 'lucide-react';
import SelecteurPhoto from '../components/SelecteurPhoto.jsx';
import SelectCategorie from '../components/SelectCategorie.jsx';
import { useCategories } from '../utils/useCategories.js';
import {
  suivreSession, recupererMonProfil, ajouterProduit, modifierProduit,
  recupererGaleriePhotosProduit, ajouterPhotoProduit, supprimerPhotoProduit, ajouterMedia,
} from '../api/fournisseurs.js';
import { televerserMedia, televerserVideo, supprimerVideoStockage } from '../utils/stockagePhotos.js';
import { contientCoordonnees, promessesInterdites } from '../utils/messagerie.js';
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

export default function ProduitFormulaire() {
  const { id } = useParams(); // absent = création
  const navigate = useNavigate();
  const { sous } = useCategories(); // sous-catégories par catégorie (hook : avant tout retour anticipé)
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [produit, setProduit] = useState(null);
  const [champs, setChamps] = useState({
    nom: '', categorie: '', sous_categorie: '', description: '', prix_gros: '', prix_unitaire: '', moq: '1',
    stock: '', unite: '', sku: '', poids_kg: '', longueur: '', largeur: '', hauteur: '', actif: true,
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
  const champFichier = useRef(null);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then(async (p) => {
      setProfil(p);
      if (!p) return;
      if (!id) { setChamps((c) => ({ ...c, categorie: p.categorie || '' })); return; }
      const existant = (p.produit || []).find((x) => x.id === id);
      if (!existant) { setProduit(false); return; }
      setProduit(existant);
      const paysLocal = infosPays(p.pays_code || 'CI')?.nom;
      const origine = existant.origine_produit || '';
      setChamps({
        nom: existant.nom || '', categorie: existant.categorie || '', sous_categorie: existant.sous_categorie || '',
        description: existant.description || '', prix_gros: existant.prix_gros_fcfa ?? '', prix_unitaire: existant.prix_unitaire_fcfa ?? '',
        moq: existant.moq ?? '1', stock: existant.stock_disponible ?? '', unite: existant.unite || '', sku: existant.sku || '',
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
    if (Number(champs.prix_gros) < 0 || champs.prix_gros === '') { setErreur('Indiquez un prix de gros.'); return; }
    if (coordonnees || promesses.length) { setErreur('Retirez du texte les coordonnées et les promesses signalées en orange pour publier le produit.'); return; }
    if (champs.origine_type === 'importe' && !champs.origine_pays.trim()) { setErreur('Indiquez le pays où le produit est fabriqué.'); return; }
    const verif = normaliserPaliers(paliers, champs.moq, champs.prix_gros);
    if (verif.erreur) { setErreur(verif.erreur); return; }
    setEnregistrement(true);
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
        stock_disponible: versNombre(champs.stock),
        unite: champs.unite || null,
        sku: champs.sku.trim() || null,
        poids_grammes: champs.poids_kg === '' ? null : Math.round(versNombre(champs.poids_kg) * 1000),
        longueur_cm: versNombre(champs.longueur),
        largeur_cm: versNombre(champs.largeur),
        hauteur_cm: versNombre(champs.hauteur),
        actif: champs.actif,
        // Caractéristiques (migration 0027)
        usage: texteOuNull(champs.usage),
        pieces_par_carton: versNombre(champs.pieces_par_carton),
        poids_carton_kg: versNombre(champs.poids_carton_kg),
        origine_produit: champs.origine_type === 'local' ? paysLocal : texteOuNull(champs.origine_pays),
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
        const nouveauId = await ajouterProduit(profil.id, donnees);
        for (let i = 0; i < photos.length; i += 1) await ajouterPhotoProduit(nouveauId, photos[i].url, i);
      }
      navigate('/produits');
    } catch (err) {
      setErreur(`Impossible d'enregistrer le produit : ${err.message}`);
      setEnregistrement(false);
    }
  }

  const statut = produit ? (STATUTS[produit.statut] || STATUTS.en_attente) : null;

  return (
    <form onSubmit={enregistrer}>
      <div className="esp-fil">
        <Link to="/produits">Mes produits</Link><span>›</span><span>{produit ? 'Modifier' : 'Ajouter un produit'}</span>
      </div>
      <h1 className="esp-titre-page">{produit ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</h1>

      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, margin: '0 0 1rem' }}>{erreur}</p>}

      <div className="esp-formulaire">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="esp-carte">
            <h2 className="esp-carte-titre">Informations générales</h2>

            <div className="esp-champ-bloc">
              <label htmlFor="nom">Nom du produit</label>
              <input id="nom" className="champ" required maxLength={150} placeholder="Ex. : Pagne wax 6 yards" value={champs.nom} onChange={maj('nom')} />
            </div>

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

            <div className="esp-ligne-champs">
              <div className="esp-champ-bloc">
                <label htmlFor="prix_gros">Prix de gros (F CFA)</label>
                <input id="prix_gros" className="champ" type="number" min="0" required placeholder="0" value={champs.prix_gros} onChange={maj('prix_gros')} />
                <p className="esp-aide">Le prix par unité pour une commande en gros.</p>
              </div>
              <div className="esp-champ-bloc">
                <label htmlFor="prix_unitaire">Prix à l'unité (facultatif)</label>
                <input id="prix_unitaire" className="champ" type="number" min="0" placeholder="0" value={champs.prix_unitaire} onChange={maj('prix_unitaire')} />
                <p className="esp-aide">Pour une petite quantité, si vous en vendez.</p>
              </div>
              <div className="esp-champ-bloc">
                <label htmlFor="moq">Quantité minimale (MOQ)</label>
                <input id="moq" className="champ" type="number" min="1" required value={champs.moq} onChange={maj('moq')} />
                <p className="esp-aide">Le minimum que l'acheteur doit commander.</p>
              </div>
            </div>

            <EditeurPaliers paliers={paliers} onChange={setPaliers} moq={champs.moq} prixBase={champs.prix_gros} />

            <div className="esp-ligne-champs">
              <div className="esp-champ-bloc">
                <label htmlFor="stock">Stock disponible</label>
                <input id="stock" className="champ" type="number" min="0" placeholder="0" value={champs.stock} onChange={maj('stock')} />
                <p className="esp-aide">Quantité actuellement en stock.</p>
              </div>
              <div className="esp-champ-bloc">
                <label htmlFor="unite">Unité</label>
                <select id="unite" className="champ" value={champs.unite} onChange={maj('unite')}>
                  <option value="">Sélectionnez une unité</option>
                  {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="esp-carte">
            <h2 className="esp-carte-titre">Caractéristiques</h2>
            <p className="esp-aide" style={{ margin: '-0.3rem 0 0.9rem' }}>Les acheteurs comparent ces informations avant de demander un devis. Les champs non marqués « facultatif » sont obligatoires.</p>

            <div className="esp-champ-bloc">
              <label htmlFor="usage">À quoi sert ce produit ?</label>
              <input id="usage" className="champ" required maxLength={200} placeholder="Ex. : tenue de cérémonie, revente en boutique, emballage alimentaire…" value={champs.usage} onChange={maj('usage')} />
            </div>

            <div className="esp-ligne-champs">
              <div className="esp-champ-bloc">
                <label htmlFor="poids">Poids d'une unité (kg)</label>
                <input id="poids" className="champ" type="number" min="0" step="0.001" required placeholder="0,5" value={champs.poids_kg} onChange={maj('poids_kg')} />
              </div>
              <div className="esp-champ-bloc">
                <label id="dimensions">Dimensions d'une unité (cm)</label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} role="group" aria-labelledby="dimensions">
                  <input className="champ" type="number" min="0" step="0.1" required placeholder="L" aria-label="Longueur (cm)" value={champs.longueur} onChange={maj('longueur')} />×
                  <input className="champ" type="number" min="0" step="0.1" required placeholder="l" aria-label="Largeur (cm)" value={champs.largeur} onChange={maj('largeur')} />×
                  <input className="champ" type="number" min="0" step="0.1" required placeholder="H" aria-label="Hauteur (cm)" value={champs.hauteur} onChange={maj('hauteur')} />
                </div>
              </div>
            </div>

            <div className="esp-ligne-champs">
              <div className="esp-champ-bloc">
                <label htmlFor="pieces_par_carton">Pièces par carton (ou par colis)</label>
                <input id="pieces_par_carton" className="champ" type="number" min="1" required placeholder="Ex. : 24" value={champs.pieces_par_carton} onChange={maj('pieces_par_carton')} />
              </div>
              <div className="esp-champ-bloc">
                <label htmlFor="poids_carton">Poids du carton plein (kg)</label>
                <input id="poids_carton" className="champ" type="number" min="0.001" step="0.001" required placeholder="Ex. : 12" value={champs.poids_carton_kg} onChange={maj('poids_carton_kg')} />
              </div>
              <div className="esp-champ-bloc">
                <label htmlFor="delai">Délai de préparation (jours)</label>
                <input id="delai" className="champ" type="number" min="0" required placeholder="Ex. : 2" value={champs.delai_preparation} onChange={maj('delai_preparation')} />
                <p className="esp-aide">0 si la commande est prête tout de suite.</p>
              </div>
            </div>

            <fieldset className="esp-champ-bloc" style={{ border: 0, padding: 0, margin: '0 0 0.9rem' }}>
              <legend style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.4rem' }}>Origine du produit</legend>
              <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                <label style={styles.choix}><input type="radio" name="origine" value="local" required checked={champs.origine_type === 'local'} onChange={maj('origine_type')} /> Fabriqué en {paysLocal}</label>
                <label style={styles.choix}><input type="radio" name="origine" value="importe" checked={champs.origine_type === 'importe'} onChange={maj('origine_type')} /> Importé</label>
              </div>
              {champs.origine_type === 'importe' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <label htmlFor="origine_pays" style={{ fontSize: '0.84rem' }}>Pays de fabrication</label>
                  <input id="origine_pays" className="champ" list="pays-import" required maxLength={60} placeholder="Ex. : Chine" value={champs.origine_pays} onChange={maj('origine_pays')} />
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
            <h2 className="esp-carte-titre"><span>Images du produit</span><span style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.6 }}>{photos.length}/{MAX_PHOTOS}</span></h2>
            <ConsigneImages />
            <div
              className={`esp-zone-depot${survol ? ' esp-zone-depot-survol' : ''}`} role="button" tabIndex={0}
              onClick={() => champFichier.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); champFichier.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
              onDragLeave={() => setSurvol(false)}
              onDrop={(e) => { e.preventDefault(); setSurvol(false); recevoirFichiers(e.dataTransfer.files); }}
            >
              <IconeImage size={26} color="var(--loo-rouge)" />
              <div style={{ color: 'var(--loo-rouge)', fontWeight: 700, marginTop: '0.3rem' }}>
                {envoiPhoto ? 'Envoi en cours…' : 'Glissez vos images ici ou cliquez pour ajouter'}
              </div>
              <div className="esp-aide">Formats acceptés : JPG, PNG, WEBP (10 Mo max par image, réduites automatiquement)</div>
              <input ref={champFichier} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { recevoirFichiers(e.target.files); e.target.value = ''; }} />
            </div>

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
            <p style={{ margin: '0.8rem 0 0' }}>
              <button type="button" className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.5em 1em' }} onClick={() => setSelecteurOuvert(true)} disabled={photos.length >= MAX_PHOTOS}>
                Choisir depuis ma médiathèque
              </button>
            </p>

            <div style={{ marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid var(--loo-papier-ombre)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.4rem' }}>Vidéo (facultatif, 50 Mo max)</div>
              {(nouvelleVideo || videoUrl) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.88rem' }}>
                  <Video size={16} /> {nouvelleVideo ? nouvelleVideo.name : 'Vidéo enregistrée'}
                  <button type="button" className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.3em 0.8em' }} onClick={() => { setNouvelleVideo(null); setVideoUrl(null); }}>Retirer</button>
                </div>
              ) : (
                <label className="btn btn-outline" style={{ cursor: 'pointer', fontSize: '0.82rem', padding: '0.5em 1em' }}>
                  <Video size={15} /> Ajouter une vidéo
                  <input type="file" accept="video/*" hidden onChange={choisirVideo} />
                </label>
              )}
            </div>
          </div>
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
        </div>
      </div>

      <div className="esp-barre-actions">
        <Link to="/produits" className="btn btn-outline">Annuler</Link>
        <button type="submit" className="btn btn-primary" disabled={enregistrement || envoiPhoto}>
          {enregistrement ? 'Publication…' : produit ? 'Enregistrer les modifications' : 'Publier le produit'}
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
