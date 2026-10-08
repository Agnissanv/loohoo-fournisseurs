import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { calculerPrixVente } from '../utils/calculMarge.js';
import { useTitre } from '../utils/useTitre.js';

const f = (n) => Math.round(n).toLocaleString('fr-FR');

// Outil gratuit pour les revendeurs : combien vendre pour gagner ce qu'on vise ? Rien n'est envoyé ni enregistré.
export default function CalculateurMarge() {
  useTitre('Calculateur de marge', 'Calculez le prix de vente conseillé de vos produits à partir du prix d\'achat, des dépenses et de la marge visée.');
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
        <span className="etiquette">Outil gratuit</span>
        <h1 className="section-titre">Calculateur de marge</h1>
        <p className="section-intro">À quel prix vendre pour gagner ce que vous visez ? Entrez ce que vous payez, ajoutez vos frais, choisissez votre marge.</p>

        <div className="calc-grille">
          <form className="esp-carte" onSubmit={(e) => e.preventDefault()}>
            <div className="esp-champ-bloc">
              <label htmlFor="calc-achat">Prix d'achat d'une pièce (F CFA)</label>
              <input id="calc-achat" className="champ" type="number" min="0" inputMode="decimal" placeholder="ex. 3500" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
            </div>
            <div className="esp-champ-bloc">
              <label htmlFor="calc-qte">Quantité achetée</label>
              <input id="calc-qte" className="champ" type="number" min="1" inputMode="numeric" placeholder="ex. 10" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
              <p className="esp-aide">Sert à répartir vos frais sur chaque pièce.</p>
            </div>

            <div className="esp-champ-bloc">
              <label>Dépenses jusqu'à la vente (au total)</label>
              {depenses.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                  <input className="champ" style={{ flex: '1 1 50%' }} placeholder="ex. transport" aria-label={`Nom de la dépense ${i + 1}`} value={d.nom} onChange={(e) => majDepense(i, 'nom', e.target.value)} />
                  <input className="champ" style={{ flex: '1 1 40%' }} type="number" min="0" inputMode="decimal" placeholder="Montant" aria-label={`Montant de la dépense ${i + 1}`} value={d.montant} onChange={(e) => majDepense(i, 'montant', e.target.value)} />
                  <button type="button" className="esp-bouton-icone" aria-label={`Retirer la dépense ${i + 1}`} onClick={() => setDepenses((l) => l.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-outline" style={{ padding: '0.4em 0.9em', fontSize: '0.84rem' }} onClick={() => setDepenses((l) => [...l, { nom: '', montant: '' }])}><Plus size={14} /> Ajouter une dépense</button>
              <p className="esp-aide">Transport, emballage, taxes, location du stand…</p>
            </div>

            <div className="esp-champ-bloc">
              <label htmlFor="calc-marge">Marge visée</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input id="calc-marge" className="champ" type="number" min="0" inputMode="decimal" value={marge} onChange={(e) => setMarge(e.target.value)} />
                <select className="champ" style={{ width: 'auto' }} value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Type de marge">
                  <option value="pourcent">% de mon coût</option>
                  <option value="montant">F CFA par pièce</option>
                </select>
              </div>
            </div>
          </form>

          <div className="esp-carte calc-resultat" aria-live="polite">
            {!r ? (
              <p className="esp-aide" style={{ margin: 'auto', textAlign: 'center' }}>Entrez un prix d'achat pour voir le prix de vente conseillé.</p>
            ) : (
              <>
                <span className="etiquette">Prix de vente conseillé</span>
                <div className="calc-prix">{f(r.prix)} <small>F CFA / pièce</small></div>
                <dl className="calc-details">
                  <div><dt>Coût de revient d'une pièce</dt><dd>{f(r.cout)} F</dd></div>
                  <div><dt>Bénéfice par pièce</dt><dd>{f(r.beneficeUnitaire)} F</dd></div>
                  <div><dt>Marge sur le prix de vente</dt><dd>{r.margeSurVente.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %</dd></div>
                  {r.quantite > 1 && <div><dt>Bénéfice sur {r.quantite} pièces</dt><dd><strong>{f(r.beneficeTotal)} F</strong></dd></div>}
                  {r.quantite > 1 && <div><dt>Chiffre d'affaires sur {r.quantite} pièces</dt><dd>{f(r.chiffreAffaires)} F</dd></div>}
                </dl>
                <p className="esp-aide" style={{ margin: '0.8rem 0 0' }}>Prix arrondi aux 25 F supérieurs.</p>
              </>
            )}
          </div>
        </div>

        <p style={{ marginTop: '2rem' }}>
          Pas encore de fournisseur ? <Link to="/" style={{ color: 'var(--loo-rouge)', fontWeight: 700 }}>Trouvez-en un au prix de gros →</Link>
        </p>
      </div>
    </section>
  );
}
