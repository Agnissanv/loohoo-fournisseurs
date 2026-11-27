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

// Contrôle des paliers saisis (en texte) pendant la frappe.
// erreurs : un objet { min, prix } par palier, ce qui bloque la publication.
// avertissements : valeurs possibles mais suspectes (baisse de plus de 50 %, quantité au-delà du stock) : le fournisseur doit les confirmer.
export function controlerPaliers(saisis, moq, prixBase, stock) {
  const erreurs = saisis.map(() => ({}));
  const avertissements = [];
  let qtePrecedente = Number(moq) || 1;
  let prixPrecedent = Number(prixBase);
  const stockDeclare = stock === '' || stock == null ? null : Number(stock);

  saisis.forEach((p, i) => {
    const min = Number(p.min);
    const prix = Number(p.prix);
    if (p.min === '' || !Number.isInteger(min)) erreurs[i].min = 'Indiquez une quantité (nombre entier).';
    else if (min <= qtePrecedente) erreurs[i].min = `La quantité doit être supérieure à ${prixFr(qtePrecedente)}.`;
    if (p.prix === '' || !Number.isInteger(prix)) erreurs[i].prix = 'Indiquez un prix (nombre entier).';
    else if (prixPrecedent > 0 && prix >= prixPrecedent) erreurs[i].prix = `Le prix doit être inférieur à ${prixFr(prixPrecedent)} F CFA.`;

    if (!erreurs[i].min && !erreurs[i].prix) {
      if (prixPrecedent > 0 && prix < prixPrecedent / 2) {
        avertissements.push(`Palier ${i + 1} : le prix baisse de plus de moitié (de ${prixFr(prixPrecedent)} à ${prixFr(prix)} F CFA).`);
      }
      if (stockDeclare != null && min > stockDeclare) {
        avertissements.push(`Palier ${i + 1} : la quantité (${prixFr(min)}) est supérieure à votre stock déclaré (${prixFr(stockDeclare)}).`);
      }
    }
    if (!erreurs[i].min && Number.isInteger(min)) qtePrecedente = min;
    if (!erreurs[i].prix && Number.isInteger(prix)) prixPrecedent = prix;
  });
  return { erreurs, avertissements };
}

// Le tableau tel que l'acheteur le verra : « 5 à 9 pièces : 20 000 F — 10 à 19 pièces : 17 000 F — 20 pièces et plus : 16 000 F »
function apercuPaliers(paliers, moq, prixBase, unite) {
  const niveaux = niveauxPrix(moq, prixBase, paliers);
  const pluriel = uniteAccordee(2, unite || 'pièce');
  return niveaux.map((niv, i) => {
    const suivant = niveaux[i + 1];
    const quantites = suivant ? `${prixFr(niv.min)} à ${prixFr(suivant.min - 1)} ${pluriel}` : `${prixFr(niv.min)} ${pluriel} et plus`;
    return `${quantites} : ${prixFr(niv.prix)} F`;
  });
}

// Saisie des paliers dans le formulaire du fournisseur (deux paliers dégressifs au plus, après le prix de base)
// confirmation : texte des avertissements déjà confirmés par le fournisseur ; onConfirmer l'enregistre.
export function EditeurPaliers({ paliers, onChange, moq, prixBase, unite, stock, confirmation, onConfirmer }) {
  const maj = (i, cle, valeur) => onChange(paliers.map((p, j) => (j === i ? { ...p, [cle]: valeur } : p)));
  const dernierMin = paliers.length ? Number(paliers[paliers.length - 1].min) || Number(moq) || 1 : Number(moq) || 1;
  const pluriel = uniteAccordee(2, unite || 'pièce');
  const { erreurs, avertissements } = controlerPaliers(paliers, moq, prixBase, stock);
  const signature = avertissements.join('|');
  const valide = paliers.length > 0 && erreurs.every((e) => !e.min && !e.prix) && Number(prixBase) > 0;

  return (
    <div className="esp-champ-bloc" id="bloc-paliers">
      <label>Prix dégressifs (facultatif)</label>
      <p className="esp-aide" style={{ margin: '0 0 0.5rem' }}>
        Plus l'acheteur commande, moins le prix est élevé. Votre prix de gros s'applique à partir de {Number(moq) || 1} {uniteAccordee(Number(moq) || 1, unite || 'pièce')} ; ajoutez jusqu'à deux paliers,
        chacun à partir d'une quantité plus grande et avec un prix plus bas. Ces prix sont fermes : l'acheteur les voit et calcule son total.
      </p>
      {paliers.map((p, i) => (
        <div key={i} className="palier-saisie">
          <strong className="palier-saisie-titre">Palier {i + 1}</strong>
          <div className="palier-saisie-champ">
            <label htmlFor={`palier-min-${i}`}>Quantité ({pluriel})</label>
            <input id={`palier-min-${i}`} className={`champ${erreurs[i].min ? ' champ-erreur' : ''}`} type="number" min="1" inputMode="numeric" required
              aria-invalid={erreurs[i].min ? 'true' : undefined} placeholder="Ex. : 10" value={p.min} onChange={(e) => maj(i, 'min', e.target.value)} />
            {erreurs[i].min && <p className="esp-erreur-champ" role="alert">{erreurs[i].min}</p>}
          </div>
          <div className="palier-saisie-champ">
            <label htmlFor={`palier-prix-${i}`}>Prix unitaire (F CFA)</label>
            <input id={`palier-prix-${i}`} className={`champ${erreurs[i].prix ? ' champ-erreur' : ''}`} type="number" min="0" inputMode="numeric" required
              aria-invalid={erreurs[i].prix ? 'true' : undefined} placeholder="Ex. : 17000" value={p.prix} onChange={(e) => maj(i, 'prix', e.target.value)} />
            {erreurs[i].prix && <p className="esp-erreur-champ" role="alert">{erreurs[i].prix}</p>}
          </div>
          <button type="button" className="esp-bouton-icone" aria-label={`Retirer le palier ${i + 1}`} onClick={() => onChange(paliers.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
        </div>
      ))}
      {paliers.length < MAX_PALIERS && (
        <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.9em', fontSize: '0.84rem' }}
          onClick={() => onChange([...paliers, { min: String(dernierMin * 5), prix: String(Math.max(0, Math.round((paliers.length ? Number(paliers[paliers.length - 1].prix) : Number(prixBase) || 0) * 0.9))) }])}>
          <Plus size={14} /> Ajouter un palier
        </button>
      )}

      {avertissements.length > 0 && (
        <div className="palier-avertissement" role="alert">
          <strong>Vérifiez ces prix avant de publier</strong>
          <ul>{avertissements.map((a) => <li key={a}>{a}</li>)}</ul>
          <label className="palier-confirmation">
            <input type="checkbox" checked={confirmation === signature} onChange={(e) => onConfirmer(e.target.checked ? signature : '')} />
            Ces prix et ces quantités sont corrects
          </label>
        </div>
      )}

      {valide && (
        <div className="palier-apercu" aria-live="polite">
          <span className="palier-apercu-titre">Ce que l'acheteur verra</span>
          <p>{apercuPaliers(paliers, moq, prixBase, unite).join(' — ')}</p>
        </div>
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
