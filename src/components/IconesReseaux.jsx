import React from 'react';
import { Ghost } from 'lucide-react';

// Icônes simples des réseaux (dessinées ici : la bibliothèque d'icônes ne fournit plus les logos de marques)
const svg = (enfants) => function Icone({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{enfants}</svg>;
};

const WhatsApp = svg(<><path d="M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.6z" /><path d="M9 8.5c0 3.5 2.5 6.5 6.5 6.5l1-1.6-2-1-1 .8c-1.2-.5-2.2-1.5-2.7-2.7l.8-1-1-2z" /></>);
const TikTok = svg(<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.6 2.6 2.4 4.3 5 4.5" />);
const Facebook = svg(<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3.5H9V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" />);
const YouTube = svg(<><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></>);
const Instagram = svg(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" /></>);
const LinkedIn = svg(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7.5 10.5V17M7.5 7.4v.1M11.5 17v-6.5M11.5 13.5a2.5 2.5 0 0 1 5 0V17" /></>);

// Ordre d'affichage et libellés ; chaque lien n'apparaît que s'il est rempli dans l'administration
export const RESEAUX = [
  { cle: 'whatsapp', nom: 'WhatsApp', Icone: WhatsApp },
  { cle: 'whatsapp_chaine', nom: 'Chaîne WhatsApp', Icone: WhatsApp },
  { cle: 'tiktok', nom: 'TikTok', Icone: TikTok },
  { cle: 'facebook', nom: 'Facebook', Icone: Facebook },
  { cle: 'facebook_groupe', nom: 'Groupe Facebook', Icone: Facebook },
  { cle: 'youtube', nom: 'YouTube', Icone: YouTube },
  { cle: 'instagram', nom: 'Instagram', Icone: Instagram },
  { cle: 'linkedin', nom: 'LinkedIn', Icone: LinkedIn },
  { cle: 'snapchat', nom: 'Snapchat', Icone: ({ size = 20 }) => <Ghost size={size} aria-hidden="true" /> },
];
