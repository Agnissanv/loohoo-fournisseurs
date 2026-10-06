import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileUp, Check, X } from 'lucide-react';
import { suivreSession, recupererMonProfil, ajouterProduit } from '../api/fournisseurs.js';
import { useCategories } from '../utils/useCategories.js';
import { modeleCsv, validerCsv, MAX_LIGNES } from '../utils/importProduits.js';
import { useTitre } from '../utils/useTitre.js';

// Ajouter plusieurs produits d'un coup depuis un fichier CSV. Les produits importés passent par la vérification de l'équipe
// comme les autres ; les photos s'ajoutent ensuite produit par produit.
export default function ImportProduits() {
  useTitre('Importer des produits');
  const navigate = useNavigate();
  const { categories, sous } = useCategories();
  const [session, setSession] = useState(undefined);
  const [profil, setProfil] = useState(undefined);
  const [analyse, setAnalyse] = useState(null); // { lignes, erreurGlobale, fichier }
  const [envoi, setEnvoi] = useState(false);
  const [resultats, setResultats] = useState(null); // { ok, echecs: [{ numero, nom, message }] }
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreSession(setSession), []);
  useEffect(() => {
    if (session === undefined) return;
    if (session === null) { navigate('/connexion'); return; }
    recupererMonProfil(session.user.id).then(setProfil).catch((err) => setErreur('Impossible de charger votre profil : ' + err.message));
  }, [session, navigate]);

  function telechargerModele() {
    const blob = new Blob([modeleCsv(categories[0] || '')], { type: 'text/csv;charset=utf-8' });
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(blob);
    lien.download = 'modele-produits-loohoo.csv';
    lien.click();
    URL.revokeObjectURL(lien.href);
  }

  async function choisirFichier(e) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setResultats(null);
    setErreur('');
    if (!/\.(csv|txt)$/i.test(fichier.name)) {
      setAnalyse(null);
      setErreur('Ce fichier n\'est pas un CSV. Dans Excel : Fichier > Enregistrer sous > « CSV (séparateur : point-virgule) ».');
      return;
    }
    const texte = await fichier.text();
    setAnalyse({ ...validerCsv(texte, categories, sous), fichier: fichier.name });
  }

  async function importer() {
    const valides = analyse.lignes.filter((l) => l.produit);
    setEnvoi(true);
    setErreur('');
    const echecs = [];
    let ok = 0;
    for (const l of valides) {
      try {
        await ajouterProduit(profil.id, l.produit);
        ok += 1;
      } catch (err) {
        echecs.push({ numero: l.numero, nom: l.nom, message: err.message });
      }
    }
    setEnvoi(false);
    setResultats({ ok, echecs });
    setAnalyse(null);
  }

  if (session === undefined || profil === undefined) return <div className="loo-squelette" style={{ height: '200px' }} />;
  if (!profil) return <p>{erreur || 'Aucun profil fournisseur associé à ce compte.'}</p>;

  const valides = analyse ? analyse.lignes.filter((l) => l.produit).length : 0;
  const invalides = analyse ? analyse.lignes.length - valides : 0;

  return (
    <>
      <Link to="/produits" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-rouge)', marginBottom: '0.8rem' }}>
        <ArrowLeft size={16} /> Mes produits
      </Link>
      <h1 className="esp-titre-page">Importer des produits</h1>

      <div className="esp-carte" style={{ marginBottom: '1rem' }}>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>Téléchargez le modèle et remplissez-le dans Excel (une ligne par produit, {MAX_LIGNES} maximum).</li>
          <li>Enregistrez-le en CSV : <em>Fichier &gt; Enregistrer sous &gt; CSV (séparateur : point-virgule)</em>.</li>
          <li>Choisissez le fichier ici : vous voyez ce qui sera importé avant de valider.</li>
          <li>Ajoutez ensuite une photo à chaque produit. Notre équipe vérifie les produits avant publication.</li>
        </ol>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" className="btn btn-outline" onClick={telechargerModele}><Download size={16} /> Télécharger le modèle</button>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <FileUp size={16} /> Choisir mon fichier CSV
            <input type="file" accept=".csv,.txt,text/csv" onChange={choisirFichier} style={{ display: 'none' }} />
          </label>
        </div>
        <p className="esp-aide" style={{ margin: '0.8rem 0 0' }}>
          Colonnes : nom et prix_gros_fcfa sont obligatoires. categorie, sous_categorie, description, moq (1 par défaut), unite, stock et mots_cles (séparés par des virgules) sont facultatives.
          La catégorie doit être l'une de celles proposées dans le formulaire d'un produit.
        </p>
      </div>

      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{erreur}</p>}

      {resultats && (
        <div className="esp-carte" role="status" style={{ borderColor: resultats.echecs.length ? 'var(--loo-orange)' : '#1f7a3d' }}>
          <h2 className="esp-carte-titre"><span>{resultats.ok} produit{resultats.ok > 1 ? 's' : ''} importé{resultats.ok > 1 ? 's' : ''}</span></h2>
          {resultats.echecs.map((f) => (
            <p key={f.numero} style={{ margin: '0.3rem 0', color: 'var(--loo-rouge)', fontSize: '0.9rem' }}>Ligne {f.numero} ({f.nom}) : {f.message}</p>
          ))}
          <Link to="/produits" className="btn btn-primary" style={{ marginTop: '0.8rem' }}>Voir mes produits et ajouter les photos</Link>
        </div>
      )}

      {analyse?.erreurGlobale && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600 }}>{analyse.erreurGlobale}</p>}

      {analyse && !analyse.erreurGlobale && (
        <div className="esp-carte">
          <h2 className="esp-carte-titre"><span>{analyse.fichier} : {valides} prêt{valides > 1 ? 's' : ''}{invalides ? `, ${invalides} à corriger` : ''}</span></h2>
          <div className="adm-defile" style={{ overflowX: 'auto' }}>
            <table className="adm-table" style={{ width: '100%' }}>
              <thead><tr><th>Ligne</th><th>Produit</th><th>Prix de gros</th><th>Minimum</th><th>État</th></tr></thead>
              <tbody>
                {analyse.lignes.map((l) => (
                  <tr key={l.numero}>
                    <td>{l.numero}</td>
                    <td>{l.nom || '–'}</td>
                    <td>{l.produit ? `${l.produit.prix_gros_fcfa.toLocaleString('fr-FR')} F CFA` : '–'}</td>
                    <td>{l.produit ? l.produit.moq : '–'}</td>
                    <td>
                      {l.produit
                        ? <span className="esp-puce esp-puce-vert"><Check size={13} /> Prêt</span>
                        : <span style={{ color: 'var(--loo-rouge)', fontSize: '0.85rem' }}><X size={13} /> {l.erreurs.join(' · ')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {invalides > 0 && <p className="esp-aide">Les lignes à corriger ne seront pas importées. Corrigez-les dans votre fichier puis rechargez-le, ou importez les lignes prêtes maintenant et ajoutez le reste à la main.</p>}
          <button type="button" className="btn btn-primary" style={{ marginTop: '0.8rem' }} disabled={envoi || valides === 0} onClick={importer}>
            {envoi ? 'Import en cours…' : `Importer ${valides} produit${valides > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </>
  );
}
