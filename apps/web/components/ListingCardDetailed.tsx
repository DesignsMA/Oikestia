import Link from "next/link";
import { Icon, type IconName } from "./IconSprite";
import type { CardFeature } from "./ListingCardCompact";
import BotonFavorito from "./BotonFavorito";
import BotonCompartir from "./BotonCompartir";

type Props = {
  href: string;
  image: string;
  imageAlt: string;
  price: string;
  title: string;
  location: string;
  features: CardFeature[];
  agent: string;
  isFav?: boolean;
  slug?: string;
  favorito?: boolean;
  logueado?: boolean;
  rutaLogin?: string;
};

/** Card detallada: imagen grande, precio destacado, favorito, características y agente. */
export default function ListingCardDetailed({
  href,
  image,
  imageAlt,
  price,
  title,
  location,
  features,
  agent,
  isFav,
  slug,
  favorito = false,
  logueado = false,
  rutaLogin,
}: Props) {
  return (
    <article className={`property-card-detailed${isFav || favorito ? " is-fav" : ""}`}>
      <div className="card-media">
        <Link href={href} className="card-image-link" aria-label={`Ver ${title}`}>
          <img src={image} alt={imageAlt} className="card-image" />
        </Link>
        <p className="card-price">{price}</p>
        {slug ? (
          <BotonFavorito slug={slug} inicial={favorito} logueado={logueado} rutaLogin={rutaLogin} />
        ) : (
          <button type="button" className="card-fav" aria-label="Guardar en favoritos">
            <Icon name="i-heart" />
          </button>
        )}
        {slug ? <BotonCompartir slug={slug} titulo={title} icono /> : null}
      </div>

      <div className="card-body">
        <h3 className="card-title">{title}</h3>

        <p className="card-location">
          <Icon name="i-pin" />
          {location}
        </p>

        <ul className="card-features">
          {features.map((f) => (
            <li key={f.label}>
              <Icon name={f.icon} />
              {f.label}
            </li>
          ))}
        </ul>

        <p className="card-agent">
          <Icon name="i-agent" />
          {agent}
        </p>
      </div>
    </article>
  );
}
