-- ============================================================================
-- DONNÉES DE DÉMONSTRATION : deux fournisseurs et leurs produits.
-- Pour présenter la plateforme au client et tester le parcours acheteur de bout en bout.
-- À exécuter dans Supabase (SQL Editor) du projet « loohoo-fournisseurs ».
-- Peut être relancé sans créer de doublons (les produits de démo sont recréés à chaque fois).
--
-- AVANT DE LANCER :
--  1. Exécutez les migrations 0001, 0002 (et 0003 pour les statistiques de visites).
--  2. Créez DEUX comptes FOURNISSEUR depuis le site (/inscription/fournisseur), avec deux e-mails à vous.
--     Les champs saisis importent peu : le script remplace le profil. Si « Confirm email » est actif,
--     confirmez les deux e-mails et connectez-vous une fois à chaque compte (pour que le profil soit créé).
--  3. Remplacez les deux adresses ci-dessous par celles que vous avez utilisées.
--
-- CE QUE FAIT LE SCRIPT : publie les deux profils, ajoute leur présentation et leurs horaires, et crée
-- un catalogue de produits publiés (prix, quantité minimale, stock, dimensions, mots-clés).
-- CE QU'IL NE FAIT PAS : les photos (à ajouter depuis l'espace fournisseur : Médiathèque, puis Produits)
-- ni les conversations (à créer avec un compte acheteur via « Demander un devis » : c'est aussi un bon test).
--
-- Tous les produits de démo ont une référence qui commence par « DEMO- » : voir le nettoyage en bas.
-- ============================================================================

do $demo$
declare
  fournisseurs jsonb;
  f jsonb;
  v_user uuid;
  v_grossiste uuid;
  v_nb integer;
begin
  fournisseurs := $json$[
    {
      "email": "REMPLACEZ-PAR-L-EMAIL-DU-FOURNISSEUR-A@exemple.com",
      "nom": "Textiles Koné & Fils", "categorie": "Textile et pagnes", "ville": "Abidjan", "commune": "Adjamé",
      "est_fabricant": true, "badge_verifie": true,
      "description": "Fabricant ivoirien de pagnes, de tissus et de tenues traditionnelles. Nous livrons des revendeurs, des couturiers et des boutiques en ligne dans toute la Côte d'Ivoire.\nStock permanent, commandes à partir de quelques pièces.",
      "produits": [
        {"nom":"Pagne wax 6 yards","categorie":"Textile et pagnes","sous_categorie":"Pagnes wax","description":"Pagne wax 100 % coton, motifs assortis, 6 yards. Couleurs vives et résistantes au lavage. Idéal pour la couture et la revente.","tags":["pagne","wax","tissu africain","couture"],"prix_gros_fcfa":12500,"prix_unitaire_fcfa":15000,"moq":12,"stock_disponible":340,"unite":"pièce","sku":"DEMO-A-001","poids_grammes":1800,"longueur_cm":40,"largeur_cm":30,"hauteur_cm":12},
        {"nom":"Pagne wax qualité supérieure","categorie":"Textile et pagnes","sous_categorie":"Pagnes wax","description":"Wax double face, finition soignée, 6 yards. Motifs exclusifs renouvelés chaque mois.","tags":["pagne","wax","premium","double face"],"prix_gros_fcfa":18500,"prix_unitaire_fcfa":22000,"moq":6,"stock_disponible":120,"unite":"pièce","sku":"DEMO-A-002","poids_grammes":1900,"longueur_cm":40,"largeur_cm":30,"hauteur_cm":12},
        {"nom":"Bazin riche 5 mètres","categorie":"Textile et pagnes","sous_categorie":"Tissus africains","description":"Bazin riche brillant, teinture soignée, coupe de 5 mètres. Pour boubous et tenues de cérémonie.","tags":["bazin","boubou","cérémonie","tissu"],"prix_gros_fcfa":22000,"prix_unitaire_fcfa":26000,"moq":5,"stock_disponible":85,"unite":"pièce","sku":"DEMO-A-003","poids_grammes":1500,"longueur_cm":38,"largeur_cm":28,"hauteur_cm":10},
        {"nom":"Dentelle guipure brodée 5 m","categorie":"Textile et pagnes","sous_categorie":"Dentelle et broderie","description":"Dentelle guipure brodée, 5 mètres, plusieurs coloris. Vendue par lot, finitions propres.","tags":["dentelle","guipure","broderie","mariage"],"prix_gros_fcfa":16000,"moq":10,"stock_disponible":60,"unite":"pièce","sku":"DEMO-A-004","poids_grammes":900},
        {"nom":"Tissu uni coton 100 % (rouleau 50 m)","categorie":"Textile et pagnes","sous_categorie":"Tissus unis","description":"Rouleau de 50 mètres de coton uni, large 1,50 m. Convient à la couture, aux uniformes et à la décoration.","tags":["coton","tissu uni","rouleau","uniforme"],"prix_gros_fcfa":45000,"moq":2,"stock_disponible":30,"unite":"rouleau","sku":"DEMO-A-005","poids_grammes":9000,"longueur_cm":150,"largeur_cm":20,"hauteur_cm":20},
        {"nom":"Pagne tissé 100 % coton","categorie":"Textile et pagnes","sous_categorie":"Tissus africains","description":"Pagne tissé artisanalement, motifs traditionnels, très résistant. Fabriqué dans notre atelier.","tags":["pagne tissé","artisanal","coton","traditionnel"],"prix_gros_fcfa":12500,"moq":10,"stock_disponible":200,"unite":"pièce","sku":"DEMO-A-006","poids_grammes":1400},
        {"nom":"Boubou traditionnel brodé homme","categorie":"Mode et accessoires","sous_categorie":"Vêtements homme","description":"Boubou brodé trois pièces, plusieurs tailles et couleurs. Finitions main, prêt à porter.","tags":["boubou","homme","brodé","prêt à porter"],"prix_gros_fcfa":24500,"prix_unitaire_fcfa":30000,"moq":6,"stock_disponible":48,"unite":"pièce","sku":"DEMO-A-007","poids_grammes":1200},
        {"nom":"Foulard de tête prêt à nouer","categorie":"Mode et accessoires","sous_categorie":"Sacs et accessoires","description":"Foulard de tête en wax, prêt à nouer, motifs assortis. Petit prix pour la revente.","tags":["foulard","gele","accessoire femme","wax"],"prix_gros_fcfa":3500,"prix_unitaire_fcfa":5000,"moq":24,"stock_disponible":500,"unite":"pièce","sku":"DEMO-A-008","poids_grammes":150}
      ]
    },
    {
      "email": "REMPLACEZ-PAR-L-EMAIL-DU-FOURNISSEUR-B@exemple.com",
      "nom": "Délices du Terroir", "categorie": "Alimentation et boissons", "ville": "Bouaké", "commune": null,
      "est_fabricant": false, "badge_verifie": false,
      "description": "Grossiste en produits du terroir ivoirien : beurre de karité, épices, noix de cajou et huiles. Conditionnement en lots pour restaurateurs, épiceries et revendeurs.",
      "produits": [
        {"nom":"Beurre de karité pur","categorie":"Beauté et cosmétiques","sous_categorie":"Soins du corps","description":"Beurre de karité brut non raffiné, pot de 250 g. Pour la cosmétique artisanale et la revente.","tags":["karité","beurre","soin","cosmétique naturel"],"prix_gros_fcfa":3000,"prix_unitaire_fcfa":4000,"moq":24,"stock_disponible":600,"unite":"pièce","sku":"DEMO-B-001","poids_grammes":250},
        {"nom":"Noix de cajou décortiquées (sac 25 kg)","categorie":"Agriculture et agro-transformation","sous_categorie":"Noix et amandes","description":"Noix de cajou décortiquées, triées, sac de 25 kg. Idéal pour la transformation et la grande distribution.","tags":["cajou","anacarde","noix","vrac"],"prix_gros_fcfa":55000,"moq":2,"stock_disponible":40,"unite":"sac","sku":"DEMO-B-002","poids_grammes":25000},
        {"nom":"Huile de palme rouge 5 L","categorie":"Alimentation et boissons","sous_categorie":"Huiles","description":"Huile de palme rouge artisanale, bidon de 5 litres. Livraison en lots de 10.","tags":["huile de palme","huile","cuisine"],"prix_gros_fcfa":6500,"moq":10,"stock_disponible":150,"unite":"pièce","sku":"DEMO-B-003","poids_grammes":5000},
        {"nom":"Piment séché moulu 1 kg","categorie":"Alimentation et boissons","sous_categorie":"Épices et condiments","description":"Piment séché au soleil et moulu, sachet de 1 kg. Goût relevé, sans additif.","tags":["piment","épice","condiment"],"prix_gros_fcfa":4500,"moq":20,"stock_disponible":220,"unite":"kg","sku":"DEMO-B-004","poids_grammes":1000},
        {"nom":"Poivre noir en grains 1 kg","categorie":"Alimentation et boissons","sous_categorie":"Épices et condiments","description":"Poivre noir en grains, sachet de 1 kg, séchage naturel.","tags":["poivre","épice","grains"],"prix_gros_fcfa":7000,"moq":10,"stock_disponible":90,"unite":"kg","sku":"DEMO-B-005","poids_grammes":1000},
        {"nom":"Attiéké séché (sac 10 kg)","categorie":"Alimentation et boissons","sous_categorie":"Céréales et farines","description":"Attiéké séché, longue conservation, sac de 10 kg. Prêt à réhydrater.","tags":["attiéké","manioc","semoule"],"prix_gros_fcfa":9000,"moq":5,"stock_disponible":75,"unite":"sac","sku":"DEMO-B-006","poids_grammes":10000}
      ]
    }
  ]$json$::jsonb;

  for f in select * from jsonb_array_elements(fournisseurs) loop
    select id into v_user from auth.users where lower(email) = lower(f->>'email');
    if v_user is null then
      raise notice 'IGNORÉ : aucun compte avec l''e-mail « % » (vérifiez l''adresse en haut du script).', f->>'email';
      continue;
    end if;

    select id into v_grossiste from public.grossiste where user_id = v_user;
    if v_grossiste is null then
      raise notice 'IGNORÉ : le compte « % » n''a pas de profil fournisseur (confirmez l''e-mail et connectez-vous une fois au site).', f->>'email';
      continue;
    end if;

    update public.grossiste set
      nom = f->>'nom',
      categorie = f->>'categorie',
      ville = f->>'ville',
      commune = f->>'commune',
      est_fabricant = (f->>'est_fabricant')::boolean,
      badge_verifie = (f->>'badge_verifie')::boolean,
      stock_confirme = true,
      statut = 'publie',
      description = f->>'description',
      horaires_ouverture = jsonb_build_object(
        'lundi', '08:00 - 17:00', 'mardi', '08:00 - 17:00', 'mercredi', '08:00 - 17:00',
        'jeudi', '08:00 - 17:00', 'vendredi', '08:00 - 17:00', 'samedi', '08:00 - 13:00', 'dimanche', null
      )
    where id = v_grossiste;

    -- Recrée proprement le catalogue de démo de ce fournisseur
    delete from public.produit where grossiste_id = v_grossiste and sku like 'DEMO-%';

    insert into public.produit (
      grossiste_id, nom, categorie, sous_categorie, description, tags, prix_gros_fcfa, prix_unitaire_fcfa,
      moq, stock_disponible, unite, sku, poids_grammes, longueur_cm, largeur_cm, hauteur_cm, actif, statut
    )
    select
      v_grossiste, p.nom, p.categorie, p.sous_categorie, p.description, p.tags, p.prix_gros_fcfa, p.prix_unitaire_fcfa,
      p.moq, p.stock_disponible, p.unite, p.sku, p.poids_grammes, p.longueur_cm, p.largeur_cm, p.hauteur_cm, true, 'publie'
    from jsonb_to_recordset(f->'produits') as p(
      nom text, categorie text, sous_categorie text, description text, tags text[],
      prix_gros_fcfa integer, prix_unitaire_fcfa integer, moq integer, stock_disponible integer, unite text, sku text,
      poids_grammes integer, longueur_cm integer, largeur_cm integer, hauteur_cm integer
    );
    get diagnostics v_nb = row_count;
    raise notice 'OK : % publié avec % produits.', f->>'nom', v_nb;
  end loop;
end
$demo$;

-- ============================================================================
-- VÉRIFICATION : le script affiche aussi un message par fournisseur (onglet « Messages »).
-- ============================================================================
select g.nom, g.statut, g.badge_verifie, count(p.id) as produits
from public.grossiste g
left join public.produit p on p.grossiste_id = g.id and p.statut = 'publie'
group by g.id order by g.nom;

-- ============================================================================
-- NETTOYAGE : supprime uniquement les produits de démo (référence « DEMO- »). Les profils restent.
-- À lancer à part, quand la démonstration est terminée.
-- ============================================================================
-- delete from public.produit where sku like 'DEMO-%';
