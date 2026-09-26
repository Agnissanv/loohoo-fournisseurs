import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, LogOut } from 'lucide-react';
import {
  suivreSession, recupererMonProfil, deconnecterFournisseur,
  mettreAJourProfil, ajouterProduit, supprimerProduit,
} from '../api/fournisseurs.js';

const STATUTS = {
  en_attente: { texte: 'En attente de vérification', couleur: 'var(--loo-orange)' },
  publie: { texte: "Publié dans l'annuaire", couleur: '#2f8f4e' },
  suspendu: { texte: 'Suspendu', couleur: 'var(--loo-rouge)' },
};

export default function TableauDeBord() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined); // undefined = en cours, null = déconnecté
  const [profil, setProfil] = useState(undefined);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil().then(setProfil).catch(() => setErreur('Impossible de charger votre profil.'));
  }, [session, navigate]);

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
    const nouveau = {
      nom: form.get('nom'),
      description: form.get('description') || null,
      prix_gros_fcfa: Number(form.get('prix')),
      moq: Number(form.get('moq')) || 1,
      poids_grammes: form.get('poids') ? Number(form.get('poids')) : null,
      photo_url: form.get('photo') || null,
      tags: (form.get('tags') || '').split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      await ajouterProduit(profil.id, nouveau);
      e.target.reset();
      setProfil(await recupererMonProfil());
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="section-titre" style={{ margin: 0 }}>{profil.nom}</h1>
            <span style={{ color: statutActuel.couleur, fontWeight: 700, fontSize: '0.9rem' }}>{statutActuel.texte}</span>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => deconnecterFournisseur().then(() => navigate('/'))}>
            <LogOut size={16} /> Se déconnecter
          </button>
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
              <div>
                <strong>{p.nom}</strong>
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  {p.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA · minimum {p.moq}
                </div>
              </div>
              <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em' }} onClick={() => supprimer(p.id)} aria-label="Supprimer">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>Ajouter un produit</h2>
        <form onSubmit={ajouter} className="carte" style={{ padding: '1.2rem', display: 'grid', gap: '0.8rem', maxWidth: '520px' }}>
          <input className="champ" name="nom" required placeholder="Nom du produit" />
          <textarea className="champ" name="description" placeholder="Description courte" rows={2} />
          <input className="champ" name="tags" placeholder="Mots-clés séparés par une virgule (ex. sac, cabas, accessoire)" />
          <div style={{ display: 'flex', gap: '0.7rem' }}>
            <input className="champ" name="prix" type="number" min="0" required placeholder="Prix de gros (F CFA)" />
            <input className="champ" name="moq" type="number" min="1" placeholder="Quantité minimale" />
          </div>
          <input className="champ" name="poids" type="number" min="0" placeholder="Poids (grammes, facultatif)" />
          <input className="champ" name="photo" placeholder="URL de la photo (facultatif)" />
          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
            <Plus size={16} /> Ajouter
          </button>
        </form>
      </div>
    </section>
  );
}