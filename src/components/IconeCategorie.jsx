import React from 'react';
import {
  Baby, Car, Footprints, Gem, Hammer, HeartPulse, House, Laptop, Package, Refrigerator, Shirt,
  Smartphone, Sparkles, Sprout, Tag, Utensils, Wheat,
} from 'lucide-react';

const ICONES = {
  'Textile et pagnes': Shirt,
  'Mode et accessoires': Gem,
  'Chaussures et maroquinerie': Footprints,
  'Beauté et cosmétiques': Sparkles,
  'Santé et bien-être': HeartPulse,
  'Alimentation et boissons': Utensils,
  'Agriculture et agro-transformation': Wheat,
  'Électroménager': Refrigerator,
  'Électronique et téléphonie': Smartphone,
  'Informatique et bureau': Laptop,
  'Maison et décoration': House,
  'Quincaillerie et bâtiment': Hammer,
  'Emballage et papeterie': Package,
  'Jouets et enfants': Baby,
  'Auto et moto': Car,
};

// Icône d'une catégorie (étiquette générique si la catégorie n'est pas dans la liste)
export default function IconeCategorie({ nom, size = 24 }) {
  const Icone = ICONES[nom] || (nom && /sprout|agri/i.test(nom) ? Sprout : Tag);
  return <Icone size={size} />;
}
