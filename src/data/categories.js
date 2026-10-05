// Liste de départ des catégories, à faire valider par le client.
// En base, la catégorie reste du texte libre : cette liste ne sert qu'à guider la saisie
// (ajouter ou renommer une entrée ici ne casse rien, les anciens profils gardent leur valeur).
export const CATEGORIES = [
  'Textile et pagnes',
  'Mode et accessoires',
  'Chaussures et maroquinerie',
  'Beauté et cosmétiques',
  'Santé et bien-être',
  'Alimentation et boissons',
  'Agriculture et agro-transformation',
  'Électroménager',
  'Électronique et téléphonie',
  'Informatique et bureau',
  'Maison et décoration',
  'Quincaillerie et bâtiment',
  'Emballage et papeterie',
  'Jouets et enfants',
  'Auto et moto',
  'Autre',
];

// Sous-catégories proposées selon la catégorie (même statut : liste de départ à valider).
export const SOUS_CATEGORIES = {
  'Textile et pagnes': ['Pagnes wax', 'Tissus africains', 'Tissus unis', 'Dentelle et broderie', 'Fils et mercerie'],
  'Mode et accessoires': ['Vêtements femme', 'Vêtements homme', 'Vêtements enfant', 'Bijoux', 'Sacs et accessoires', 'Perruques et extensions'],
  'Chaussures et maroquinerie': ['Chaussures femme', 'Chaussures homme', 'Sandales et claquettes', 'Sacs en cuir'],
  'Beauté et cosmétiques': ['Soins du visage', 'Soins du corps', 'Soins des cheveux', 'Maquillage', 'Parfums', 'Savons'],
  'Santé et bien-être': ['Tisanes et thés de soin', 'Compléments alimentaires', 'Hygiène', 'Matériel médical'],
  'Alimentation et boissons': ['Céréales et farines', 'Huiles', 'Épices et condiments', 'Boissons', 'Conserves', 'Produits surgelés'],
  'Agriculture et agro-transformation': ['Cacao et café', 'Fruits et légumes', 'Noix et amandes', 'Produits transformés'],
  'Électroménager': ['Réfrigération', 'Cuisson', 'Climatisation et ventilation', 'Petit électroménager'],
  'Électronique et téléphonie': ['Téléphones', 'Accessoires téléphone', 'Audio', 'Télévision', 'Énergie solaire'],
  'Informatique et bureau': ['Ordinateurs', 'Imprimantes', 'Accessoires', 'Mobilier de bureau'],
  'Maison et décoration': ['Cuisine', 'Literie', 'Décoration', 'Rangement', 'Éclairage'],
  'Quincaillerie et bâtiment': ['Outillage', 'Plomberie', 'Électricité', 'Peinture', 'Carrelage'],
  'Emballage et papeterie': ['Sachets et sacs', 'Cartons', 'Étiquettes', 'Papeterie'],
  'Jouets et enfants': ['Jouets', 'Puériculture', 'Fournitures scolaires'],
  'Auto et moto': ['Pièces détachées', 'Pneus', 'Accessoires', 'Huiles et entretien'],
  Autre: [],
};
