import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  BadgeCheck, Building2, Check, Clock, Download, ExternalLink, FileText, Image as IconeImage, MapPin,
  Pencil, Share2, Trash2, Upload, X,
} from 'lucide-react';
import SelectCategorie from '../components/SelectCategorie.jsx';
import {
  suivreSession, recupererMonProfil, mettreAJourProfilComplet, mettreAJourContactPrive, mettreAJourTelephone,
  ajouterPhotoProfil, supprimerPhotoProfil, recupererMesStats,
  recupererDocuments, televerserDocument, supprimerDocument, obtenirLienDocument,
} from '../api/fournisseurs.js';
import { televerserPhoto, supprimerPhotoStockage } from '../utils/stockagePhotos.js';
import { normaliserTelephone, formaterTelephone, contactDuProfil } from '../utils/telephone.js';

// Ces champs vivent dans la table protégée des contacts (jamais dans la table publique)
const CHAMPS_PRIVES = ['adresse', 'site_web', 'reseaux_sociaux'];

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const TYPES_DOCUMENT = {
  rccm: { libelle: 'RCCM / Extrait Kbis', sous: "Document officiel de l'entreprise" },
  piece_identite: { libelle: "Pièce d'identité du responsable", sous: "Carte d'identité ou passeport" },
  attestation_residence: { libelle: 'Attestation de résidence', sous: 'Document récent' },
  certificat_conformite: { libelle: 'Certificat de conformité', sous: 'Normes et qualité' },
  autre: { libelle: 'Autre document', sous: 'Tout justificatif utile' },
};
const STATUTS_DOCUMENT = {
  en_attente: { texte: 'En attente', classe: 'esp-puce-orange' },
  verifie: { texte: 'Vérifié', classe: 'esp-puce-vert' },
  rejete: { texte: 'Rejeté', classe: 'esp-puce-rouge' },
};

