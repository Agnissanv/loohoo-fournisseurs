import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Factory, FileCheck2, MessageSquare, Package, Repeat, ShieldCheck, Store, Truck } from 'lucide-react';
import { recupererChiffresPublics, recupererFournisseursALaUne } from '../api/fournisseurs.js';
import { Etoiles } from './Etoiles.jsx';
import ImageOptimisee from './ImageOptimisee.jsx';
import { anciennete } from '../utils/profilFournisseur.js';
import { prixCFA, quantite } from '../utils/prix.js';
import { useLangue } from '../i18n/Langue.jsx';

const nombre = (n) => Number(n).toLocaleString('fr-FR');
const MINIMUM_A_LA_UNE = 4;

// « Fournisseurs à la une » : affiché seulement à partir de quatre fournisseurs (sinon il répéterait la grille de produits)
export function FournisseursALaUne() {
  const { t, langue } = useLangue();
  const [liste, setListe] = useState(null);
  useEffect(() => { recupererFournisseursALaUne(8).then(setListe); }, []);
  if (!liste || liste.length < MINIMUM_A_LA_UNE) return null;
  const date = (iso) => new Date(iso).toLocaleDateString(langue === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section className="section" style={{ paddingTop: '1rem' }}>
      <div className="container">
        <h2 className="accueil-titre">{t('Fournisseurs à la une')}</h2>
        <div className="a-la-une-grille">
          {liste.map((f) => {
            const initiales = f.nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase();
            const depuis = anciennete(f.date_ajout);
            return (
              <Link key={f.id} to={f.slug ? `/f/${f.slug}` : `/grossiste/${f.id}`} className="carte a-la-une-carte">
                <div className="a-la-une-haut">
                  {f.logo_url
                    ? <ImageOptimisee src={f.logo_url} largeur={120} />
                    : <span className="a-la-une-initiales" aria-hidden="true">{initiales}</span>}
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', lineHeight: 1.25 }}>{f.nom}</strong>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{f.ville}{f.categorie ? ` · ${t(f.categorie)}` : ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minHeight: '1.6rem' }}>
                  {f.badge_verifie && <span className="badge badge-verifie"><BadgeCheck size={13} /> {t('Vérifié')}</span>}
                  {f.est_fabricant && <span className="badge badge-fabricant"><Factory size={13} /> {t('Fabricant local')}</span>}
                </div>
                {f.nb_avis > 0
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}><Etoiles note={Number(f.note)} taille={14} /><strong>{Number(f.note).toLocaleString('fr-FR')}</strong><span style={{ opacity: 0.6 }}>({t('{n} avis', { n: f.nb_avis })})</span></div>
                  : <div style={{ fontSize: '0.82rem' }}><strong>{t('Nouveau fournisseur')}</strong>{f.verifie_le && <span style={{ opacity: 0.65 }}> · {t('vérifié le {date}', { date: date(f.verifie_le) })}</span>}</div>}
                {depuis && <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t('Membre depuis {duree}', { duree: depuis })}</div>}
                <div style={{ fontSize: '0.85rem' }}>
                  {t('À partir de')} <strong style={{ color: 'var(--loo-rouge)' }}>{prixCFA(f.prix_min)}</strong>
                  <span style={{ opacity: 0.65 }}> · {t('minimum')} {quantite(f.moq_prix_min)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const CONTROLES = [
  [FileCheck2, "Pièce d'identité et documents administratifs vérifiés"],
  [Package, 'Photos du stock réel contrôlées par notre équipe'],
  [Store, 'Cohérence du local et de la ville déclarée vérifiée'],
  [Repeat, "Fiabilité suivie dans le temps : un profil peut être suspendu en cas d'écart"],
];

// Ce que veut dire « vérifié », en clair
export function VerifieExplication() {
  const { t } = useLangue();
  return (
    <section className="section" style={{ paddingTop: '1rem' }}>
      <div className="container">
        <div className="verifie-bloc">
          <h2>{t('Que veut dire « vérifié » ?')}</h2>
          <p>{t("Chaque badge est le résultat d'un vrai contrôle.")}</p>
          <ul>
            {CONTROLES.map(([Icone, texte]) => (
              <li key={texte}><Icone size={20} aria-hidden="true" /> <span>{t(texte)}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const ARGUMENTS = [
  [ShieldCheck, 'Fournisseurs contrôlés.', 'Notre équipe vérifie chaque profil.'],
  [MessageSquare, 'Devis en un message.', 'Dites la quantité et la ville, le fournisseur vous répond.'],
  [Truck, 'Prix de gros affichés.', 'Avec la quantité minimale, avant même de contacter.'],
];

// Les chiffres du réseau (comptés dans la base) et les trois arguments, une fois que l'acheteur sait qu'il est au bon endroit
export function ChiffresEtArguments() {
  const { t } = useLangue();
  const [c, setC] = useState(null);
  useEffect(() => { recupererChiffresPublics().then(setC); }, []);
  const lignes = c ? [
    [c.verifies, c.verifies > 1 ? 'Fournisseurs vérifiés' : 'Fournisseur vérifié'],
    [c.produits, c.produits > 1 ? 'Produits publiés' : 'Produit publié'],
    [c.pays, c.pays > 1 ? 'Pays couverts' : 'Pays couvert'],
  ] : [];
  return (
    <section className="section" style={{ paddingTop: '1rem' }} aria-label={t('LOOHOO en chiffres')}>
      <div className="container">
        {lignes.length > 0 && (
          <div className="chiffres-publics">
            {lignes.map(([n, l]) => <div key={l}><strong>{nombre(n)}</strong><span>{t(l)}</span></div>)}
          </div>
        )}
        <div className="acc-confiance" style={{ marginTop: '1.4rem' }}>
          {ARGUMENTS.map(([Icone, titre, texte]) => (
            <div key={titre}><Icone size={20} /><span><strong>{t(titre)}</strong> {t(texte)}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Appel aux fournisseurs, discret, en bas de page
export function RejoindreReseau() {
  const { t } = useLangue();
  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container" style={{ textAlign: 'center' }}>
        <p style={{ margin: '0 0 0.3rem', opacity: 0.7 }}>{t('Vous êtes fournisseur et vous avez du stock disponible ?')}</p>
        <Link to="/devenir-fournisseur" style={{ color: 'var(--loo-rouge)', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}>{t('Rejoindre le réseau de fournisseurs LOOHOO →')}</Link>
      </div>
    </section>
  );
}
