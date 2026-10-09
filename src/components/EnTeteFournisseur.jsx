import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, Clock, Link2, MapPin } from 'lucide-react';
import { Etoiles } from './Etoiles.jsx';
import { anciennete } from '../utils/profilFournisseur.js';

const STATUTS = {
  en_attente: { texte: 'En attente de vérification', classe: 'esp-puce-orange' },
  publie: { texte: "Publié dans l'annuaire", classe: 'esp-puce-vert' },
  suspendu: { texte: 'Suspendu', classe: 'esp-puce-rouge' },
};

const formatDelai = (h) => {
  if (h == null) return null;
  if (h < 1) return `~${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `~${Math.round(h)} h`;
  return `~${Math.round(h / 24)} j`;
};

// Carte d'identité du fournisseur : ce que les acheteurs voient de lui, résumé pour lui.
export default function EnTeteFournisseur({ profil, avis, indicateurs, completude }) {
  const [copie, setCopie] = useState(false);
  const statut = STATUTS[profil.statut] || STATUTS.en_attente;
  const depuis = anciennete(profil.date_ajout);
  const delai = formatDelai(indicateurs?.delai_reponse_heures != null ? Number(indicateurs.delai_reponse_heures) : null);
  const lien = `${window.location.origin}/${profil.slug ? `f/${profil.slug}` : `grossiste/${profil.id}`}`;
  const initiales = profil.nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();

  async function copier() {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2200); } catch { /* presse-papiers indisponible */ }
  }

  return (
    <div className="esp-carte entete-fournisseur">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {profil.logo_url
          ? <img src={profil.logo_url} alt="" className="entete-logo" />
          : <div className="entete-logo entete-initiales" aria-hidden="true">{initiales}</div>}
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h1 style={{ fontSize: 'clamp(1.35rem, 2.4vw, 1.8rem)', margin: '0 0 0.2rem' }}>Bonjour {profil.nom}</h1>
          <div className="entete-ligne">
            <MapPin size={14} aria-hidden="true" /> {profil.commune ? `${profil.commune}, ` : ''}{profil.ville}
            {depuis && <span> · sur LOOHOO depuis {depuis}</span>}
          </div>
          <div className="entete-ligne" style={{ marginTop: '0.3rem' }}>
            {avis?.nombre > 0
              ? <><Etoiles note={avis.moyenne} taille={15} /> <strong>{avis.moyenne.toLocaleString('fr-FR')}</strong> <span style={{ opacity: 0.6 }}>({avis.nombre} avis)</span></>
              : <span style={{ opacity: 0.6 }}>Pas encore d'avis : ils apparaissent après vos premières affaires confirmées.</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span className={`esp-puce ${statut.classe}`}>{profil.badge_verifie && <BadgeCheck size={13} />} {profil.badge_verifie ? 'Fournisseur vérifié' : statut.texte}</span>
        </div>
      </div>

      <div className="entete-bas">
        <div className="entete-completude">
          <span>Profil complet à <strong>{completude.pourcent} %</strong></span>
          <div className="esp-progression" aria-hidden="true"><div style={{ width: `${completude.pourcent}%` }} /></div>
          {completude.manquants[0] && <Link to={completude.manquants[0].vers} style={{ fontSize: '0.8rem', color: 'var(--loo-rouge)', fontWeight: 600 }}>Prochaine étape : {completude.manquants[0].texte}</Link>}
        </div>
        <div className="entete-delai"><Clock size={15} aria-hidden="true" /> {delai ? <>Répond en <strong>{delai}</strong></> : <span style={{ opacity: 0.65 }}>Temps de réponse : dès 3 conversations</span>}</div>
        <button type="button" className="btn btn-outline" style={{ padding: '0.45em 1em', fontSize: '0.85rem' }} onClick={copier}>
          {copie ? <><Check size={15} /> Lien copié</> : <><Link2 size={15} /> Copier mon lien à partager</>}
        </button>
      </div>
    </div>
  );
}