export default function Profil() {
  const navigate = useNavigate();
  const { rafraichirIdentite } = useOutletContext() || {};
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [documents, setDocuments] = useState(undefined);
  const [stats, setStats] = useState(null);
  const [enEdition, setEnEdition] = useState(null); // 'nom' | 'categorie' | … | 'apropos' | 'horaires' | 'reseaux'
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState('');
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');

  useEffect(() => suivreSession(setSession), []);

  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then((p) => {
      setProfil(p);
      if (p) recupererDocuments(p.id).then(setDocuments).catch(() => setDocuments([]));
    }).catch((err) => setErreur(err.message));
    recupererMesStats().then(setStats).catch(() => {});
  }, [session, navigate]);

  if (session === undefined || profil === undefined) return <div className="loo-squelette" style={{ height: '300px' }} />;
  if (!profil) return <p>Aucun profil fournisseur associé à ce compte.</p>;

  const contact = contactDuProfil(profil);
  const telephone = contact.telephone;
  const horaires = profil.horaires_ouverture || {};
  const reseaux = contact.reseaux_sociaux || {};
  const photosProfil = [...(profil.grossiste_photo || [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const initiales = (profil.nom || '').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();

  const annonce = (msg) => { setSucces(msg); setTimeout(() => setSucces(''), 2500); };

  // Enregistre un ou plusieurs champs du profil, avec message d'erreur lisible
  async function enregistrerChamps(champs, apres) {
    setErreur('');
    try {
      const prives = Object.fromEntries(Object.entries(champs).filter(([k]) => CHAMPS_PRIVES.includes(k)));
      const publics = Object.fromEntries(Object.entries(champs).filter(([k]) => !CHAMPS_PRIVES.includes(k)));
      if (Object.keys(publics).length) await mettreAJourProfilComplet(profil.id, publics);
      if (Object.keys(prives).length) await mettreAJourContactPrive(profil.id, prives);
      setProfil((p) => ({ ...p, ...publics, ...(Object.keys(prives).length ? { grossiste_contact: { ...contactDuProfil(p), ...prives } } : {}) }));
      setEnEdition(null);
      apres?.();
      rafraichirIdentite?.();
      annonce('Modification enregistrée.');
    } catch (err) {
      setErreur(/description/.test(err.message) ? "La présentation n'est pas encore activée sur la base (migration 0002 à exécuter)." : err.message);
    }
  }

  async function enregistrerTelephone() {
    const numero = normaliserTelephone(brouillon);
    if (numero.length < 11) { setErreur('Numéro incomplet. Exemple : 07 00 00 00 00.'); return; }
    setErreur('');
    try {
      await mettreAJourTelephone(profil.id, numero);
      setProfil((p) => ({ ...p, grossiste_contact: { ...contactDuProfil(p), telephone: numero } }));
      setEnEdition(null);
      annonce('Téléphone enregistré.');
    } catch (err) { setErreur(err.message); }
  }

  function commencer(cle, valeur) { setEnEdition(cle); setBrouillon(valeur ?? ''); setErreur(''); }

  async function changerImage(champ, e) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setEnvoi(champ);
    setErreur('');
    try {
      const url = await televerserPhoto(profil.id, fichier);
      await mettreAJourProfilComplet(profil.id, { [champ]: url });
      setProfil((p) => ({ ...p, [champ]: url }));
      rafraichirIdentite?.();
    } catch (err) { setErreur(err.message); } finally { setEnvoi(''); }
  }

  async function ajouterPhoto(e) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setEnvoi('photo');
    setErreur('');
    try {
      const url = await televerserPhoto(profil.id, fichier);
      await ajouterPhotoProfil(profil.id, url, photosProfil.length);
      setProfil(await recupererMonProfil(session.user.id));
    } catch (err) { setErreur(err.message); } finally { setEnvoi(''); }
  }

  async function retirerPhoto(photo) {
    try {
      await supprimerPhotoProfil(photo.id);
      await supprimerPhotoStockage(photo.url);
      setProfil((p) => ({ ...p, grossiste_photo: p.grossiste_photo.filter((x) => x.id !== photo.id) }));
    } catch (err) { setErreur(err.message); }
  }

  async function ajouterDocument(type, e) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setEnvoi('document');
    setErreur('');
    try {
      await televerserDocument(profil.id, type, fichier);
      setDocuments(await recupererDocuments(profil.id));
    } catch (err) { setErreur(err.message); } finally { setEnvoi(''); }
  }

  async function retirerDocument(doc) {
    if (!window.confirm('Retirer ce document ?')) return;
    try {
      await supprimerDocument(doc.id, doc.chemin);
      setDocuments((d) => d.filter((x) => x.id !== doc.id));
    } catch (err) { setErreur(err.message); }
  }

  async function voirDocument(doc) {
    try { window.open(await obtenirLienDocument(doc.chemin), '_blank'); } catch (err) { setErreur(err.message); }
  }

  async function enregistrerHoraires(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    const nouveaux = {};
    for (const jour of JOURS) {
      nouveaux[jour] = form.get(`ferme_${jour}`) === 'on' ? null : (form.get(`horaires_${jour}`)?.trim() || null);
    }
    await enregistrerChamps({ horaires_ouverture: nouveaux });
  }

  async function enregistrerReseaux(e) {
    e.preventDefault();
    const form = new FormData(e.target);
    await enregistrerChamps({
      reseaux_sociaux: { whatsapp: form.get('whatsapp') || null, instagram: form.get('instagram') || null, facebook: form.get('facebook') || null },
    });
  }

  const ctx = { enEdition, setEnEdition, brouillon, setBrouillon, commencer, enregistrerChamps, erreur };

  const membreDepuis = profil.date_ajout ? new Date(profil.date_ajout).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '–';

  return (
    <>
      <h1 className="esp-titre-page">Paramètres et profil</h1>
      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, margin: '0 0 1rem' }}>{erreur}</p>}
      {succes && <p role="status" style={{ color: '#1f7a3d', fontWeight: 600, margin: '0 0 1rem' }}>{succes}</p>}
      {profil.drapeau_coordonnees && (
        <p role="alert" className="esp-carte" style={{ borderColor: 'var(--loo-orange)', background: '#FFF6E9', margin: '0 0 1rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
          <strong>Coordonnées détectées dans votre profil.</strong> Retirez tout numéro de téléphone, e-mail ou lien de votre nom et de votre présentation :
          les échanges avec les acheteurs passent par LOOHOO. Votre profil reste en vérification tant qu'ils y figurent.
        </p>
      )}

      {/* Carte d'identité */}
      <div className="esp-carte" style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }} title="Changer le logo">
          <span className="esp-avatar" style={{ width: 104, height: 104, fontSize: '2rem', background: profil.logo_url ? 'var(--loo-papier-ombre)' : undefined }}>
            {profil.logo_url ? <img src={profil.logo_url} alt="Logo" /> : initiales || <Building2 size={36} />}
          </span>
          <span style={{ position: 'absolute', right: 0, bottom: 0, background: 'var(--loo-encre)', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {envoi === 'logo_url' ? '…' : <IconeImage size={14} />}
          </span>
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!envoi} onChange={(e) => changerImage('logo_url', e)} />
        </label>

        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', margin: '0 0 0.4rem' }}>{profil.nom}</h2>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {profil.badge_verifie
              ? <span className="badge badge-verifie"><BadgeCheck size={13} /> Vérifié</span>
              : <span className="esp-puce esp-puce-orange">Non vérifié</span>}
            {profil.est_fabricant && <span className="badge badge-fabricant">Fabricant local</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.6rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={14} /> {profil.commune ? `${profil.commune}, ` : ''}{profil.ville}</span>
            <span style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{profil.categorie}</span>
          </div>
          {enEdition === 'description' ? (
            <form onSubmit={(e) => { e.preventDefault(); enregistrerChamps({ description: brouillon.trim() || null }); }}>
              <textarea className="champ" rows={4} maxLength={600} autoFocus value={brouillon} onChange={(e) => setBrouillon(e.target.value)} placeholder="Présentez votre entreprise en quelques phrases : ce que vous vendez, depuis quand, vos points forts." />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5em 1.1em', fontSize: '0.85rem' }}>Enregistrer</button>
                <button type="button" className="btn btn-outline" style={{ padding: '0.5em 1.1em', fontSize: '0.85rem' }} onClick={() => setEnEdition(null)}>Annuler</button>
                <span className="esp-aide" style={{ marginLeft: 'auto' }}>{brouillon.length}/600</span>
              </div>
            </form>
          ) : (
            <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, opacity: profil.description ? 0.85 : 0.55 }}>
              {profil.description || "Ajoutez une présentation : c'est ce qui rassure un acheteur avant de vous écrire."}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gap: '0.6rem', flex: '0 0 auto', minWidth: '210px' }}>
          <button type="button" className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => commencer('description', profil.description)}>
            <Pencil size={16} /> {profil.description ? 'Modifier la présentation' : 'Ajouter une présentation'}
          </button>
          <Link to={`/grossiste/${profil.id}`} target="_blank" className="btn btn-outline" style={{ justifyContent: 'center' }}>
            Voir ma page publique <ExternalLink size={15} />
          </Link>
        </div>
      </div>

      <div className="esp-grille esp-deux" style={{ marginTop: '1rem', alignItems: 'start' }}>
        {/* Colonne gauche */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="esp-carte">
            <h2 className="esp-carte-titre"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={18} /> Informations de l'entreprise</span></h2>
            <Ligne ctx={ctx} cle="nom" libelle="Nom de l'entreprise" valeur={profil.nom} />
            <Ligne ctx={ctx} cle="categorie" libelle="Catégorie" valeur={profil.categorie} />
            <Ligne ctx={ctx} cle="ville" libelle="Ville" valeur={profil.ville} />
            <Ligne ctx={ctx} cle="commune" libelle="Commune" valeur={profil.commune} />
            <Ligne ctx={ctx} cle="adresse" libelle="Adresse" valeur={contact.adresse} aide="Visible uniquement par vous et l'équipe LOOHOO, pour la vérification." />
            <Ligne ctx={ctx} cle="telephone" libelle="Téléphone" valeur={telephone} affichage={telephone ? formaterTelephone(telephone) : undefined} type="tel" enregistrer={enregistrerTelephone} aide="Jamais affiché publiquement. Les acheteurs vous écrivent via la messagerie." />
            <Ligne ctx={ctx} cle="email" libelle="E-mail" valeur={session.user.email} lectureSeule />
            <Ligne ctx={ctx} cle="site_web" libelle="Site web" valeur={contact.site_web} aide="Usage interne : jamais affiché sur votre page publique." />
            <p className="esp-aide" style={{ marginTop: '0.7rem' }}>Téléphone, adresse, e-mail, site web et réseaux sociaux restent privés.</p>
          </div>

          <div className="esp-carte">
            <h2 className="esp-carte-titre"><span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={18} /> Documents et vérification</span></h2>
            <p className="esp-aide" style={{ marginBottom: '0.6rem' }}>Facultatifs, mais ils accélèrent la vérification et l'obtention du badge « Vérifié ». Jamais visibles publiquement.</p>
            {Object.entries(TYPES_DOCUMENT).map(([type, { libelle, sous }]) => {
              const existants = (documents || []).filter((d) => d.type === type);
              return (
                <div key={type} className="esp-liste-ligne" style={{ flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{libelle}</div>
                    <div className="esp-aide">{sous}</div>
                    {existants.map((d) => (
                      <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.82rem' }}>
                        <span style={{ overflowWrap: 'anywhere' }}>{d.nom_fichier}</span>
                        <span className={`esp-puce ${STATUTS_DOCUMENT[d.statut].classe}`}>{STATUTS_DOCUMENT[d.statut].texte}</span>
                        <button type="button" className="esp-bouton-icone" style={{ padding: '0.25rem' }} onClick={() => voirDocument(d)} aria-label="Télécharger"><Download size={14} /></button>
                        <button type="button" className="esp-bouton-icone" style={{ padding: '0.25rem' }} onClick={() => retirerDocument(d)} aria-label="Retirer"><Trash2 size={14} /></button>
                        {d.statut === 'rejete' && d.motif_rejet && <span style={{ color: 'var(--loo-rouge)' }}>Motif : {d.motif_rejet}</span>}
                      </div>
                    ))}
                  </div>
                  <label className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.35em 0.8em', cursor: 'pointer' }}>
                    <Upload size={13} /> {existants.length ? 'Ajouter' : 'Envoyer'}
                    <input type="file" accept="image/jpeg,image/png,application/pdf" hidden disabled={!!envoi} onChange={(e) => ajouterDocument(type, e)} />
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne droite */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="esp-carte">
            <h2 className="esp-carte-titre">Statistiques du profil<Link to="/statistiques">Détails →</Link></h2>
            <div className="esp-liste-ligne"><span>Vues du profil</span><strong>{stats ? stats.vues_profil : '–'}</strong></div>
            <div className="esp-liste-ligne"><span>Demandes reçues</span><strong>{stats ? stats.contacts_total : '–'}</strong></div>
            <div className="esp-liste-ligne"><span>Membre depuis</span><strong style={{ textTransform: 'capitalize' }}>{membreDepuis}</strong></div>
          </div>

          <div className="esp-carte">
            <h2 className="esp-carte-titre">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={18} /> Horaires d'ouverture</span>
              {enEdition !== 'horaires' && <button type="button" className="esp-bouton-icone" aria-label="Modifier les horaires" onClick={() => commencer('horaires')}><Pencil size={15} /></button>}
            </h2>
            {enEdition === 'horaires' ? (
              <form onSubmit={enregistrerHoraires}>
                {JOURS.map((jour) => (
                  <div key={jour} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{ width: '80px', textTransform: 'capitalize', fontSize: '0.86rem' }}>{jour}</span>
                    <input className="champ" style={{ padding: '0.5em 0.8em' }} name={`horaires_${jour}`} defaultValue={horaires[jour] || ''} placeholder="08:00 - 17:00" />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" name={`ferme_${jour}`} defaultChecked={horaires[jour] === null && JOURS.some((j) => horaires[j])} /> Fermé
                    </label>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5em 1.1em', fontSize: '0.85rem' }}>Enregistrer</button>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.5em 1.1em', fontSize: '0.85rem' }} onClick={() => setEnEdition(null)}>Annuler</button>
                </div>
              </form>
            ) : JOURS.some((j) => horaires[j]) ? (
              JOURS.map((jour) => (
                <div key={jour} className="esp-liste-ligne" style={{ padding: '0.35rem 0' }}>
                  <span style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}>{jour}</span>
                  <span style={{ fontSize: '0.9rem', color: horaires[jour] ? 'inherit' : 'var(--loo-rouge)', fontWeight: horaires[jour] ? 400 : 600 }}>{horaires[jour] || 'Fermé'}</span>
                </div>
              ))
            ) : (
              <p className="esp-aide">Aucun horaire renseigné. Ils s'affichent sur votre page publique.</p>
            )}
          </div>

          <div className="esp-carte">
            <h2 className="esp-carte-titre">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}><Share2 size={18} /> Réseaux sociaux (privé)</span>
              {enEdition !== 'reseaux' && <button type="button" className="esp-bouton-icone" aria-label="Modifier les réseaux" onClick={() => commencer('reseaux')}><Pencil size={15} /></button>}
            </h2>
            {enEdition === 'reseaux' ? (
              <form onSubmit={enregistrerReseaux} style={{ display: 'grid', gap: '0.5rem' }}>
                <input className="champ" name="whatsapp" defaultValue={reseaux.whatsapp || ''} placeholder="WhatsApp" aria-label="WhatsApp" />
                <input className="champ" name="instagram" defaultValue={reseaux.instagram || ''} placeholder="Instagram (@nom)" aria-label="Instagram" />
                <input className="champ" name="facebook" defaultValue={reseaux.facebook || ''} placeholder="Facebook" aria-label="Facebook" />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.5em 1.1em', fontSize: '0.85rem' }}>Enregistrer</button>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.5em 1.1em', fontSize: '0.85rem' }} onClick={() => setEnEdition(null)}>Annuler</button>
                </div>
              </form>
            ) : (
              <>
                {[['WhatsApp', reseaux.whatsapp], ['Instagram', reseaux.instagram], ['Facebook', reseaux.facebook]].map(([nom, valeur]) => (
                  <div key={nom} className="esp-liste-ligne" style={{ padding: '0.45rem 0' }}>
                    <span style={{ fontSize: '0.9rem' }}>{nom}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{valeur || <em style={{ opacity: 0.45, fontWeight: 400 }}>Non renseigné</em>}</span>
                  </div>
                ))}
                <p className="esp-aide" style={{ marginTop: '0.5rem' }}>Ces informations aident l'équipe LOOHOO à vous identifier. Elles ne sont jamais publiées.</p>
              </>
            )}
          </div>

          <div className="esp-carte">
            <h2 className="esp-carte-titre"><span>Photos de l'entreprise ({photosProfil.length}/3)</span></h2>
            <p className="esp-aide" style={{ marginBottom: '0.7rem' }}>Au moins une photo réelle est nécessaire pour être publié. Elles servent aussi à la vérification.</p>
            <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
              {photosProfil.map((p) => (
                <div key={p.id} className="esp-vignette"><img src={p.url} alt="" />
                  <button type="button" onClick={() => retirerPhoto(p)} aria-label="Retirer la photo"><X size={13} /></button>
                </div>
              ))}
              {photosProfil.length < 3 && (
                <label className="esp-vignette" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.2rem', fontSize: '0.75rem', cursor: 'pointer', border: '2px dashed var(--loo-orange)', background: '#FFFAF3' }}>
                  <IconeImage size={18} color="var(--loo-rouge)" />{envoi === 'photo' ? 'Envoi…' : 'Ajouter'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!envoi} onChange={ajouterPhoto} />
                </label>
              )}
            </div>
            <div style={{ marginTop: '1.1rem', paddingTop: '1rem', borderTop: '1px solid var(--loo-papier-ombre)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.86rem', marginBottom: '0.5rem' }}>Bannière de votre page publique</div>
              <div style={{ height: 84, borderRadius: 10, background: profil.banniere_url ? `url(${profil.banniere_url}) center/cover` : 'var(--loo-papier-ombre)', marginBottom: '0.5rem' }} />
              <label className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.35em 0.8em', cursor: 'pointer' }}>
                <IconeImage size={13} /> {envoi === 'banniere_url' ? 'Envoi…' : 'Changer la bannière'}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={!!envoi} onChange={(e) => changerImage('banniere_url', e)} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Une ligne du tableau d'informations, avec crayon de modification (composant à part pour garder le focus pendant la frappe)
function Ligne({ ctx, cle, libelle, valeur, affichage, type = 'text', enregistrer, lectureSeule, aide }) {
  const { enEdition, setEnEdition, brouillon, setBrouillon, commencer, enregistrerChamps, erreur } = ctx;
  const edite = enEdition === cle;
  return (
    <div className="esp-liste-ligne" style={{ alignItems: 'flex-start' }}>
      <span style={{ width: '38%', fontSize: '0.88rem', opacity: 0.75, paddingTop: edite ? '0.55rem' : 0 }}>{libelle}</span>
      {edite ? (
        <form style={{ flex: 1, display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}
          onSubmit={(e) => { e.preventDefault(); (enregistrer || (() => enregistrerChamps({ [cle]: brouillon.trim() || null })))(); }}>
          {cle === 'categorie'
            ? <SelectCategorie value={brouillon} valeurActuelle={valeur} onChange={(e) => setBrouillon(e.target.value)} required />
            : <input className="champ" style={{ flex: 1, minWidth: '140px', padding: '0.55em 0.8em' }} type={type} value={brouillon} onChange={(e) => setBrouillon(e.target.value)} autoFocus required={['nom', 'ville', 'categorie'].includes(cle)} />}
          <button type="submit" className="esp-bouton-icone" aria-label="Enregistrer" style={{ color: '#1f7a3d' }}><Check size={18} /></button>
          <button type="button" className="esp-bouton-icone" aria-label="Annuler" onClick={() => setEnEdition(null)}><X size={18} /></button>
          {erreur && <p role="alert" className="esp-aide" style={{ flexBasis: '100%', color: 'var(--loo-rouge)', opacity: 1, fontWeight: 600 }}>{erreur}</p>}
          {aide && <p className="esp-aide" style={{ flexBasis: '100%' }}>{aide}</p>}
        </form>
      ) : (
        <>
          <span style={{ flex: 1, fontWeight: 600, fontSize: '0.92rem', overflowWrap: 'anywhere' }}>{affichage ?? (valeur || <em style={{ opacity: 0.5, fontWeight: 400 }}>Non renseigné</em>)}</span>
          {!lectureSeule && (
            <button type="button" className="esp-bouton-icone" aria-label={`Modifier ${libelle}`} onClick={() => commencer(cle, valeur)}><Pencil size={15} /></button>
          )}
        </>
      )}
    </div>
  );
}
