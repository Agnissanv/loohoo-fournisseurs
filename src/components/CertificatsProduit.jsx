import React, { useEffect, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { recupererCertificats, ajouterCertificat, supprimerCertificat } from '../api/fournisseurs.js';

// Types proposés à la saisie (le fournisseur peut en écrire un autre)
const TYPES = [
  'Certificat sanitaire', 'Autorisation de mise sur le marché (AMM)', 'Certificat de conformité', "Certificat d'origine",
  'Certificat halal', 'Analyse de laboratoire', 'Fiche de données de sécurité', 'Agrément',
];

const STATUTS = {
  fourni: { texte: 'En attente de vérification', classe: 'esp-puce-orange' },
  verifie: { texte: 'Vérifié par LOOHOO', classe: 'esp-puce-vert' },
  rejete: { texte: 'Refusé', classe: 'esp-puce-rouge' },
};

const dateFr = (d) => new Date(d).toLocaleDateString('fr-FR');
const expire = (c) => c.date_expiration && new Date(`${c.date_expiration}T23:59:59`) < new Date();
const VIDE = { type: '', organisme: '', dateExpiration: '', fichier: null };

// Espace fournisseur : certificats d'un produit (cosmétique, alimentaire, électronique…). Pas de <form> ici :
// le bloc vit à l'intérieur du formulaire produit, les boutons sont donc de type « button ».
export default function CertificatsProduit({ grossisteId, produitId }) {
  const [liste, setListe] = useState([]);
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (produitId) recupererCertificats(produitId).then(setListe);
  }, [produitId]);

  if (!produitId) {
    return <p className="esp-aide" style={{ opacity: 0.75 }}>Publiez d'abord le produit, puis revenez ici pour joindre un certificat (sanitaire, conformité, origine…). Il rassure les acheteurs.</p>;
  }

  async function ajouter() {
    setErreur('');
    if (!saisie.type.trim() || !saisie.organisme.trim()) { setErreur("Indiquez le type de certificat et l'organisme qui l'a délivré."); return; }
    if (!saisie.fichier) { setErreur('Joignez le document (PDF, JPG ou PNG).'); return; }
    setEnvoi(true);
    try {
      await ajouterCertificat(grossisteId, produitId, saisie);
      setListe(await recupererCertificats(produitId));
      setSaisie(VIDE);
      setOuvert(false);
    } catch (err) {
      setErreur(err.message || "L'envoi a échoué.");
    } finally {
      setEnvoi(false);
    }
  }

  async function retirer(c) {
    if (!window.confirm(`Retirer « ${c.type_certificat} » ?`)) return;
    try {
      await supprimerCertificat(c.id);
      setListe((l) => l.filter((x) => x.id !== c.id));
    } catch (err) {
      setErreur(err.message);
    }
  }

  const maj = (cle) => (e) => setSaisie((s) => ({ ...s, [cle]: cle === 'fichier' ? e.target.files?.[0] || null : e.target.value }));

  return (
    <div>
      <p className="esp-aide" style={{ margin: '0 0 0.8rem' }}>
        Le badge « Document fourni » apparaît tout de suite sur la fiche. Il devient « Certificat vérifié par LOOHOO » après le contrôle de notre équipe.
      </p>

      {liste.length > 0 && (
        <ul className="certifs-liste">
          {liste.map((c) => {
            const st = expire(c) ? { texte: 'Expiré', classe: 'esp-puce-rouge' } : (STATUTS[c.statut] || STATUTS.fourni);
            return (
              <li key={c.id}>
                <FileText size={18} aria-hidden="true" style={{ flexShrink: 0, opacity: 0.6 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong>{c.type_certificat}</strong>
                  <div className="esp-aide">{c.organisme}{c.date_expiration ? ` · valable jusqu'au ${dateFr(c.date_expiration)}` : ''}</div>
                  <span className={`esp-puce ${st.classe}`} style={{ marginTop: '0.3rem' }}>{st.texte}</span>
                </div>
                <button type="button" className="esp-bouton-icone" aria-label={`Retirer ${c.type_certificat}`} onClick={() => retirer(c)}><Trash2 size={16} /></button>
              </li>
            );
          })}
        </ul>
      )}

      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.84rem', margin: '0 0 0.6rem' }}>{erreur}</p>}

      {/* Entrée ne doit pas envoyer le formulaire produit qui entoure ce bloc */}
      {ouvert ? (
        <div className="certifs-ajout" onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); ajouter(); } }}>
          <div className="esp-champ-bloc">
            <label htmlFor="certif-type">Type de certificat</label>
            <input id="certif-type" className="champ" list="certif-types" maxLength={100} placeholder="Ex. : Certificat sanitaire" value={saisie.type} onChange={maj('type')} />
            <datalist id="certif-types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
          <div className="esp-champ-bloc">
            <label htmlFor="certif-organisme">Délivré par</label>
            <input id="certif-organisme" className="champ" maxLength={100} placeholder="Ex. : CODINORM, ministère du Commerce…" value={saisie.organisme} onChange={maj('organisme')} />
          </div>
          <div className="esp-champ-bloc">
            <label htmlFor="certif-date">Date d'expiration (si le document en a une)</label>
            <input id="certif-date" className="champ" type="date" value={saisie.dateExpiration} onChange={maj('dateExpiration')} />
          </div>
          <div className="esp-champ-bloc">
            <label htmlFor="certif-fichier">Document (PDF, JPG ou PNG, 10 Mo max)</label>
            <input id="certif-fichier" className="champ" type="file" accept="application/pdf,image/jpeg,image/png" onChange={maj('fichier')} />
            <p className="esp-aide">Visible seulement par l'équipe LOOHOO. Les acheteurs voient le badge, pas le document.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: '0.84rem', padding: '0.5em 1em' }} disabled={envoi} onClick={ajouter}>
              {envoi ? 'Envoi…' : 'Ajouter le certificat'}
            </button>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.84rem', padding: '0.5em 1em' }} onClick={() => { setOuvert(false); setSaisie(VIDE); setErreur(''); }}>Annuler</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-outline" style={{ fontSize: '0.84rem', padding: '0.5em 1em' }} onClick={() => setOuvert(true)}>
          Ajouter un certificat
        </button>
      )}
    </div>
  );
}
