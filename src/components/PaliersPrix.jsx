import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const prixFr = (n) => Number(n).toLocaleString('fr-FR');

// Tableau « Prix selon la quantité » pour l'acheteur : le prix de base, puis chaque palier.
export function TableauPaliers({ moq, prix, paliers, unite }) {
  if (!Array.isArray(paliers) || paliers.length === 0) return null;
  const lignes = [{ min: moq, prix }, ...paliers];
  return (
    <table className="paliers-table" aria-label="Prix de gros selon la quantité">
      <caption>Prix selon la quantité</caption>
      <tbody>
        {lignes.map((l, i) => {
          const suivant = lignes[i + 1];
          return (
            <tr key={l.min}>
              <th scope="row">{suivant ? `${prixFr(l.min)} à ${prixFr(suivant.min - 1)}` : `${prixFr(l.min)} et plus`}{unite ? ` ${unite}` : ''}</th>
              <td>{prixFr(l.prix)} F CFA</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Saisie des paliers dans le formulaire du fournisseur (4 au maximum)
export function EditeurPaliers({ paliers, onChange, moq, prixBase }) {
  const maj = (i, cle, valeur) => onChange(paliers.map((p, j) => (j === i ? { ...p, [cle]: valeur } : p)));
  const dernierMin = paliers.length ? Number(paliers[paliers.length - 1].min) || Number(moq) || 1 : Number(moq) || 1;
  return (
    <div className="esp-champ-bloc">
      <label>Prix dégressifs (facultatif)</label>
      <p className="esp-aide" style={{ margin: '0 0 0.5rem' }}>
        Plus l'acheteur commande, moins le prix est élevé. Chaque palier commence à une quantité plus grande que le précédent, avec un prix plus bas
        (le prix de gros ci-dessus s'applique à partir de {Number(moq) || 1}).
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
      {paliers.length < 4 && (
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
