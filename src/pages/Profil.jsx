import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Image as IconeImage, Trash2, Upload } from 'lucide-react';
import NavFournisseur from '../components/NavFournisseur.jsx';
import {
  suivreSession, recupererMonProfil, mettreAJourProfilComplet, mettreAJourTelephone,
  ajouterPhotoProfil, supprimerPhotoProfil,
  recupererDocuments, televerserDocument, supprimerDocument, obtenirLienDocument,
} from '../api/fournisseurs.js';
import { televerserPhoto, supprimerPhotoStockage } from '../utils/stockagePhotos.js';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const TYPES_DOCUMENT = {
  rccm: 'RCCM / Extrait Kbis',
  piece_identite: "Pièce d'identité du responsable",
  attestation_residence: 'Attestation de résidence',
  certificat_conformite: 'Certificat de conformité',
  autre: 'Autre document',
};
const STATUTS_DOCUMENT = {
  en_attente: { texte: 'En attente', couleur: 'var(--loo-orange)' },
  verifie: { texte: 'Vérifié', couleur: '#2f8f4e' },
  rejete: { texte: 'Rejeté', couleur: 'var(--loo-rouge)' },
};

export default function Profil() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [documents, setDocuments] = useState(undefined);
  const [enregistrement, setEnregistrement] = useState(false);
  const [televersement, setTeleversement] = useState(false);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState(false);

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then((p) => {
      setProfil(p);
      if (p) recupererDocuments(p.id).then(setDocuments);
    }).catch((err) => setErreur(err.message));
  }, [session, navigate]);

  if (session === undefined || profil === undefined) {
    return <section className="section"><div className="container"><div className="loo-squelette" style={{ height: '300px' }} /></div></section>;
  }
  if (!profil) {
    return <section className="section"><div className="container"><p>Aucun profil fournisseur associé à ce compte.</p></div></section>;
  }

  async function enregistrer(e) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur('');
    setSucces(false);
    const form = new FormData(e.target);

    const horaires = {};
    for (const jour of JOURS) {
      const ferme = form.get(`ferme_${jour}`) === 'on';
      horaires[jour] = ferme ? null : (form.get(`horaires_${jour}`) || null);
    }

    const champs = {
      nom: form.get('nom'),
      categorie: form.get('categorie'),
      ville: form.get('ville'),
      commune: form.get('commune') || null,
      adresse: form.get('adresse') || null,
      site_web: form.get('site_web') || null,
      horaires_ouverture: horaires,
      reseaux_sociaux: {
        whatsapp: form.get('whatsapp') || null,
        instagram: form.get('instagram') || null,
        facebook: form.get('facebook') || null,
      },
    };

    try {
      await mettreAJourProfilComplet(profil.id, champs);
      await mettreAJourTelephone(profil.id, form.get('telephone'));
      setProfil((p) => ({ ...p, ...champs, grossiste_contact: [{ telephone: form.get('telephone') }] }));
      setSucces(true);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnregistrement(false);
    }
  }

  const photosProfil = profil.grossiste_photo || [];

  async function ajouterPhoto(e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setTeleversement(true);
    setErreur('');
    try {
      const url = await televerserPhoto(profil.id, fichier);
      await ajouterPhotoProfil(profil.id, url, photosProfil.length);
      setProfil((p) => ({ ...p, grossiste_photo: [...(p.grossiste_photo || []), { id: `temp-${Date.now()}`, url, ordre: photosProfil.length }] }));
    } catch (err) {
      setErreur(err.message);
    } finally {
      setTeleversement(false);
      e.target.value = '';
    }
  }

  async function retirerPhoto(photo) {
    try {
      await supprimerPhotoProfil(photo.id);
      await supprimerPhotoStockage(photo.url);
      setProfil((p) => ({ ...p, grossiste_photo: p.grossiste_photo.filter((x) => x.id !== photo.id) }));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function ajouterDocument(type, e) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setTeleversement(true);
    setErreur('');
    try {
      await televerserDocument(profil.id, type, fichier);
      setDocuments(await recupererDocuments(profil.id));
    } catch (err) {
      setErreur(err.message);
    } finally {
      setTeleversement(false);
      e.target.value = '';
    }
  }

  async function retirerDocument(doc) {
    try {
      await supprimerDocument(doc.id, doc.chemin);
      setDocuments((d) => d.filter((x) => x.id !== doc.id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  async function voirDocument(doc) {
    try {
      const lien = await obtenirLienDocument(doc.chemin);
      window.open(lien, '_blank');
    } catch (err) {
      setErreur(err.message);
    }
  }

  const horaires = profil.horaires_ouverture || {};
  const reseaux = profil.reseaux_sociaux || {};

  return (
    <section className="section">
      <div className="container">
        <NavFournisseur />
        <h1 className="section-titre">Mon profil</h1>

        {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>}
        {succes && <p style={{ color: '#2f8f4e', fontWeight: 600 }}>Profil enregistré.</p>}

        <form onSubmit={enregistrer} className="carte" style={{ padding: '1.4rem', display: 'grid', gap: '1.4rem', maxWidth: '680px', marginBottom: '2rem' }}>
          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Informations de l'entreprise</legend>
            <label style={styles.etiquette}>Nom de l'entreprise</label>
            <input className="champ" name="nom" defaultValue={profil.nom} required />

            <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.8rem' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Catégorie</label>
                <input className="champ" name="categorie" defaultValue={profil.categorie} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Ville</label>
                <input className="champ" name="ville" defaultValue={profil.ville} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={styles.etiquette}>Commune</label>
                <input className="champ" name="commune" defaultValue={profil.commune || ''} />
              </div>
            </div>

            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Téléphone (WhatsApp)</label>
            <input className="champ" name="telephone" type="tel" required defaultValue={profil.grossiste_contact?.[0]?.telephone || ''} placeholder="Ex. : 2250700000000" />
            <p style={styles.aide}>Jamais affiché publiquement — uniquement transmis via le chat après une demande de contact.</p>

            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Adresse complète</label>
            <input className="champ" name="adresse" defaultValue={profil.adresse || ''} placeholder="Non affichée publiquement" />
            <p style={styles.aide}>Visible uniquement par vous et par l'équipe LOOHOO, pour la vérification.</p>

            <label style={{ ...styles.etiquette, marginTop: '0.8rem' }}>Site web (facultatif)</label>
            <input className="champ" name="site_web" defaultValue={profil.site_web || ''} />
            <p style={styles.aide}>Usage interne uniquement — jamais affiché sur votre fiche publique.</p>
          </fieldset>

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Réseaux sociaux (usage interne)</legend>
            <label style={styles.etiquette}>WhatsApp</label>
            <input className="champ" name="whatsapp" defaultValue={reseaux.whatsapp || ''} style={{ marginBottom: '0.6rem' }} />
            <label style={styles.etiquette}>Instagram</label>
            <input className="champ" name="instagram" defaultValue={reseaux.instagram || ''} style={{ marginBottom: '0.6rem' }} />
            <label style={styles.etiquette}>Facebook</label>
            <input className="champ" name="facebook" defaultValue={reseaux.facebook || ''} />
            <p style={styles.aide}>Ces champs servent uniquement à l'équipe LOOHOO pour vous identifier — jamais publiés.</p>
          </fieldset>

          <fieldset style={styles.groupe}>
            <legend style={styles.legende}>Horaires d'ouverture</legend>
            {JOURS.map((jour) => (
              <div key={jour} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ width: '90px', textTransform: 'capitalize', fontSize: '0.88rem' }}>{jour}</span>
                <input className="champ" name={`horaires_${jour}`} defaultValue={horaires[jour] || ''} placeholder="08:00 - 17:00" disabled={!horaires[jour] && horaires[jour] !== undefined ? false : false} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" name={`ferme_${jour}`} defaultChecked={horaires[jour] === null} /> Fermé
                </label>
              </div>
            ))}
          </fieldset>

          <button type="submit" className="btn btn-primary" disabled={enregistrement} style={{ justifyContent: 'center' }}>
            {enregistrement ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </form>

        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Photos du profil ({photosProfil.length}/3)</h2>
        <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.2rem' }}>
          Au moins une photo est nécessaire pour que votre profil puisse être publié.
        </p>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {photosProfil.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <img src={p.url} alt="" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: 'var(--rayon-sm)' }} />
              <button type="button" onClick={() => retirerPhoto(p)} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--loo-rouge)', color: '#fff', border: 0, borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {photosProfil.length < 3 && (
            <label className="btn btn-outline" style={{ width: '100px', height: '100px', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}>
              <IconeImage size={18} />
              {televersement ? 'Envoi…' : 'Ajouter'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={televersement} onChange={ajouterPhoto} />
            </label>
          )}
        </div>

        <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Documents administratifs</h2>
        <p style={{ opacity: 0.7, fontSize: '0.9rem', marginBottom: '1.2rem', maxWidth: '560px' }}>
          Facultatifs, mais ils accélèrent votre vérification par l'équipe LOOHOO. Jamais visibles publiquement.
        </p>

        <div style={{ display: 'grid', gap: '0.7rem', maxWidth: '680px' }}>
          {Object.entries(TYPES_DOCUMENT).map(([type, libelle]) => {
            const existants = (documents || []).filter((d) => d.type === type);
            return (
              <div key={type} className="carte" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.7rem' }}>
                  <strong style={{ fontSize: '0.92rem' }}>{libelle}</strong>
                  <label className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.35em 0.8em', cursor: 'pointer' }}>
                    <Upload size={13} /> Ajouter
                    <input type="file" accept="image/jpeg,image/png,application/pdf" hidden disabled={televersement} onChange={(e) => ajouterDocument(type, e)} />
                  </label>
                </div>
                {existants.map((d) => (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', fontSize: '0.85rem' }}>
                    <span>{d.nom_fichier}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ color: STATUTS_DOCUMENT[d.statut].couleur, fontWeight: 700, fontSize: '0.78rem' }}>
                        {STATUTS_DOCUMENT[d.statut].texte}
                      </span>
                      <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.6em' }} onClick={() => voirDocument(d)}><Download size={13} /></button>
                      <button type="button" className="btn btn-outline" style={{ padding: '0.3em 0.6em' }} onClick={() => retirerDocument(d)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
                {existants.some((d) => d.statut === 'rejete' && d.motif_rejet) && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--loo-rouge)', marginTop: '0.4rem' }}>
                    Motif du rejet : {existants.find((d) => d.statut === 'rejete').motif_rejet}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const styles = {
  groupe: { border: '1px solid var(--loo-papier-ombre)', borderRadius: 'var(--rayon-sm)', padding: '1rem' },
  legende: { fontWeight: 700, fontSize: '0.9rem', padding: '0 0.4rem' },
  etiquette: { display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem' },
  aide: { fontSize: '0.78rem', opacity: 0.6, margin: '0.3rem 0 0' },
};