import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, BadgeCheck, MessageCircle, Package, Search, Send } from 'lucide-react';
import {
  suivreSession, recupererMonRole, recupererConversationsRiches, suivreActiviteMessages,
  recupererMessages, envoyerMessage, marquerMessagesLus, suivreFil,
} from '../api/fournisseurs.js';
import { analyserConversation } from '../utils/statsDemandes.js';
import {
  trierMessages, formatHeure, formatJour, formatRelatif, initiales, analyserDemande,
  REPONSES_FOURNISSEUR, REPONSES_ACHETEUR, contientCoordonnees,
} from '../utils/messagerie.js';

const STATUTS = {
  nouvelle: { texte: 'Nouvelle', classe: 'esp-puce-rouge' },
  en_cours: { texte: 'À répondre', classe: 'esp-puce-orange' },
  repondue: { texte: 'Répondue', classe: 'esp-puce-vert' },
};

// Une conversation prête à afficher, du point de vue du rôle connecté
function preparer(c, role) {
  const messages = trierMessages(c.message);
  const dernier = messages[messages.length - 1];
  const fournisseur = role === 'fournisseur';
  return {
    id: c.id,
    nom: fournisseur ? (c.vendeur?.nom || 'Acheteur') : (c.grossiste?.nom || 'Fournisseur'),
    sous: fournisseur ? c.vendeur?.activite : c.grossiste?.ville,
    logo: fournisseur ? null : c.grossiste?.logo_url,
    verifie: !fournisseur && !!c.grossiste?.badge_verifie,
    grossisteId: c.grossiste?.id,
    produit: c.produit || null,
    dernier,
    nonLus: messages.filter((m) => !m.lu && m.expediteur !== role).length,
    statut: analyserConversation(c).statut,
    horodatage: dernier?.date_envoi || c.derniere_activite,
  };
}

