import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { calculerPrixVente } from '../utils/calculMarge.js';
import { useTitre } from '../utils/useTitre.js';
import { nombre, prixCFA } from '../utils/prix.js';
import { useLangue } from '../i18n/Langue.jsx';

const f = (n) => nombre(Math.round(n));

// Outil gratuit pour les revendeurs : combien vendre pour gagner ce qu'on vise ? Rien n'est envoyé ni enregistré.
export default function CalculateurMarge() {
  const { t, langue } = useLangue();
  useTitre(t('Calculateur de marge'), t("Calculez le prix de vente conseillé de vos produits à partir du prix d'achat, des dépenses et de la marge visée."));
  const [prixAchat, setPrixAchat] = useState('');
  const [quantite, setQuantite] = useState('');
  const [depenses, setDepenses] = useState([]);
  const [mode, setMode] = useState('pourcent');
  const [marge, setMarge] = useState('30');

  const r = calculerPrixVente({ prixAchat, quantite, depenses, mode, marge });
  const majDepense = (i, cle, v) => setDepenses((l) => l.map((d, j) => (j === i ? { ...d, [cle]: v } : d)));

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '980px' }}>
        <span className="etiquette">{t('Outil gratuit')}</span>
        <h1 className="section-titre">{t('Calculateur de marge')}</h1>
        <p className="section-intro">{t('À quel prix vendre pour gagner ce que vous visez ? Entrez ce que vous payez, ajoutez vos frais, choisissez votre marge.')}</p>

        <div className="calc-grille">
          <form className="esp-carte" onSubmit={(e) => e.preventDefault()}>
            <div className="esp-champ-bloc">
              <label htmlFor="calc-achat">{t("Prix d'achat d'une pièce (F CFA)")}</label>
              <input id="calc-achat" className="champ" type="number" min="0" inputMode="decimal" placeholder={t('ex. {v}', { v: 3500 })} value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
            </div>
            <div className="esp-champ-bloc">
              <label htmlFor="calc-qte">{t('Quantité achetée')}</label>
              <input id="calc-qte" className="champ" type="number" min="1" inputMode="numeric" placeholder={t('ex. {v}', { v: 10 })} value={quantite} onChange={(e) => setQuantite(e.target.value)} />
              <p className="esp-aide">{t('Sert à répartir vos frais sur chaque pièce.')}</p>
            </div>

            <div className="esp-champ-bloc">
              <label>{t("Dépenses jusqu'à la vente (au total)")}</label>
              {depenses.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <input className="champ" style={{ flex: '1 1 50%' }} placeholder={t('ex. transport')} aria-label={t('Nom de la dépense {n}', { n: i + 1 })} value={d.nom} onChange={(e) => majDepense(i, 'nom', e.target.value)} />
                  <input className="champ" style={{ flex: '1 1 40%' }} type="number" min="0" inputMode="decimal" placeholder={t('Montant')} aria-label={t('Montant de la dépense {n}', { n: i + 1 })} value={d.montant} onChange={(e) => majDepense(i, 'montant', e.target.value)} />
                  <button type="button" className="esp-bouton-icone" aria-label={t('Retirer la dépense {n}', { n: i + 1 })} onClick={() => setDepenses((l) => l.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.9em', fontSize: '0.84rem' }} onClick={() => setDepenses((l) => [...l, { nom: '', montant: '' }])}><Plus size={14} /> {t('Ajouter une dépense')}</button>
              <p className="esp-aide">{t('Transport, emballage, taxes, location du stand…')}</p>
            </div>

            <div className="esp-champ-bloc">
              <label htmlFor="calc-marge">{t('Marge visée')}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input id="calc-marge" className="champ" type="number" min="0" inputMode="decimal" value={marge} onChange={(e) => setMarge(e.target.value)} />
                <select className="champ" style={{ width: 'auto' }} value={mode} onChange={(e) => setMode(e.target.value)} aria-label={t('Type de marge')}>
                  <option value="pourcent">{t('% de mon coût')}</option>
                  <option value="montant">{t('F CFA par pièce')}</option>
                </select>
              </div>
            </div>
          </form>

          <div className="esp-carte calc-resultat" aria-live="polite">
            {!r ? (
              <p className="esp-aide" style={{ margin: 'auto', textAlign: 'center' }}>{t("Entrez un prix d'achat pour voir le prix de vente conseillé.")}</p>
            ) : (
              <>
                <span className="etiquette">{t('Prix de vente conseillé')}</span>
                <div className="calc-prix">{f(r.prix)} <small>{t('F CFA / pièce')}</small></div>
                <dl className="calc-details">
                  <div><dt>{t("Coût de revient d'une pièce")}</dt><dd>{prixCFA(r.cout)}</dd></div>
                  <div><dt>{t('Bénéfice par pièce')}</dt><dd>{prixCFA(r.beneficeUnitaire)}</dd></div>
                  <div><dt>{t('Marge sur le prix de vente')}</dt><dd>{r.margeSurVente.toLocaleString(langue === 'en' ? 'en-US' : 'fr-FR', { maximumFractionDigits: 1 })} %</dd></div>
                  {r.quantite > 1 && <div><dt>{t('Bénéfice sur {n} pièces', { n: r.quantite })}</dt><dd><strong>{prixCFA(r.beneficeTotal)}</strong></dd></div>}
                  {r.quantite > 1 && <div><dt>{t("Chiffre d'affaires sur {n} pièces", { n: r.quantite })}</dt><dd>{prixCFA(r.chiffreAffaires)}</dd></div>}
                </dl>
                <p className="esp-aide" style={{ margin: '0.8rem 0 0' }}>{t('Prix arrondi aux 25 F CFA supérieurs.')}</p>
              </>
            )}
          </div>
        </div>

        <p style={{ marginTop: '2rem' }}>
          {t('Pas encore de fournisseur ?')} <Link to="/" style={{ color: 'var(--loo-rouge)', fontWeight: 700 }}>{t('Trouvez-en un au prix de gros →')}</Link>
        </p>
      </div>
    </section>
  );
}
