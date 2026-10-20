import Link from "next/link";
import { Icon, type IconName } from "./IconSprite";
import BotonFavorito from "./BotonFavorito";
import BotonCompartir from "./BotonCompartir";

export type CardFeature = {
  icon: IconName;
  label: string;
};

type Props = {
  href: string;
  image: string;
  imageAlt: string;
  price: string;
  title: string;
  location: string;
  features: CardFeature[];
  tag?: string;
  linkLabel?: string;
  slug?: string;
  favorito?: boolean;
  logueado?: boolean;
};

/** Card compacta: imagen con precio encima, título, ubicación y fila mínima de datos. */
export default function ListingCardCompact({
  href,
  image,
  imageAlt,
  price,
  title,
  location,
  features,
  tag,
  linkLabel,
  slug,
  favorito = false,
  logueado = false,
}: Props) {
  return (
    <article className="property-card-compact">
      <div className="card-media">
        <Link href={href} className="card-image-link" aria-label={`Ver ${title}`}>
          <img src={image} alt={imageAlt} className="card-image" />
        </Link>
        <p className="card-price">{price}</p>
        {tag ? <span className="card-tag">{tag}</span> : null}
        {slug ? (
          <BotonFavorito
            slug={slug}
            inicial={favorito}
            logueado={logueado}
            rutaLogin={`/login?next=${encodeURIComponent(href)}`}
          />
        ) : null}
        {slug ? <BotonCompartir slug={slug} titulo={title} icono /> : null}
      </div>
      <div className="card-body">
        <h3 className="card-title">{title}</h3>
        <p className="card-location">{location}</p>
        <div className="card-footer">
          <ul className="card-features">
            {features.map((f) => (
              <li key={f.label}>
                <Icon name={f.icon} />
                {f.label}
              </li>
            ))}
          </ul>
          <Link href={href} className="card-link" aria-label={linkLabel ?? `Ver ${title}`}>
            <Icon name="i-arrow-up-right" />
          </Link>
        </div>
      </div>
    </article>
  );
}
