import React, { useState } from 'react';
import { Plus, Trash2, Video } from 'lucide-react';
import { televerserVideo, supprimerVideoStockage } from '../utils/stockagePhotos.js';
import { contientCoordonnees, promessesInterdites } from '../utils/messagerie.js';
import { LISTE_PAYS, drapeau } from '../utils/pays.js';
import { TYPES_ENTREPRISE, LANGUES, MOYENS_PAIEMENT, QUESTIONS_SUGGEREES, estProducteur } from '../utils/profilFournisseur.js';

const MAX_FAQ = 12;
const texteOuNull = (v) => (String(v ?? '').trim() || null);
const nombreOuNull = (v) => (v === '' || v == null ? null : Number(v));
const ouiNon = (v) => (v === true ? 'oui' : v === false ? 'non' : '');
const versBooleen = (v) => (v === 'oui' ? true : v === 'non' ? false : null);

// Espace fournisseur : la vitrine « Présentation de l'entreprise » (migration 0029), enregistrée d'un seul coup.
// Tout est publié tout de suite ; les coordonnées et les promesses sont refusées à l'envoi.
export default function VitrineEntreprise({ profil, enregistrer }) {
  const [c, setC] = useState(() => ({
    type_entreprise: profil.type_entreprise || '',
    pays_origine: profil.pays_origine || '',
    afficher_origine: !!profil.afficher_origine,
    langues: profil.langues?.length ? profil.langues : ['fr'],
    description: profil.description || '',
    annee_creation: profil.annee_creation ?? '',
    specialites: profil.specialites || '',
    emplacement: profil.emplacement || '',
    zones_expedition: profil.zones_expedition || '',
    moyens_paiement: profil.moyens_paiement || [],
    video_presentation_url: profil.video_presentation_url || null,
    atelier: profil.atelier || '',
    nb_employes: profil.nb_employes ?? '',
    capacite_production: profil.capacite_production || '',
    sur_mesure: ouiNon(profil.sur_mesure),
    pose_logo: ouiNon(profil.pose_logo),
    pays_provenance: profil.pays_provenance || '',
    marques: profil.marques || '',
    frequence_arrivages: profil.frequence_arrivages || '',
    faq: Array.isArray(profil.faq) ? profil.faq.map((x) => ({ q: x.q, r: x.r })) : [],
  }));
  const [envoiVideo, setEnvoiVideo] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState('');

  const maj = (cle) => (e) => setC((x) => ({ ...x, [cle]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const basculer = (cle, valeur) => setC((x) => ({ ...x, [cle]: x[cle].includes(valeur) ? x[cle].filter((v) => v !== valeur) : [...x[cle], valeur] }));
  const majFaq = (i, cle, valeur) => setC((x) => ({ ...x, faq: x.faq.map((f, j) => (j === i ? { ...f, [cle]: valeur } : f)) }));
  const ajouterQuestion = (q = '') => setC((x) => (x.faq.length >= MAX_FAQ ? x : { ...x, faq: [...x.faq, { q, r: '' }] }));

  const texteControle = [c.description, c.specialites, c.emplacement, c.zones_expedition, c.atelier, c.capacite_production,
    c.pays_provenance, c.marques, c.frequence_arrivages, ...c.faq.flatMap((f) => [f.q, f.r])].join(' ');
  const coordonnees = contientCoordonnees(texteControle);
  const promesses = promessesInterdites(texteControle);
  const suggestions = QUESTIONS_SUGGEREES.filter((q) => !c.faq.some((f) => f.q.trim() === q));
  const producteur = estProducteur(c.type_entreprise);

  async function choisirVideo(e) {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    if (!fichier.type.startsWith('video/')) { setErreur('Le fichier doit être une vidéo.'); return; }
    if (fichier.size > 50 * 1024 * 1024) { setErreur('Vidéo trop volumineuse (50 Mo maximum).'); return; }
    setErreur('');
    setEnvoiVideo(true);
    try {
      const url = await televerserVideo(profil.id, fichier);
      setC((x) => ({ ...x, video_presentation_url: url }));
    } catch (err) {
      setErreur(err.message || "L'envoi de la vidéo a échoué.");
    } finally {
      setEnvoiVideo(false);
    }
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur('');
    if (coordonnees || promesses.length) { setErreur('Retirez du texte les coordonnées et les promesses signalées en orange pour publier votre présentation.'); return; }
    const faq = c.faq.map((f) => ({ q: f.q.trim(), r: f.r.trim() })).filter((f) => f.q || f.r);
    if (faq.some((f) => !f.q || !f.r)) { setErreur('Chaque question de la FAQ doit avoir une réponse (ou retirez-la).'); return; }
    setEnregistrement(true);
    try {
      // La vidéo remplacée est retirée du stockage une fois la nouvelle enregistrée
      const ancienneVideo = profil.video_presentation_url && profil.video_presentation_url !== c.video_presentation_url ? profil.video_presentation_url : null;
      await enregistrer({
        type_entreprise: c.type_entreprise || null,
        pays_origine: c.pays_origine || null,
        afficher_origine: c.afficher_origine && !!c.pays_origine,
        langues: c.langues,
        description: texteOuNull(c.description),
        annee_creation: nombreOuNull(c.annee_creation),
        specialites: texteOuNull(c.specialites),
        emplacement: texteOuNull(c.emplacement),
        zones_expedition: texteOuNull(c.zones_expedition),
        moyens_paiement: c.moyens_paiement,
        video_presentation_url: c.video_presentation_url,
        atelier: producteur ? texteOuNull(c.atelier) : profil.atelier ?? null,
        nb_employes: producteur ? nombreOuNull(c.nb_employes) : profil.nb_employes ?? null,
        capacite_production: producteur ? texteOuNull(c.capacite_production) : profil.capacite_production ?? null,
        sur_mesure: producteur ? versBooleen(c.sur_mesure) : profil.sur_mesure ?? null,
        pose_logo: producteur ? versBooleen(c.pose_logo) : profil.pose_logo ?? null,
        pays_provenance: producteur ? profil.pays_provenance ?? null : texteOuNull(c.pays_provenance),
        marques: producteur ? profil.marques ?? null : texteOuNull(c.marques),
        frequence_arrivages: producteur ? profil.frequence_arrivages ?? null : texteOuNull(c.frequence_arrivages),
        faq,
      });
      if (ancienneVideo) supprimerVideoStockage(ancienneVideo).catch(() => {});
    } catch (err) {
      setErreur(err.message);
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <form className="esp-carte vitrine-form" id="vitrine" onSubmit={soumettre}>
      <h2 className="esp-carte-titre">Présentation de l'entreprise</h2>
      <p className="esp-aide" style={{ margin: '-0.4rem 0 0' }}>
        Votre vitrine sur votre page publique : tout ce qui rassure un acheteur avant de faire affaire. Publiée dès l'enregistrement.
        Pas de numéro, d'e-mail, de lien ni de promesse de livraison, de résultat ou de santé.
      </p>

      <fieldset className="vitrine-groupe">
        <legend>Votre entreprise</legend>
        <div className="esp-ligne-champs">
          <div className="esp-champ-bloc">
            <label htmlFor="v-type">Type d'entreprise</label>
            <select id="v-type" className="champ" required value={c.type_entreprise} onChange={maj('type_entreprise')}>
              <option value="">Choisir</option>
              {Object.entries(TYPES_ENTREPRISE).map(([v, l]) => <option key={v} value={v}>{l === 'Fabricant local' ? 'Fabricant' : l}</option>)}
            </select>
          </div>
          <div className="esp-champ-bloc">
            <label htmlFor="v-annee">Année de création</label>
            <input id="v-annee" className="champ" type="number" min="1900" max={new Date().getFullYear()} placeholder="Ex. : 2015" value={c.annee_creation} onChange={maj('annee_creation')} />
          </div>
        </div>
        <div className="esp-ligne-champs">
          <div className="esp-champ-bloc">
            <label htmlFor="v-origine">Origine de l'entreprise (facultatif)</label>
            <select id="v-origine" className="champ" value={c.pays_origine} onChange={maj('pays_origine')}>
              <option value="">Non précisée</option>
              {LISTE_PAYS.map((p) => <option key={p.code} value={p.code}>{drapeau(p.code)} {p.nom}</option>)}
            </select>
          </div>
          <label className="esp-champ-bloc" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'end', fontSize: '0.9rem' }}>
            <input type="checkbox" checked={c.afficher_origine} disabled={!c.pays_origine} onChange={maj('afficher_origine')} />
            Afficher l'origine sur ma page, avec le drapeau
          </label>
        </div>
        <div className="esp-champ-bloc">
          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Langues parlées</span>
          <div className="choix-puces">
            {Object.entries(LANGUES).map(([code, nom]) => (
              <label key={code} className="choix-puce"><input type="checkbox" checked={c.langues.includes(code)} onChange={() => basculer('langues', code)} /> {nom}</label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="vitrine-groupe">
        <legend>Présentation</legend>
        <div className="esp-champ-bloc">
          <label htmlFor="v-description">Présentez votre entreprise</label>
          <textarea id="v-description" className="champ" rows={7} maxLength={5000} value={c.description} onChange={maj('description')}
            placeholder="Votre histoire, ce que vous vendez, vos points forts, comment vous travaillez avec les revendeurs…" />
          <p className="esp-aide" style={{ textAlign: 'right' }}>{c.description.length}/5000</p>
        </div>
        <div className="esp-champ-bloc">
          <label htmlFor="v-specialites">Spécialités et principaux produits</label>
          <input id="v-specialites" className="champ" maxLength={400} placeholder="Ex. : pagnes wax, bazin, tissus brodés" value={c.specialites} onChange={maj('specialites')} />
        </div>
        <div className="esp-ligne-champs">
          <div className="esp-champ-bloc">
            <label htmlFor="v-emplacement">Emplacement</label>
            <input id="v-emplacement" className="champ" maxLength={200} placeholder="Ex. : Marché d'Adjamé, bâtiment B" value={c.emplacement} onChange={maj('emplacement')} />
            <p className="esp-aide">Le lieu, sans numéro de téléphone. Vos horaires se règlent plus bas.</p>
          </div>
          <div className="esp-champ-bloc">
            <label htmlFor="v-zones">Pays et villes où vous pouvez expédier</label>
            <input id="v-zones" className="champ" maxLength={400} placeholder="Ex. : toute la Côte d'Ivoire, Burkina Faso, Mali" value={c.zones_expedition} onChange={maj('zones_expedition')} />
          </div>
        </div>
        <div className="esp-champ-bloc">
          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Moyens de paiement acceptés</span>
          <div className="choix-puces">
            {Object.entries(MOYENS_PAIEMENT).map(([code, nom]) => (
              <label key={code} className="choix-puce"><input type="checkbox" checked={c.moyens_paiement.includes(code)} onChange={() => basculer('moyens_paiement', code)} /> {nom}</label>
            ))}
          </div>
        </div>
        <div className="esp-champ-bloc">
          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Courte vidéo de présentation (facultatif, 50 Mo max)</span>
          {c.video_presentation_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.88rem' }}>
              <Video size={16} aria-hidden="true" /> Vidéo prête{c.video_presentation_url !== profil.video_presentation_url ? ' : enregistrez pour la publier' : ''}
              <button type="button" className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.3em 0.8em' }} onClick={() => setC((x) => ({ ...x, video_presentation_url: null }))}>Retirer</button>
            </div>
          ) : (
            <label className="btn btn-outline" style={{ cursor: 'pointer', fontSize: '0.82rem', padding: '0.5em 1em', justifySelf: 'start' }}>
              <Video size={15} aria-hidden="true" /> {envoiVideo ? 'Envoi…' : 'Ajouter une vidéo'}
              <input type="file" accept="video/*" hidden disabled={envoiVideo} onChange={choisirVideo} />
            </label>
          )}
        </div>
      </fieldset>

      {c.type_entreprise && (
        <fieldset className="vitrine-groupe">
          <legend>{producteur ? 'Votre production' : 'Votre approvisionnement'}</legend>
          {producteur ? (
            <>
              <div className="esp-champ-bloc">
                <label htmlFor="v-atelier">L'atelier (ou l'exploitation)</label>
                <textarea id="v-atelier" className="champ" rows={3} maxLength={800} placeholder="Ex. : atelier de 200 m², 12 machines à coudre" value={c.atelier} onChange={maj('atelier')} />
              </div>
              <div className="esp-ligne-champs">
                <div className="esp-champ-bloc">
                  <label htmlFor="v-employes">Nombre d'employés</label>
                  <input id="v-employes" className="champ" type="number" min="1" value={c.nb_employes} onChange={maj('nb_employes')} />
                </div>
                <div className="esp-champ-bloc">
                  <label htmlFor="v-capacite">Capacité de production par mois</label>
                  <input id="v-capacite" className="champ" maxLength={200} placeholder="Ex. : 5 000 pièces" value={c.capacite_production} onChange={maj('capacite_production')} />
                </div>
              </div>
              <div className="esp-ligne-champs">
                <div className="esp-champ-bloc">
                  <label htmlFor="v-mesure">Sur-mesure</label>
                  <select id="v-mesure" className="champ" value={c.sur_mesure} onChange={maj('sur_mesure')}><option value="">Non précisé</option><option value="oui">Oui</option><option value="non">Non</option></select>
                </div>
                <div className="esp-champ-bloc">
                  <label htmlFor="v-logo">Pose de logo</label>
                  <select id="v-logo" className="champ" value={c.pose_logo} onChange={maj('pose_logo')}><option value="">Non précisé</option><option value="oui">Oui</option><option value="non">Non</option></select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="esp-champ-bloc">
                <label htmlFor="v-provenance">Pays d'où vient la marchandise</label>
                <input id="v-provenance" className="champ" maxLength={200} placeholder="Ex. : Chine, Turquie, Nigeria" value={c.pays_provenance} onChange={maj('pays_provenance')} />
              </div>
              <div className="esp-ligne-champs">
                <div className="esp-champ-bloc">
                  <label htmlFor="v-marques">Marques distribuées</label>
                  <input id="v-marques" className="champ" maxLength={400} value={c.marques} onChange={maj('marques')} />
                </div>
                <div className="esp-champ-bloc">
                  <label htmlFor="v-arrivages">Fréquence des arrivages</label>
                  <input id="v-arrivages" className="champ" maxLength={120} placeholder="Ex. : toutes les deux semaines" value={c.frequence_arrivages} onChange={maj('frequence_arrivages')} />
                </div>
              </div>
            </>
          )}
        </fieldset>
      )}

      <fieldset className="vitrine-groupe">
        <legend>Questions fréquentes ({c.faq.length}/{MAX_FAQ})</legend>
        <p className="esp-aide" style={{ margin: '-0.3rem 0 0' }}>Répondez à l'avance aux questions que les acheteurs vous posent souvent.</p>
        {c.faq.map((f, i) => (
          <div key={i} className="faq-ligne">
            <div className="faq-ligne-tete">
              <span>Question {i + 1}</span>
              <button type="button" className="esp-bouton-icone" aria-label={`Retirer la question ${i + 1}`} onClick={() => setC((x) => ({ ...x, faq: x.faq.filter((_, j) => j !== i) }))}><Trash2 size={15} /></button>
            </div>
            <input className="champ" maxLength={200} placeholder="La question" aria-label={`Question ${i + 1}`} value={f.q} onChange={(e) => majFaq(i, 'q', e.target.value)} />
            <textarea className="champ" rows={2} maxLength={1000} placeholder="Votre réponse" aria-label={`Réponse à la question ${i + 1}`} value={f.r} onChange={(e) => majFaq(i, 'r', e.target.value)} />
          </div>
        ))}
        {c.faq.length < MAX_FAQ && (
          <>
            {suggestions.length > 0 && (
              <div className="faq-suggestions" aria-label="Questions suggérées">
                {suggestions.map((q) => <button key={q} type="button" className="faq-suggestion" onClick={() => ajouterQuestion(q)}>+ {q}</button>)}
              </div>
            )}
            <button type="button" className="btn btn-outline" style={{ justifySelf: 'start', fontSize: '0.84rem', padding: '0.45em 1em' }} onClick={() => ajouterQuestion()}>
              <Plus size={14} aria-hidden="true" /> Ajouter une question
            </button>
          </>
        )}
      </fieldset>

      {(coordonnees || promesses.length > 0) && (
        <div role="alert" className="esp-aide" style={{ color: '#B8650A', opacity: 1, fontWeight: 600 }}>
          {coordonnees && <p style={{ margin: '0 0 0.2rem' }}>Retirez les numéros, e-mails et liens : les acheteurs vous contactent par LOOHOO.</p>}
          {promesses.length > 0 && <p style={{ margin: 0 }}>Votre texte contient {promesses.join(', ')}. Ces promesses ne sont pas autorisées.</p>}
        </div>
      )}
      {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, margin: 0 }}>{erreur}</p>}
      <div>
        <button type="submit" className="btn btn-primary" disabled={enregistrement || envoiVideo}>{enregistrement ? 'Publication…' : 'Publier ma présentation'}</button>
      </div>
    </form>
  );
}
