import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLangue } from '../i18n/Langue.jsx';

// Champ mot de passe avec bouton « afficher » : évite les fautes de frappe, surtout sur téléphone
export default function ChampMotDePasse({ nouveau = false, ...props }) {
  const { t } = useLangue();
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        {...props} className="champ" style={{ paddingRight: '3rem' }} type={visible ? 'text' : 'password'}
        autoComplete={nouveau ? 'new-password' : 'current-password'}
      />
      <button
        type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
        style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', border: 0, background: 'none', cursor: 'pointer', padding: '0.4rem', display: 'inline-flex', color: 'var(--loo-encre)', opacity: 0.6 }}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
