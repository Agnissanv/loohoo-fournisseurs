import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavFournisseur from '../components/NavFournisseur.jsx';
import SelecteurPhoto from '../components/SelecteurPhoto.jsx';
import { Image as IconeImage, Plus, Trash2, LogOut } from 'lucide-react';
import {
  suivreSession, recupererMonProfil, deconnecterFournisseur,
  mettreAJourProfil, ajouterProduit, supprimerProduit,
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

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then(setProfil).catch((err) => setErreur('Impossible de charger votre profil : ' + err.message));
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

  async function ajouter(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const nombreOuNull = (cle) => (form.get(cle) ? Number(form.get(cle)) : null);
    const nouveau = {
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
      photo_url: photoChoisie,
      actif: form.get('actif') === 'on',
    };
    try {
      await ajouterProduit(profil.id, nouveau);
      e.target.reset();
      setPhotoChoisie(null);
      setProfil(await recupererMonProfil(session.user.id));
    } catch (err) {
      setErreur("Impossible d'ajouter le produit : " + err.message);
    }
  }

  async function supprimer(id) {
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
              <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em' }} onClick={() => supprimer(p.id)} aria-label="Supprimer">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Ajouter un produit</h2>
        <form onSubmit={ajouter} className="carte" style={{ padding: '1.4rem', display: 'grid', gap: '1.4rem', maxWidth: '680px' }}>

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Informations générales</legend>
            <label style={styles.etiquette}>Nom du produit</label>
            <input className="champ" name="nom" required placeholder="Ex. : Pagne wax 6 yards" />

            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Catégorie</label>
                <input className="champ" name="categorie" placeholder="Ex. : Textile" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Sous-catégorie</label>
                <input className="champ" name="sous_categorie" placeholder="Ex. : Pagnes" />
              </div>
            </div>

            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Description</label>
            <textarea className="champ" name="description" placeholder="Caractéristiques, composition, utilisation…" rows={3} />

            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Mots-clés</label>
            <input className="champ" name="tags" placeholder="Séparés par une virgule (ex. tissu, couture, pagne)" />
          </fieldset>

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Prix et stock</legend>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Prix de gros (F CFA)</label>
                <input className="champ" name="prix_gros" type="number" min="0" required placeholder="0" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Prix unitaire (facultatif)</label>
                <input className="champ" name="prix_unitaire" type="number" min="0" placeholder="0" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Quantité minimale (MOQ)</label>
                <input className="champ" name="moq" type="number" min="1" placeholder="1" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Stock disponible</label>
                <input className="champ" name="stock" type="number" min="0" placeholder="Facultatif" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Unité</label>
                <select className="champ" name="unite" defaultValue="">
                  <option value="">—</option>
                  {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

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

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Options avancées</legend>
            <div style={{ display: 'flex', gap: '0.7rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>SKU / Référence</label>
                <input className="champ" name="sku" placeholder="Facultatif" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Poids (grammes)</label>
                <input className="champ" name="poids" type="number" min="0" placeholder="Facultatif" />
              </div>
            </div>
            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Dimensions (cm)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input className="champ" name="longueur" type="number" min="0" placeholder="L" />
              <span>×</span>
              <input className="champ" name="largeur" type="number" min="0" placeholder="l" />
              <span>×</span>
              <input className="champ" name="hauteur" type="number" min="0" placeholder="H" />
            </div>
          </fieldset>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600 }}>
            <input type="checkbox" name="actif" defaultChecked />
            Produit actif (visible dès que publié)
          </label>

          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <Plus size={16} /> Ajouter le produit
          </button>
        </form>
      </div>

      {selecteurOuvert && (
        <SelecteurPhoto
          grossisteId={profil.id}
          onChoisir={(url) => { setPhotoChoisie(url); setSelecteurOuvert(false); }}
          onClose={() => setSelecteurOuvert(false)}
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