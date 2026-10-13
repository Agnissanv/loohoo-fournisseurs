import React from 'react';
import { Info } from 'lucide-react';
import { useLangue } from '../i18n/Langue.jsx';

// Rappel affiché là où le fournisseur envoie des images (bannière, photos, produits)
export default function ConsigneImages() {
  const { t } = useLangue();
  return (
    <p className="consigne-images">
      <Info size={15} aria-hidden="true" />
      <span>{t("Vos images ne doivent contenir ni numéro de téléphone, ni code QR, ni adresse e-mail, ni lien ou nom de réseau social, ni promesse de livraison, de résultat ou de santé. Les acheteurs vous contactent par la messagerie LOOHOO.")}</span>
    </p>
  );
}
