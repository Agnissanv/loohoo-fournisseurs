import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Factory, MapPin, MessageCircle, Package } from 'lucide-react';
import { recupererGrossiste } from '../api/fournisseurs.js';
import { optimiserImageCloudinary } from '../utils/cloudinaryOptimize.js';
import ModaleContact from '../components/ModaleContact.jsx';

const ORIGINES = {
  local: 'Fournisseur local',
  grossiste_etranger_ci: "Grossiste étranger installé en Côte d'Ivoire",
};

function formaterPoids(grammes) {
  if (grammes == null) return null;
  if (grammes >= 1000) return `${String(grammes / 1000).replace('.', ',')} kg`;
  return `${grammes} g`;
}

export default function ProfilGrossiste() {
  const { id } = useParams();
  const [grossiste, setGrossiste] = useState(undefined); // undefined = chargement, null = introuvable
  const [contact, setContact] = useState(null); // null = fermé, sinon { produit }

  useEffect(() => {
    let annule = false;
    setGrossiste(undefined);
    recupererGrossiste(id)
      .then((g) => { if (!annule) setGrossiste(g); })
      .catch(() => { if (!annule) setGrossiste(null); });
    return () => { annule = true; };
  }, [id]);

  useEffect(() => {
    if (!grossiste) return undefined;
    const ancienTitre = document.title;
    document.title = `${grossiste.nom} — LOOHOO Fournisseurs`;
    return () => { document.title = ancienTitre; };
  }, [grossiste]);

  return (
    <section className="section" style={{ paddingTop: '2rem' }}>
      <div className="container">
        <Link to="/" style={styles.retour}><ArrowLeft size={16} /> Tous les fournisseurs</Link>

        {grossiste === undefined && (
          <div style={{ marginTop: '1.5rem' }}>
            <div className="loo-squelette" style={{ width: '50%', height: '34px', marginBottom: '1rem' }} />
            <div className="loo-squelette" style={{ width: '30%', height: '16px', marginBottom: '2rem' }} />
            <div className="loo-squelette" style={{ aspectRatio: '16 / 5' }} />
          </div>
        )}

        {grossiste === null && (
          <div style={{ marginTop: '1.5rem' }}>
            <h1 className="section-titre">Fournisseur introuvable.</h1>
            <p className="section-intro">Ce profil n'existe pas ou n'est pas encore publié.</p>
          </div>
        )}

        {grossiste && (
          <>
            <div style={styles.entete}>
              <div>
                <div style={styles.badges}>
                  {grossiste.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={13} /> Vérifié</span>}
                  {grossiste.est_fabricant && <span className="badge badge-fabricant"><Factory size={13} /> Fabricant local</span>}
                </div>
                <h1 style={styles.titre}>{grossiste.nom}</h1>
                <p style={styles.meta}>
                  <span className="etiquette" style={{ color: 'var(--loo-encre)', opacity: 0.6 }}>{grossiste.categorie}</span>
                  <span style={styles.info}><MapPin size={14} /> {grossiste.ville}, {grossiste.pays}</span>
                  <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>{ORIGINES[grossiste.origine]}</span>
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setContact({ produit: null })}>
                <MessageCircle size={17} /> Contacter ce fournisseur
              </button>
            </div>

            {grossiste.photos.length > 0 && (
              <div className="photos-grossiste">
                {grossiste.photos.map((url) => (
                  <img key={url} src={optimiserImageCloudinary(url, 700)} alt={`Photo de ${grossiste.nom}`} loading="lazy" />
                ))}
              </div>
            )}

            <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
              Catalogue ({grossiste.produits.length} produit{grossiste.produits.length > 1 ? 's' : ''})
            </h2>

            {grossiste.produits.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Le catalogue de ce fournisseur est en cours de constitution.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {grossiste.produits.map((p) => (
                  <div key={p.id} className="carte ligne-produit">
                    <div className="ligne-produit-image">
                      {p.photo_url
                        ? <img src={optimiserImageCloudinary(p.photo_url, 300)} alt={p.nom} loading="lazy" />
                        : <Package size={24} color="var(--loo-orange)" />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.02rem', marginBottom: '0.25rem' }}>{p.nom}</h3>
                      {p.description && <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', opacity: 0.75, lineHeight: 1.5 }}>{p.description}</p>}
                      <div style={styles.chiffres}>
                        <span style={styles.prix}>{p.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA</span>
                        <span style={styles.puce}>Minimum : {p.moq}</span>
                        {formaterPoids(p.poids_grammes) && <span style={styles.puce}>{formaterPoids(p.poids_grammes)}</span>}
                      </div>
                      <button type="button" className="btn btn-outline" style={styles.boutonProduit} onClick={() => setContact({ produit: p })}>
                        Contacter pour ce produit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {contact && grossiste && (
        <ModaleContact grossiste={grossiste} produit={contact.produit} onClose={() => setContact(null)} />
      )}
    </section>
  );
}

const styles = {
  retour: { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-rouge)' },
  entete: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.2rem', flexWrap: 'wrap', marginTop: '1.5rem' },
  badges: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: '1.6rem', marginBottom: '0.5rem' },
  titre: { fontSize: 'clamp(1.8rem, 3.4vw, 2.5rem)', marginBottom: '0.6rem' },
  meta: { display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', margin: 0 },
  info: { display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.9rem', opacity: 0.75 },
  chiffres: { display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' },
  prix: { fontFamily: 'var(--police-etiquette)', fontWeight: 600, color: 'var(--loo-rouge)', fontSize: '1rem' },
  puce: { fontFamily: 'var(--police-etiquette)', fontSize: '0.78rem', opacity: 0.7 },
  boutonProduit: { marginTop: '0.8rem', padding: '0.5em 1.1em', fontSize: '0.85rem' },
};

