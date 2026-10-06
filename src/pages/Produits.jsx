import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileUp, Image as IconeImage, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import GaleriePhotosProduit from '../components/GaleriePhotosProduit.jsx';
import {
  suivreSession, recupererMonProfil, modifierProduit, supprimerProduit,
} from '../api/fournisseurs.js';

const STATUTS = {
  publie: { texte: 'Publié', classe: 'esp-puce-vert' },
  rejete: { texte: 'Rejeté', classe: 'esp-puce-rouge' },
  en_attente: { texte: 'En vérification', classe: 'esp-puce-orange' },
};

export default function Produits() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [galerieProduit, setGalerieProduit] = useState(null);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then(setProfil).catch((err) => setErreur('Impossible de charger vos produits : ' + err.message));
  }, [session, navigate]);

  const produits = profil?.produit || [];
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return [...produits]
      .filter((p) => (filtre === 'tous' ? true : filtre === 'inactif' ? !p.actif : p.statut === filtre))
      .filter((p) => !q || p.nom.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [produits, recherche, filtre]);

  if (erreur && !profil) return <p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>;
  if (session === undefined || profil === undefined) return <div className="loo-squelette" style={{ height: '240px' }} />;
  if (!profil) return <p>Aucun profil fournisseur associé à ce compte.</p>;

  const compte = (f) => produits.filter((p) => (f === 'inactif' ? !p.actif : p.statut === f)).length;
  const onglets = [
    ['tous', `Tous (${produits.length})`],
    ['publie', `Publiés (${compte('publie')})`],
    ['en_attente', `En vérification (${compte('en_attente')})`],
    ['rejete', `Rejetés (${compte('rejete')})`],
    ['inactif', `Désactivés (${compte('inactif')})`],
  ];

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
    try {
      await supprimerProduit(produit.id);
      setProfil((p) => ({ ...p, produit: p.produit.filter((x) => x.id !== produit.id) }));
    } catch (err) {
      setErreur('Impossible de supprimer le produit : ' + err.message);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <h1 className="esp-titre-page" style={{ margin: 0 }}>Mes produits</h1>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link to="/produits/importer" className="btn btn-outline"><FileUp size={16} /> Importer un fichier</Link>
          <Link to="/produits/nouveau" className="btn btn-primary"><Plus size={16} /> Ajouter un produit</Link>
        </div>
      </div>

      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>}

      {produits.length === 0 ? (
        <div className="esp-carte" style={{ textAlign: 'center', padding: '2.4rem 1.2rem' }}>
          <IconeImage size={34} color="var(--loo-rouge)" />
          <h2 style={{ fontSize: '1.2rem', margin: '0.7rem 0 0.4rem' }}>Ajoutez votre premier produit</h2>
          <p style={{ opacity: 0.75, maxWidth: '46ch', margin: '0 auto 1.1rem' }}>
            Les acheteurs cherchent un produit, pas un nom d'entreprise. Un bon produit : une photo nette, un prix de gros clair et une quantité minimale.
          </p>
          <Link to="/produits/nouveau" className="btn btn-primary"><Plus size={16} /> Ajouter un produit</Link>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            {onglets.map(([cle, texte]) => (
              <button key={cle} type="button" onClick={() => setFiltre(cle)} className="esp-puce" style={{
                border: 0, cursor: 'pointer', fontSize: '0.8rem', padding: '0.4em 0.9em',
                background: filtre === cle ? 'var(--loo-encre)' : 'var(--loo-papier-ombre)',
                color: filtre === cle ? 'var(--loo-papier)' : 'var(--loo-encre)',
              }}>{texte}</button>
            ))}
          </div>
          <div style={{ position: 'relative', maxWidth: '360px', marginBottom: '1rem' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input className="champ" style={{ paddingLeft: '2.3rem' }} type="search" placeholder="Rechercher un produit ou une référence" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
          </div>

          {visibles.length === 0 && <p style={{ opacity: 0.7 }}>Aucun produit ne correspond.</p>}
          <div style={{ display: 'grid', gap: '0.7rem' }}>
            {visibles.map((p) => {
              const st = STATUTS[p.statut] || STATUTS.en_attente;
              return (
                <div key={p.id} className="esp-carte" style={{ padding: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', opacity: p.actif ? 1 : 0.7 }}>
                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', minWidth: 0 }}>
                    {p.photo_url
                      ? <img src={p.photo_url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                      : <div style={{ width: 56, height: 56, background: 'var(--loo-papier-ombre)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><IconeImage size={20} opacity={0.5} /></div>}
                    <div style={{ minWidth: 0 }}>
                      <strong>{p.nom}</strong>
                      <div style={{ fontSize: '0.84rem', opacity: 0.7 }}>
                        {p.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA{p.unite ? ` / ${p.unite}` : ''} · minimum {p.moq}
                        {p.stock_disponible != null && ` · stock : ${p.stock_disponible}`}
                      </div>
                      <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`esp-puce ${st.classe}`}>{st.texte}</span>
                        {!p.actif && <span className="esp-puce esp-puce-neutre">Désactivé</span>}
                        {p.drapeau_coordonnees && <span className="esp-puce esp-puce-orange" title="Retirez les numéros, e-mails et liens du nom, de la description ou des mots-clés">Coordonnées détectées</span>}
                        {p.statut === 'rejete' && p.motif_rejet && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Motif : {p.motif_rejet}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link to={`/produits/${p.id}/modifier`} className="btn btn-outline" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }}><Pencil size={14} /> Modifier</Link>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }} onClick={() => setGalerieProduit(p)}>Photos et vidéo</button>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em', fontSize: '0.8rem' }} onClick={() => basculerActif(p)}>{p.actif ? 'Désactiver' : 'Activer'}</button>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.8em' }} onClick={() => supprimer(p)} aria-label="Supprimer"><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {galerieProduit && (
        <GaleriePhotosProduit
          produit={galerieProduit}
          grossisteId={profil.id}
          onClose={() => setGalerieProduit(null)}
          onChange={() => recupererMonProfil(session.user.id).then(setProfil)}
        />
      )}
    </>
  );
}
