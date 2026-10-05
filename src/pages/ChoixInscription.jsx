import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Store } from 'lucide-react';
import RedirigerSiConnecte from '../components/RedirigerSiConnecte.jsx';

// La seule porte d'entrée pour créer un compte : deux choix évidents, une phrase chacun.
export default function ChoixInscription() {
  const { search } = useLocation();
  return (
    <section className="acces-page" style={{ flexDirection: 'column', alignItems: 'center' }}>
      <RedirigerSiConnecte />
      <div style={{ textAlign: 'center', marginBottom: '1.6rem', maxWidth: '560px' }}>
        <h1 className="acces-titre">Créer un compte LOOHOO</h1>
        <p className="acces-sous" style={{ marginBottom: 0 }}>Vous êtes acheteur ou fournisseur ? Choisissez ce qui vous correspond.</p>
      </div>

      <div className="acces-choix">
        <Link to={`/inscription/acheteur${search}`} className="acces-choix-carte">
          <span className="acces-choix-icone"><ShoppingBag size={26} /></span>
          <h2 style={{ fontSize: '1.3rem' }}>Je cherche des produits en gros</h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.55, flex: 1 }}>
            Trouvez un fournisseur vérifié, demandez un devis et discutez directement avec lui.
          </p>
          <span className="btn btn-primary" style={{ justifyContent: 'center' }}>Créer un compte acheteur <ArrowRight size={16} /></span>
        </Link>

        <Link to="/inscription/fournisseur" className="acces-choix-carte">
          <span className="acces-choix-icone"><Store size={26} /></span>
          <h2 style={{ fontSize: '1.3rem' }}>Je vends en gros</h2>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.55, flex: 1 }}>
            Présentez votre catalogue à des acheteurs, recevez des demandes de devis et obtenez le badge « Vérifié ».
          </p>
          <span className="btn btn-primary" style={{ justifyContent: 'center' }}>Créer un compte fournisseur <ArrowRight size={16} /></span>
        </Link>
      </div>

      <p style={{ marginTop: '1.6rem', fontSize: '0.95rem' }}>
        Vous avez déjà un compte ? <Link to={`/connexion${search}`} className="acces-lien">Se connecter</Link>
      </p>
      <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0 }}>
        Pas sûr ? <Link to="/devenir-fournisseur" className="acces-lien">Découvrez comment ça marche pour un fournisseur</Link>
      </p>
    </section>
  );
}
