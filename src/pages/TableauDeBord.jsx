import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavFournisseur from '../components/NavFournisseur.jsx';
import SelecteurPhoto from '../components/SelecteurPhoto.jsx';
import GaleriePhotosProduit from '../components/GaleriePhotosProduit.jsx';
import SelectCategorie from '../components/SelectCategorie.jsx';
import { Image as IconeImage, Pencil, Plus, Trash2, LogOut } from 'lucide-react';
import {
  suivreSession, recupererMonProfil, deconnecterFournisseur,
  mettreAJourProfil, ajouterProduit, modifierProduit, supprimerProduit, finaliserInscriptionEnAttente,
} from '../api/fournisseurs.js';

const STATUTS = {
  en_attente: { texte: 'En attente de vérification', couleur: 'var(--loo-orange)' },
  publie: { texte: "Publié dans l'annuaire", couleur: '#2f8f4e' },
  suspendu: { texte: 'Suspendu', couleur: 'var(--loo-rouge)' },
};

const UNITES = ['pièce', 'carton', 'kg', 'litre', 'sac', 'rouleau', 'paquet'];

export default function TableauDeBord() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [erreur, setErreur] = useState('');
  const [photoChoisie, setPhotoChoisie] = useState(null);
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const [galerieProduit, setGalerieProduit] = useState(null);
  const [produitEdite, setProduitEdite] = useState(null); // null = formulaire d'ajout

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id)
      .then(async (p) => {
        if (p) return p;
        // Compte confirmé par e-mail mais profil pas encore créé : on le crée avec les infos saisies à l'inscription
        const cree = await finaliserInscriptionEnAttente().catch(() => false);
        return cree ? recupererMonProfil(session.user.id) : null;
      })
      .then(setProfil)
      .catch((err) => setErreur('Impossible de charger votre profil : ' + err.message));
  }, [session, navigate]);

  if (erreur) {
    return <section className="section"><div className="container"><p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p></div></section>;
  }
  if (session === undefined || profil === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '200px' }} /></div></section>;
  }
  if (!profil) {
    return <section className="section"><div className="container"><p>Aucun profil fournisseur associé à ce compte.</p></div></section>;
  }

  const statutActuel = STATUTS[profil.statut];

  async function basculerStock(e) {
    const valeur = e.target.checked;
    try {
      await mettreAJourProfil(profil.id, { stock_confirme: valeur });
      setProfil((p) => ({ ...p, stock_confirme: valeur }));
    } catch (err) {
      setErreur('Impossible de mettre à jour le stock : ' + err.message);
    }
  }

  async function enregistrerProduit(e) {
    e.preventDefault();
    const formulaire = e.target;
    const form = new FormData(formulaire);
    const nombreOuNull = (cle) => (form.get(cle) ? Number(form.get(cle)) : null);
    const champs = {
      nom: form.get('nom'),
      categorie: form.get('categorie') || null,
      sous_categorie: form.get('sous_categorie') || null,
      description: form.get('description') || null,
      tags: (form.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
      prix_gros_fcfa: Number(form.get('prix_gros')),
      prix_unitaire_fcfa: nombreOuNull('prix_unitaire'),
      moq: Number(form.get('moq')) || 1,
      stock_disponible: nombreOuNull('stock'),
      unite: form.get('unite') || null,
      sku: form.get('sku') || null,
      poids_grammes: nombreOuNull('poids'),
      longueur_cm: nombreOuNull('longueur'),
      largeur_cm: nombreOuNull('largeur'),
      hauteur_cm: nombreOuNull('hauteur'),
      actif: form.get('actif') === 'on',
    };
    setErreur('');
    try {
      if (produitEdite) {
        // Les photos se gèrent via « Photos & vidéo » : on ne touche pas à photo_url ici
        await modifierProduit(produitEdite.id, champs);
        setProduitEdite(null);
      } else {
        await ajouterProduit(profil.id, { ...champs, photo_url: photoChoisie });
        formulaire.reset();
        setPhotoChoisie(null);
      }
      setProfil(await recupererMonProfil(session.user.id));
    } catch (err) {
      setErreur(`Impossible d'enregistrer le produit : ${err.message}`);
    }
  }

  function commencerEdition(produit) {
    setProduitEdite(produit);
    setErreur('');
    requestAnimationFrame(() => document.getElementById('formulaire-produit')?.scrollIntoView({ behavior: 'smooth' }));
  }

  async function basculerActif(produit) {
    try {
      await modifierProduit(produit.id, { actif: !produit.actif });
      setProfil((p) => ({ ...p, produit: p.produit.map((x) => (x.id === produit.id ? { ...x, actif: !produit.actif } : x)) }));
    } catch (err) {
      setErreur('Impossible de modifier le produit : ' + err.message);
    }
  }

  async function supprimer(produit) {
    if (!window.confirm(`Supprimer « ${produit.nom} » définitivement ? Ses photos et ses statistiques seront perdues.`)) return;
    const id = produit.id;
    try {
      await supprimerProduit(id);
      setProfil((p) => ({ ...p, produit: p.produit.filter((x) => x.id !== id) }));
    } catch (err) {
      setErreur('Impossible de supprimer le produit : ' + err.message);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <NavFournisseur />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="section-titre" style={{ margin: 0 }}>{profil.nom}</h1>
            <span style={{ color: statutActuel.couleur, fontWeight: 700, fontSize: '0.9rem' }}>{statutActuel.texte}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <Link to="/conversations" className="btn btn-outline">Mes messages</Link>
            <button type="button" className="btn btn-outline" onClick={() => deconnecterFournisseur().then(() => navigate('/'))}>
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>
        </div>

        {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, marginTop: '1rem' }}>{erreur}</p>}

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '1.6rem 0 0.4rem', fontWeight: 600 }}>
          <input type="checkbox" checked={profil.stock_confirme} onChange={basculerStock} />
          Mon stock est disponible et à jour
        </label>
        {profil.statut === 'en_attente' && (
          <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.6rem' }}>
            Votre profil sera visible dans l'annuaire dès qu'une photo et un contact sont renseignés, votre stock
            confirmé, et votre dossier validé par notre équipe.
          </p>
        )}

        <h2 style={{ fontSize: '1.3rem', margin: '1.6rem 0 1rem' }}>Mes produits ({profil.produit.length})</h2>
        <div style={{ display: 'grid', gap: '0.7rem', marginBottom: '2rem' }}>
          {profil.produit.length === 0 && <p style={{ opacity: 0.7 }}>Aucun produit pour l'instant.</p>}
          {profil.produit.map((p) => (
            <div key={p.id} className="carte" style={{ padding: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.nom} style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '6px' }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', background: 'var(--loo-papier-ombre)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconeImage size={20} opacity={0.5} />
                  </div>
                )}
                <div>
                  <strong>{p.nom}</strong>{!p.actif && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', opacity: 0.6 }}>(inactif)</span>}
                  <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                    {p.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA{p.unite ? ` / ${p.unite}` : ''} · minimum {p.moq}
                    {p.stock_disponible != null && ` · stock : ${p.stock_disponible}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '0.3rem', color: p.statut === 'publie' ? '#2f8f4e' : p.statut === 'rejete' ? 'var(--loo-rouge)' : 'var(--loo-orange)' }}>
                    {p.statut === 'publie' ? 'Publié' : p.statut === 'rejete' ? 'Rejeté' : 'En attente de vérification'}
                  </div>
                  {p.statut === 'rejete' && p.motif_rejet && (
                    <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '0.15rem' }}>Motif : {p.motif_rejet}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }} onClick={() => setGalerieProduit(p)}>
                  Photos & vidéo
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }} onClick={() => commencerEdition(p)}>
                  <Pencil size={14} /> Modifier
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }} onClick={() => basculerActif(p)}>
                  {p.actif ? 'Désactiver' : 'Activer'}
                </button>
                <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em' }} onClick={() => supprimer(p)} aria-label="Supprimer">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 id="formulaire-produit" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
          {produitEdite ? `Modifier « ${produitEdite.nom} »` : 'Ajouter un produit'}
        </h2>
        {produitEdite && (
          <p style={{ maxWidth: '680px', fontSize: '0.88rem', opacity: 0.75, margin: '0 0 1rem' }}>
            Si vous changez le nom, la description, la catégorie ou les mots-clés d'un produit publié, il repassera
            en vérification. Les changements de prix, de stock ou de quantité minimale restent immédiats.
          </p>
        )}
        <form key={produitEdite?.id ?? 'nouveau'} onSubmit={enregistrerProduit} className="carte" style={{ padding: '1.4rem', display: 'grid', gap: '1.4rem', maxWidth: '680px' }}>

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Informations générales</legend>
            <label style={styles.etiquette}>Nom du produit</label>
            <input className="champ" name="nom" defaultValue={produitEdite?.nom ?? ''} required placeholder="Ex. : Pagne wax 6 yards" />

            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Catégorie</label>
                <SelectCategorie name="categorie" defaultValue={produitEdite?.categorie ?? profil.categorie ?? ''} valeurActuelle={produitEdite?.categorie ?? profil.categorie ?? ''} vide="—" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Sous-catégorie</label>
                <input className="champ" name="sous_categorie" defaultValue={produitEdite?.sous_categorie ?? ''} placeholder="Ex. : Pagnes" />
              </div>
            </div>

            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Description</label>
            <textarea className="champ" name="description" defaultValue={produitEdite?.description ?? ''} placeholder="Caractéristiques, composition, utilisation…" rows={3} />

            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Mots-clés</label>
            <input className="champ" name="tags" defaultValue={produitEdite?.tags?.join(', ') ?? ''} placeholder="Séparés par une virgule (ex. tissu, couture, pagne)" />
          </fieldset>

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Prix et stock</legend>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Prix de gros (F CFA)</label>
                <input className="champ" name="prix_gros" defaultValue={produitEdite?.prix_gros_fcfa ?? ''} type="number" min="0" required placeholder="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Prix unitaire (facultatif)</label>
                <input className="champ" name="prix_unitaire" defaultValue={produitEdite?.prix_unitaire_fcfa ?? ''} type="number" min="0" placeholder="0" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Quantité minimale (MOQ)</label>
                <input className="champ" name="moq" defaultValue={produitEdite?.moq ?? ''} type="number" min="1" placeholder="1" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Stock disponible</label>
                <input className="champ" name="stock" defaultValue={produitEdite?.stock_disponible ?? ''} type="number" min="0" placeholder="Facultatif" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Unité</label>
                <select className="champ" name="unite" defaultValue={produitEdite?.unite ?? ''}>
                  <option value="">—</option>
                  {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          {!produitEdite && (
          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Photo</legend>
            {photoChoisie ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <img src={photoChoisie} alt="" style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px' }} />
                <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setSelecteurOuvert(true)}>Changer</button>
                <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={() => setPhotoChoisie(null)}>Retirer</button>
              </div>
            ) : (
              <button type="button" className="btn btn-outline" onClick={() => setSelecteurOuvert(true)}>
                <IconeImage size={16} /> Choisir une photo depuis ma médiathèque
              </button>
            )}
          </fieldset>
          )}

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Options avancées</legend>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>SKU / Référence</label>
                <input className="champ" name="sku" defaultValue={produitEdite?.sku ?? ''} placeholder="Facultatif" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Poids (grammes)</label>
                <input className="champ" name="poids" defaultValue={produitEdite?.poids_grammes ?? ''} type="number" min="0" placeholder="Facultatif" />
              </div>
            </div>
            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Dimensions (cm)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input className="champ" name="longueur" defaultValue={produitEdite?.longueur_cm ?? ''} type="number" min="0" placeholder="L" />
              <span>×</span>
              <input className="champ" name="largeur" defaultValue={produitEdite?.largeur_cm ?? ''} type="number" min="0" placeholder="l" />
              <span>×</span>
              <input className="champ" name="hauteur" defaultValue={produitEdite?.hauteur_cm ?? ''} type="number" min="0" placeholder="H" />
            </div>
          </fieldset>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
            <input type="checkbox" name="actif" defaultChecked={produitEdite ? produitEdite.actif : true} />
            Produit actif (visible dès que publié)
          </label>

          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            {produitEdite ? 'Enregistrer les modifications' : <><Plus size={16} /> Ajouter le produit</>}
          </button>
          {produitEdite && (
            <button type="button" className="btn btn-outline" style={{ justifyContent: 'center' }} onClick={() => setProduitEdite(null)}>
              Annuler la modification
            </button>
          )}
        </form>
      </div>

      {selecteurOuvert && (
        <SelecteurPhoto
          grossisteId={profil.id}
          onChoisir={(url) => { setPhotoChoisie(url); setSelecteurOuvert(false); }}
          onClose={() => setSelecteurOuvert(false)}
        />
      )}

      {galerieProduit && (
        <GaleriePhotosProduit
          produit={galerieProduit}
          grossisteId={profil.id}
          onClose={() => setGalerieProduit(null)}
          onChange={() => recupererMonProfil(session.user.id).then(setProfil)}
        />
      )}
    </section>
  );
}

const styles = {
  groupe: { border: '1px solid var(--loo-papier-ombre)', borderRadius: 'var(--rayon-sm)', padding: '1rem' },
  legende: { fontWeight: 700, fontSize: '0.9rem', padding: '0 0.4rem' },
  etiquette: { display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' },
};