export default function Messagerie() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [brutes, setBrutes] = useState(undefined);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [seulementNonLus, setSeulementNonLus] = useState(false);

  useEffect(() => suivreSession(setSession), []);

  const charger = useCallback(() => recupererConversationsRiches().then(setBrutes).catch((err) => setErreur(err.message)), []);

  useEffect(() => {
    if (session === undefined) return undefined;
    if (session === null) { navigate('/connexion'); return undefined; }
    recupererMonRole().then((r) => setRole(r.role)).catch((err) => setErreur(err.message));
    charger();
    // Nouveau message ou message lu : on rafraîchit la liste (petit délai pour regrouper les évènements)
    let minuteur;
    const arreter = suivreActiviteMessages(() => { clearTimeout(minuteur); minuteur = setTimeout(charger, 400); });
    return () => { clearTimeout(minuteur); arreter(); };
  }, [session, navigate, charger]);

  const liste = useMemo(() => {
    if (!brutes || !role) return [];
    return brutes.map((c) => preparer(c, role)).sort((a, b) => new Date(b.horodatage) - new Date(a.horodatage));
  }, [brutes, role]);

  const q = recherche.trim().toLowerCase();
  const visibles = liste.filter((c) => (!seulementNonLus || c.nonLus > 0)
    && (!q || c.nom.toLowerCase().includes(q) || (c.produit?.nom || '').toLowerCase().includes(q)));
  const totalNonLus = liste.reduce((n, c) => n + c.nonLus, 0);
  const courante = liste.find((c) => c.id === id) || null;

  if (erreur && !brutes) return <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, padding: '1.5rem' }}>{erreur}</p>;
  if (session === undefined || brutes === undefined || !role) {
    return <div style={{ padding: '1.5rem' }}><div className="loo-squelette" style={{ height: '320px' }} /></div>;
  }

  const fournisseur = role === 'fournisseur';
  const contenu = (
    <>
      {fournisseur
        ? <h1 className="esp-titre-page" style={{ marginBottom: '0.8rem' }}>Demandes et messages</h1>
        : (
          <>
            <Link to="/" style={{ display: 'inline-block', marginBottom: '0.8rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--loo-rouge)' }}>← Retour à l'annuaire</Link>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.8rem' }}>Mes conversations</h1>
          </>
        )}

      <div className={`msg${id ? ' msg-ouverte' : ''}${fournisseur ? '' : ' msg-public'}`}>
        <aside className="msg-liste" aria-label="Conversations">
          <div className="msg-liste-haut">
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input className="champ" style={{ paddingLeft: '2.2rem', padding: '0.6em 0.8em 0.6em 2.2rem', fontSize: '0.9rem' }} type="search"
                placeholder={fournisseur ? 'Rechercher un acheteur ou un produit' : 'Rechercher un fournisseur ou un produit'} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', marginTop: '0.5rem' }}>
              <input type="checkbox" checked={seulementNonLus} onChange={(e) => setSeulementNonLus(e.target.checked)} />
              Non lus seulement{totalNonLus > 0 ? ` (${totalNonLus})` : ''}
            </label>
          </div>
          <div className="msg-liste-corps">
            {liste.length === 0 && (
              <p style={{ padding: '1.2rem', opacity: 0.7, fontSize: '0.9rem', margin: 0 }}>
                {fournisseur
                  ? "Aucune demande pour l'instant. Quand un acheteur vous écrira, elle apparaîtra ici."
                  : 'Aucune conversation. Trouvez un produit et demandez un devis à son fournisseur.'}
              </p>
            )}
            {liste.length > 0 && visibles.length === 0 && <p style={{ padding: '1.2rem', opacity: 0.7, fontSize: '0.9rem', margin: 0 }}>Aucun résultat.</p>}
            {visibles.map((c) => (
              <Link key={c.id} to={`/conversations/${c.id}`} className={`msg-ligne${c.id === id ? ' msg-ligne-active' : ''}${c.nonLus ? ' msg-ligne-nonlue' : ''}`}>
                <Avatar nom={c.nom} logo={c.logo} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                    <strong className="msg-nom">{c.nom}</strong>
                    <span className="msg-heure">{c.horodatage ? formatRelatif(c.horodatage) : ''}</span>
                  </div>
                  {c.produit?.nom && <div className="msg-produit">{c.produit.nom}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="msg-apercu">{c.dernier ? `${c.dernier.expediteur === role ? 'Vous : ' : ''}${apercu(c.dernier.contenu)}` : ''}</span>
                    {c.nonLus > 0
                      ? <span className="esp-pastille" style={{ position: 'static' }}>{c.nonLus}</span>
                      : fournisseur && <span className={`esp-puce ${STATUTS[c.statut].classe}`} style={{ fontSize: '0.66rem', padding: '0.1em 0.55em' }}>{STATUTS[c.statut].texte}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>

        <section className="msg-fil">
          {id && courante
            ? <Fil key={id} conversation={courante} role={role} onChange={charger} />
            : id
              ? <div className="msg-vide"><AlertCircle size={30} opacity={0.5} /><p>Cette conversation n'existe pas ou n'est plus disponible.</p><Link to="/conversations" className="btn btn-outline">Retour à la liste</Link></div>
              : <div className="msg-vide"><MessageCircle size={34} color="var(--loo-rouge)" /><p>Sélectionnez une conversation pour la lire et y répondre.</p></div>}
        </section>
      </div>
    </>
  );

  return fournisseur ? contenu : <section className="section" style={{ paddingTop: '2rem' }}><div className="container">{contenu}</div></section>;
}

const apercu = (texte = '') => (texte.startsWith('Demande de devis') ? 'Demande de devis' : texte.replace(/\s+/g, ' ').slice(0, 70));

function Avatar({ nom, logo, taille = 42 }) {
  return (
    <span className="esp-avatar" style={{ width: taille, height: taille, fontSize: taille * 0.36, flexShrink: 0 }}>
      {logo ? <img src={logo} alt="" /> : initiales(nom)}
    </span>
  );
}

// Fusionne des messages sans doublon (id) et remplace les envois provisoires correspondants
function fusionner(actuels, entrants, role) {
  const parId = new Map(actuels.filter((m) => !m.provisoire).map((m) => [m.id, m]));
  entrants.forEach((m) => parId.set(m.id, { ...parId.get(m.id), ...m }));
  const provisoires = actuels.filter((m) => m.provisoire && !entrants.some((e) => e.expediteur === role && e.contenu === m.contenu));
  return trierMessages([...parId.values(), ...provisoires]);
}

function Fil({ conversation, role, onChange }) {
  const [messages, setMessages] = useState(undefined);
  const [texte, setTexte] = useState('');
  const [erreur, setErreur] = useState('');
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const fin = useRef(null);
  const zone = useRef(null);
  const champ = useRef(null);
  const fournisseur = role === 'fournisseur';
  const id = conversation.id;

  // Chargement, temps réel (nouveaux messages et accusés de lecture), et relève régulière au cas où le temps réel serait coupé
  useEffect(() => {
    let actif = true;
    const recharger = () => recupererMessages(id).then((m) => { if (actif) setMessages((a) => fusionner(a || [], m, role)); }).catch((err) => { if (actif) setErreur(err.message); });
    recharger();
    const arreter = suivreFil(id, {
      onInsert: (m) => setMessages((a) => fusionner(a || [], [m], role)),
      onUpdate: (m) => setMessages((a) => fusionner(a || [], [m], role)),
    });
    const releve = setInterval(() => { if (document.visibilityState === 'visible') recharger(); }, 20000);
    const surVisibilite = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', surVisibilite);
    return () => { actif = false; arreter(); clearInterval(releve); document.removeEventListener('visibilitychange', surVisibilite); };
  }, [id, role]);

  // Marque comme lu seulement quand l'onglet est visible : « Vu » doit être vrai
  const nonLusRecus = (messages || []).filter((m) => !m.provisoire && !m.lu && m.expediteur !== role).length;
  useEffect(() => {
    if (!visible || nonLusRecus === 0) return;
    marquerMessagesLus(id, role).then(() => {
      setMessages((a) => (a || []).map((m) => (m.expediteur !== role ? { ...m, lu: true } : m)));
      onChange();
    }).catch(() => {});
  }, [visible, nonLusRecus, id, role, onChange]);

  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }); }, [messages?.length]);

  function ajusterHauteur() {
    const el = champ.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    el.style.overflowY = el.scrollHeight > 140 ? 'auto' : 'hidden'; // pas de flèches de défilement tant que le texte tient
  }
  useEffect(ajusterHauteur, [texte]);

  async function envoyer(contenuForce) {
    const contenu = (contenuForce ?? texte).trim();
    if (!contenu) return;
    const provisoire = { id: `tmp-${Date.now()}`, provisoire: true, expediteur: role, contenu, date_envoi: new Date().toISOString(), lu: false };
    setErreur('');
    setTexte('');
    setMessages((a) => [...(a || []), provisoire]);
    try {
      const cree = await envoyerMessage(id, contenu);
      setMessages((a) => fusionner((a || []).filter((m) => m.id !== provisoire.id), [cree], role));
      onChange();
    } catch (err) {
      setMessages((a) => (a || []).map((m) => (m.id === provisoire.id ? { ...m, echec: true } : m)));
      setErreur("Le message n'a pas été envoyé. Vérifiez votre connexion puis réessayez.");
    }
  }

  function reessayer(m) {
    setMessages((a) => (a || []).filter((x) => x.id !== m.id));
    envoyer(m.contenu);
  }

  function toucheEnfoncee(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); }
  }

  function inserer(modele) {
    setTexte((t) => (t && !/\s$/.test(t) ? `${t} ${modele}` : `${t}${modele}`));
    requestAnimationFrame(() => {
      const el = champ.current;
      if (!el) return;
      el.focus();
      const pos = el.value.indexOf('…');
      if (pos >= 0) el.setSelectionRange(pos, pos + 1);
    });
  }

  const p = conversation.produit;
  const reponses = fournisseur ? REPONSES_FOURNISSEUR : REPONSES_ACHETEUR;
  const dernierPropre = [...(messages || [])].reverse().find((m) => m.expediteur === role);

  return (
    <>
      <header className="msg-fil-haut">
        <Link to="/conversations" className="msg-retour" aria-label="Retour à la liste"><ArrowLeft size={20} /></Link>
        <Avatar nom={conversation.nom} logo={conversation.logo} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '1.02rem' }}>{conversation.nom}</strong>
            {conversation.verifie && <span className="badge badge-verifie"><BadgeCheck size={12} /> Vérifié</span>}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>
            {conversation.sous || (fournisseur ? 'Acheteur' : 'Fournisseur')}
          </div>
        </div>
        {!fournisseur && conversation.grossisteId && (
          <Link to={`/grossiste/${conversation.grossisteId}`} className="btn btn-outline" style={{ padding: '0.4em 0.9em', fontSize: '0.8rem' }}>Voir la page</Link>
        )}
      </header>

      {p && (
        <Link to={`/produit/${p.id}`} target={fournisseur ? '_blank' : undefined} className="msg-produit-carte">
          {p.photo_url ? <img src={p.photo_url} alt="" /> : <span className="msg-produit-vide"><Package size={20} opacity={0.5} /></span>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.74rem', opacity: 0.6 }}>À propos du produit</div>
            <strong style={{ fontSize: '0.9rem' }}>{p.nom}</strong>
            {p.prix_gros_fcfa != null && (
              <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                {Number(p.prix_gros_fcfa).toLocaleString('fr-FR')} F CFA{p.unite ? ` / ${p.unite}` : ''}{p.moq ? ` · minimum ${p.moq}` : ''}
              </div>
            )}
          </div>
        </Link>
      )}

      <div className="msg-fil-corps" ref={zone}>
        {messages === undefined && <div className="loo-squelette" style={{ height: 120 }} />}
        {messages && messages.length === 0 && <p style={{ opacity: 0.65, textAlign: 'center', margin: 'auto' }}>Aucun message pour l'instant.</p>}
        {messages && messages.map((m, i) => {
          const precedent = messages[i - 1];
          const suivant = messages[i + 1];
          const nouveauJour = !precedent || formatJour(precedent.date_envoi) !== formatJour(m.date_envoi);
          const proche = (a, b) => a && b && a.expediteur === b.expediteur && Math.abs(new Date(b.date_envoi) - new Date(a.date_envoi)) < 5 * 60000;
          const debutGroupe = nouveauJour || !proche(precedent, m);
          const finGroupe = !proche(m, suivant) || (suivant && formatJour(suivant.date_envoi) !== formatJour(m.date_envoi));
          const moi = m.expediteur === role;
          const demande = analyserDemande(m.contenu);
          return (
            <React.Fragment key={m.id}>
              {nouveauJour && <div className="msg-jour">{formatJour(m.date_envoi)}</div>}
              <div className={`msg-bulle ${moi ? 'msg-moi' : 'msg-lui'}${debutGroupe ? ' msg-debut' : ''}${m.provisoire ? ' msg-provisoire' : ''}`}>
                {demande ? (
                  <div>
                    <div className="msg-devis-titre">Demande de devis</div>
                    {demande.champs.map(([k, v]) => <div key={k} className="msg-devis-ligne"><span>{k}</span><strong>{v}</strong></div>)}
                    {demande.libre && <p className="msg-texte" style={{ marginTop: '0.5rem' }}>{demande.libre}</p>}
                  </div>
                ) : <p className="msg-texte">{m.contenu}</p>}
                {finGroupe && <span className="msg-meta">{formatHeure(m.date_envoi)}</span>}
              </div>
              {m.echec && <div className="msg-echec">Non envoyé. <button type="button" onClick={() => reessayer(m)}>Réessayer</button></div>}
              {moi && dernierPropre?.id === m.id && !m.echec && !m.provisoire && (
                <div className="msg-etat">{m.lu ? 'Vu' : 'Envoyé'}</div>
              )}
            </React.Fragment>
          );
        })}
        <div ref={fin} />
      </div>

      <div className="msg-saisie">
        {erreur && <p role="alert" style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.84rem', margin: '0 0 0.4rem' }}>{erreur}</p>}
        <div className="msg-rapides" aria-label="Réponses rapides">
          {reponses.map((r) => <button key={r} type="button" onClick={() => inserer(r)}>{r}</button>)}
        </div>
        {contientCoordonnees(texte) && (
          <p className="esp-aide" style={{ margin: '0 0 0.4rem', color: '#B8650A', opacity: 1 }}>
            Les numéros, e-mails et liens sont masqués automatiquement : tous les échanges se font sur LOOHOO, ce qui protège votre demande.
          </p>
        )}
        <form onSubmit={(e) => { e.preventDefault(); envoyer(); }} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
          <textarea ref={champ} className="champ" rows={1} placeholder="Écrivez votre message…" value={texte} onChange={(e) => setTexte(e.target.value)} onKeyDown={toucheEnfoncee} maxLength={2000} style={{ resize: 'none', maxHeight: 140, overflowY: 'hidden' }} />
          <button type="submit" className="btn btn-primary" disabled={!texte.trim()} aria-label="Envoyer" style={{ padding: '0.85em 1.1em' }}><Send size={17} /></button>
        </form>
        <div className="esp-aide" style={{ marginTop: '0.3rem' }}>Entrée pour envoyer, Maj+Entrée pour un retour à la ligne.</div>
      </div>
    </>
  );
}
