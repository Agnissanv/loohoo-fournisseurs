import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { demanderReinitialisation } from '../api/fournisseurs.js';
import { useLangue } from '../i18n/Langue.jsx';

export default function MotDePasseOublie() {
  const { t } = useLangue();
  const [email, setEmail] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState('');

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur('');
    try {
      await demanderReinitialisation(email.trim());
      setEnvoye(true);
    } catch (err) {
      setErreur(
        /rate limit/i.test(err.message || '')
          ? t("Trop de demandes d'e-mail pour l'instant. Réessayez dans quelques minutes.")
          : t("Impossible d'envoyer l'e-mail pour le moment. Réessayez dans un instant.")
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="section" style={{ maxWidth: '420px', margin: '0 auto' }}>
      <div className="container">
        <span className="etiquette">{t('Espace LOOHOO')}</span>
        <h1 className="section-titre">{t('Mot de passe oublié')}</h1>

        {envoye ? (
          <>
            {/* Même message que l'adresse existe ou non : on ne révèle pas qui a un compte */}
            <p style={{ marginTop: '1.2rem', lineHeight: 1.6 }}>
              {t("Si un compte existe avec l'adresse {email}, vous allez recevoir un e-mail avec un lien pour choisir un nouveau mot de passe. Pensez à vérifier vos courriers indésirables.", { email })}
            </p>
            <Link to="/connexion" className="btn btn-outline" style={{ marginTop: '1rem' }}>{t('Retour à la connexion')}</Link>
          </>
        ) : (
          <form onSubmit={soumettre} style={{ display: 'grid', gap: '0.9rem', marginTop: '1.2rem' }}>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.92rem' }}>
              {t("Entrez l'adresse e-mail de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.")}
            </p>
            <input className="champ" type="email" required placeholder={t('E-mail')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            {erreur && <p style={{ color: 'var(--loo-rouge)', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{erreur}</p>}
            <button type="submit" className="btn btn-primary" disabled={envoi} style={{ justifyContent: 'center' }}>
              {envoi ? t('Envoi…') : t('Envoyer le lien')}
            </button>
            <Link to="/connexion" style={{ fontSize: '0.88rem', textDecoration: 'underline' }}>{t('Retour à la connexion')}</Link>
          </form>
        )}
      </div>
    </section>
  );
}
