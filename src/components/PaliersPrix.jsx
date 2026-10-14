import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { prixCFA, quantite, uniteAccordee } from '../utils/prix.js';
import { useLangue } from '../i18n/Langue.jsx';

const prixFr = (n) => Number(n).toLocaleString('fr-FR');
export const MAX_PALIERS = 2; // + le prix de base = trois niveaux de prix au plus

// Les niveaux de prix d'un produit : le prix de base à partir du minimum, puis les paliers dégressifs
export function niveauxPrix(moq, prix, paliers) {
  return [{ min: Number(moq) || 1, prix: Number(prix) }, ...(Array.isArray(paliers) ? paliers : []).map((p) => ({ min: Number(p.min), prix: Number(p.prix) }))];
}

// Prix unitaire pour une quantité donnée (null si la quantité est sous le minimum)
export function prixPourQuantite(niveaux, qte) {
  if (!qte || qte < niveaux[0].min) return null;
  return niveaux.filter((n) => qte >= n.min).pop().prix;
}

// Fiche produit : les niveaux de prix côte à côte, puis le calcul du total selon la quantité tapée par l'acheteur
export function PaliersProduit({ moq, prix, paliers, unite }) {
  const { t } = useLangue();
  const niveaux = niveauxPrix(moq, prix, paliers);
  const [qte, setQte] = useState('');
  const n = Number(qte);
  const unitaire = prixPourQuantite(niveaux, n);

  return (
    <div className="paliers-produit">
      {/* Un seul prix : pas besoin d'étiquettes, le calcul du total suffit */}
      {niveaux.length > 1 && (
      <div className="paliers-cases" role="list" aria-label={t('Prix selon la quantité')}>
        {niveaux.map((niv, i) => {
          const suivant = niveaux[i + 1];
          const actif = unitaire != null && n >= niv.min && (!suivant || n < suivant.min);
          return (
            <div key={niv.min} role="listitem" className={`palier-case${actif ? ' palier-case-actif' : ''}`}>
              <span className="palier-qte">{suivant ? `${prixFr(niv.min)} – ${prixFr(suivant.min - 1)}` : t('{n} et plus', { n: prixFr(niv.min) })}</span>
              <strong>{prixFr(niv.prix)}</strong>
              <span className="palier-unite">{t('F CFA / {unite}', { unite: t(unite || 'pièce') })}</span>
            </div>
          );
        })}
      </div>
      )}

      <div className="calcul-total">
        <label htmlFor="quantite-voulue">{t('Votre quantité')}</label>
        <div className="calcul-ligne">
          <input id="quantite-voulue" className="champ" type="number" inputMode="numeric" min={niveaux[0].min} placeholder={String(niveaux[0].min)} value={qte} onChange={(e) => setQte(e.target.value)} />
          <span>{t(uniteAccordee(qte === '' ? niveaux[0].min : n, unite))}</span>
        </div>
        {qte !== '' && (unitaire == null
          ? <p className="calcul-alerte">{t('Le minimum de commande est de {q}.', { q: quantite(niveaux[0].min, unite) })}</p>
          : (
            <p className="calcul-resultat" aria-live="polite">
              <span>{quantite(n, unite)} × {prixCFA(unitaire)}</span>
              <strong>{t('Total : {total}', { total: prixCFA(unitaire * n) })}</strong>
            </p>
          ))}
      </div>
    </div>
  );
}

// Saisie des paliers dans le formulaire du fournisseur (deux paliers dégressifs au plus, après le prix de base)
export function EditeurPaliers({ paliers, onChange, moq, prixBase }) {
  const maj = (i, cle, valeur) => onChange(paliers.map((p, j) => (j === i ? { ...p, [cle]: valeur } : p)));
  const dernierMin = paliers.length ? Number(paliers[paliers.length - 1].min) || Number(moq) || 1 : Number(moq) || 1;
  return (
    <div className="esp-champ-bloc">
      <label>Prix dégressifs (facultatif)</label>
      <p className="esp-aide" style={{ margin: '0 0 0.5rem' }}>
        Plus l'acheteur commande, moins le prix est élevé. Votre prix de gros s'applique à partir de {Number(moq) || 1} ; ajoutez jusqu'à deux paliers,
        chacun à partir d'une quantité plus grande et avec un prix plus bas. Ces prix sont fermes : l'acheteur les voit et calcule son total.
      </p>
      {paliers.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <span>À partir de</span>
          <input className="champ" style={{ width: '7rem' }} type="number" min="1" inputMode="numeric" required aria-label={`Quantité du palier ${i + 1}`} value={p.min} onChange={(e) => maj(i, 'min', e.target.value)} />
          <span>pièces :</span>
          <input className="champ" style={{ width: '8rem' }} type="number" min="0" inputMode="numeric" required aria-label={`Prix du palier ${i + 1}`} value={p.prix} onChange={(e) => maj(i, 'prix', e.target.value)} />
          <span>F CFA</span>
          <button type="button" className="esp-bouton-icone" aria-label={`Retirer le palier ${i + 1}`} onClick={() => onChange(paliers.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
        </div>
      ))}
      {paliers.length < MAX_PALIERS && (
        <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.9em', fontSize: '0.84rem' }}
          onClick={() => onChange([...paliers, { min: String(dernierMin * 5), prix: String(Math.max(0, Math.round((paliers.length ? Number(paliers[paliers.length - 1].prix) : Number(prixBase) || 0) * 0.9))) }])}>
          <Plus size={14} /> Ajouter un palier
        </button>
      )}
    </div>
  );
}

// Palier saisis (textes) > palier pour la base ; renvoie { paliers, erreur }
export function normaliserPaliers(saisis, moq, prixBase) {
  const liste = saisis.map((p) => ({ min: Number(p.min), prix: Number(p.prix) }));
  let qte = Number(moq) || 1;
  let prix = Number(prixBase);
  for (const p of liste) {
    if (!Number.isInteger(p.min) || !Number.isInteger(p.prix)) return { erreur: 'Quantités et prix des paliers : nombres entiers uniquement.' };
    if (p.min <= qte) return { erreur: `Chaque palier doit commencer à une quantité supérieure à ${qte}.` };
    if (p.prix >= prix) return { erreur: `Le prix d'un palier doit être inférieur à ${prixFr(prix)} F CFA.` };
    qte = p.min;
    prix = p.prix;
  }
  return { paliers: liste };
}
