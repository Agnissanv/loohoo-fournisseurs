import React from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, BarChart3, ClipboardCheck, MessageCircle, PackagePlus, ShieldCheck, UserPlus } from 'lucide-react';

const ETAPES = [
  { icone: UserPlus, titre: 'Créez votre profil', texte: "Entreprise, catégorie, ville, contact. Quelques minutes suffisent." },
  { icone: PackagePlus, titre: 'Ajoutez vos produits', texte: 'Photos, prix de gros, quantité minimale, stock. Les acheteurs cherchent un produit, pas un nom d\'entreprise.' },
  { icone: ClipboardCheck, titre: 'Notre équipe vérifie', texte: 'Nous contrôlons votre profil et chaque produit avant publication. Vous suivez le statut depuis votre tableau de bord.' },
  { icone: MessageCircle, titre: 'Recevez des demandes', texte: 'Les vendeurs vous écrivent depuis la plateforme. Vous répondez dans la messagerie.' },
];

const AVANTAGES = [
  { icone: BadgeCheck, titre: 'Le badge « Vérifié »', texte: "Il rassure l'acheteur avant même le premier message : il sait que quelqu'un a contrôlé votre activité." },
  { icone: ShieldCheck, titre: 'Votre numéro reste privé', texte: "Votre téléphone n'est jamais affiché. Vous êtes contacté par la messagerie, uniquement par des vendeurs inscrits." },
  { icone: BarChart3, titre: 'Des chiffres réels', texte: 'Visites de votre profil, demandes reçues, produits les plus demandés : vous voyez ce qui intéresse vos acheteurs.' },
];

const VERIFICATION = [
  'Un stock réellement disponible',
  'Des photos réelles de votre entreprise et de vos produits',
  'Un contact joignable',
  "Facultatif, mais ça accélère la vérification : RCCM, pièce d'identité du responsable, attestation de résidence",
];

const QUESTIONS = [
  {
    q: 'Qui peut devenir fournisseur ?',
    r: "Les grossistes et fabricants locaux, ainsi que les grossistes étrangers installés en Côte d'Ivoire, qui ont du stock et vendent en quantité.",
  },
  {
    q: 'Combien de temps prend la vérification ?',
    r: "Notre équipe examine chaque dossier. Votre tableau de bord indique à tout moment où en est votre profil et chacun de vos produits, avec le motif en cas de rejet.",
  },
  {
    q: 'Puis-je modifier mes produits après publication ?',
    r: "Oui. Prix, stock et quantité minimale se modifient immédiatement. Si vous changez le nom, la description ou la catégorie d'un produit, il repasse brièvement en vérification.",
  },
  {
    q: 'Les acheteurs voient-ils mon numéro de téléphone ?',
    r: "Non. Les échanges passent par la messagerie LOOHOO.",
  },
  {
    q: 'Je suis déjà inscrit, où me connecter ?',
    r: 'Utilisez la page de connexion avec votre e-mail et votre mot de passe.',
  },
];

export default function DevenirFournisseur() {
  return (
    <>
      <section style={styles.hero}>
        <div className="container" style={{ maxWidth: '760px' }}>
          <span className="etiquette">Pour les grossistes et fabricants</span>
          <h1 style={styles.titre}>Soyez trouvé par les vendeurs qui cherchent vos produits.</h1>
          <p style={styles.sousTitre}>
            LOOHOO Fournisseurs met votre catalogue devant des e-commerçants et des revendeurs qui veulent acheter en gros,
            et vous permet de leur répondre directement.
          </p>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1.6rem' }}>
            <Link to="/inscription/fournisseur" className="btn btn-primary">Créer mon compte fournisseur</Link>
            <Link to="/connexion" className="btn btn-outline">J'ai déjà un compte</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-titre">Comment ça marche</h2>
          <div style={styles.grille}>
            {ETAPES.map((e, i) => (
              <div key={e.titre} className="carte" style={styles.carte}>
                <span style={styles.numero}>{i + 1}</span>
                <e.icone size={22} color="var(--loo-rouge)" />
                <h3 style={styles.carteTitre}>{e.titre}</h3>
                <p style={styles.carteTexte}>{e.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 className="section-titre">Ce que vous y gagnez</h2>
          <div style={styles.grille}>
            {AVANTAGES.map((a) => (
              <div key={a.titre} className="carte" style={styles.carte}>
                <a.icone size={22} color="var(--loo-rouge)" />
                <h3 style={styles.carteTitre}>{a.titre}</h3>
                <p style={styles.carteTexte}>{a.texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: '760px' }}>
          <h2 className="section-titre">Ce que nous vérifions</h2>
          <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
            Le badge « Vérifié » doit rester une vraie garantie pour les acheteurs. Un profil sans stock confirmé n'est jamais publié.
          </p>
          <ul style={{ lineHeight: 1.9, paddingLeft: '1.2rem' }}>
            {VERIFICATION.map((v) => <li key={v}>{v}</li>)}
          </ul>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: '760px' }}>
          <h2 className="section-titre">Questions fréquentes</h2>
          {QUESTIONS.map((x) => (
            <details key={x.q} style={styles.faq}>
              <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{x.q}</summary>
              <p style={{ margin: '0.6rem 0 0', lineHeight: 1.6, opacity: 0.85 }}>{x.r}</p>
            </details>
          ))}
          <p style={{ marginTop: '1.4rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Une autre question ? Écrivez-nous à <a href="mailto:contact@looh-oo.com" style={{ textDecoration: 'underline' }}>contact@looh-oo.com</a>.
          </p>
          <Link to="/inscription/fournisseur" className="btn btn-primary" style={{ marginTop: '1rem' }}>Créer mon compte fournisseur</Link>
        </div>
      </section>
    </>
  );
}

const styles = {
  hero: { padding: '3.5rem 0 3rem', background: 'var(--loo-papier-ombre)' },
  titre: { fontSize: 'clamp(1.9rem, 4.5vw, 3rem)', lineHeight: 1.1, margin: '0.6rem 0 1rem' },
  sousTitre: { fontSize: '1.05rem', lineHeight: 1.6, opacity: 0.85, margin: 0 },
  grille: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.4rem' },
  carte: { padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' },
  numero: { position: 'absolute', top: '0.8rem', right: '1rem', fontFamily: 'var(--police-etiquette)', fontWeight: 600, opacity: 0.35 },
  carteTitre: { fontSize: '1.02rem', margin: 0 },
  carteTexte: { fontSize: '0.9rem', lineHeight: 1.55, opacity: 0.8, margin: 0 },
  faq: { borderTop: '1px solid var(--loo-papier-ombre)', padding: '0.9rem 0' },
};
