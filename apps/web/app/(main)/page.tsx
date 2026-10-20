import Link from "next/link";
import ListingCardDetailed from "@/components/ListingCardDetailed";
import ListingCardCompact, { type CardFeature } from "@/components/ListingCardCompact";
import { Icon } from "@/components/IconSprite";
import { getPublicadas, formatearPrecio, caracteristicasDe, type ListingDoc } from "@/lib/listings";
import { seedListings } from "@/lib/seed-listings";
import { recomendaciones } from "@/lib/recomendaciones";
import { idsFavoritos } from "@/lib/favoritos";
import { getSessionUser } from "@/lib/auth";
import "@/app/styles/homepage.css";
import "@/app/styles/card-detailed.css";
import "@/app/styles/card-compact.css";

export const dynamic = "force-dynamic";

const AGENTE = "Propietario Oikestia";

function featuresDe(l: ListingDoc): CardFeature[] {
  return caracteristicasDe(l).map((c) => ({ icon: c.icon, label: c.label ? `${c.value} ${c.label}` : c.value }));
}

function location(l: ListingDoc): string {
  return `${l.direccion.colonia}, ${l.direccion.ciudad}, ${l.direccion.estado}.`;
}

export default async function HomePage() {
  await seedListings();
  const usuario = await getSessionUser();
  const recomendadas = await recomendaciones(2);
  const destacadas = recomendadas.length ? recomendadas : (await getPublicadas({}, 2));
  const listings = await getPublicadas({}, 30);
  const idsRecomendados = new Set(destacadas.map((l) => l.slug));
  const resto = listings.filter((l) => !idsRecomendados.has(l.slug));
  const favIds = new Set((await idsFavoritos()).map(String));
  const esFav = (l: ListingDoc) => favIds.has(String(l._id));

  return (
    <>
      {/* Presentación y buscador de propiedades */}
      <section className="welcome-section">
        <div className="welcome-bg">
          <img src="/images/home-bg.webp" alt="Ciudad moderna vista desde abajo." />
        </div>
        <h1>
          Encuentra tu <span>hogar ideal</span> cerca de ti
        </h1>
        <p>Descubre propiedades exclusivas seleccionadas para tu estilo de vida.</p>
        <p>¡Haz tu búsqueda y encuentra la propiedad perfecta!</p>

        <form role="search" action="/publicaciones" method="get" className="search-bar">
          <div className="search-form">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="icon icon-tabler icon-tabler-search"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
              <path d="M21 21l-6 -6" />
            </svg>
            <input
              required
              type="search"
              name="q"
              autoComplete="off"
              placeholder="Ubicación, código postal o dirección"
              aria-label="Buscar por ubicación"
            />
          </div>

          <details className="filter-pane price-filter">
            <summary>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icon-tabler-cash"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3" />
                <path d="M7 10a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8" />
                <path d="M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0" />
              </svg>
              <span className="filter-label">
                <span className="filter-label-title">Precio</span>
                <span className="filter-label-value">Cualquier precio</span>
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter-chevron"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M6 9l6 6l6 -6" />
              </svg>
            </summary>

            <div className="filter-content">
              <label>
                <input type="radio" name="precio" value="cualquiera" defaultChecked /> Cualquier precio
              </label>
              <label>
                <input type="radio" name="precio" value="0-1m" /> Hasta $1,000,000
              </label>
              <label>
                <input type="radio" name="precio" value="1m-3m" /> $1,000,000 – $3,000,000
              </label>
              <label>
                <input type="radio" name="precio" value="3m-6m" /> $3,000,000 – $6,000,000
              </label>
              <label>
                <input type="radio" name="precio" value="6m+" /> Más de $6,000,000
              </label>
            </div>
          </details>

          <details className="filter-pane property-type-filter">
            <summary>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="icon icon-tabler icon-tabler-buildings"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M4 21v-15c0 -1 1 -2 2 -2h5c1 0 2 1 2 2v15" />
                <path d="M16 8h2c1 0 2 1 2 2v11" />
                <path d="M3 21h18" />
                <path d="M10 12v.01" />
                <path d="M10 16v.01" />
                <path d="M10 8v.01" />
                <path d="M7 12v.01" />
                <path d="M7 16v.01" />
                <path d="M7 8v.01" />
                <path d="M17 12v.01" />
                <path d="M17 16v.01" />
                <path d="M17 8v.01" />
              </svg>
              <span className="filter-label">
                <span className="filter-label-title">Tipo de propiedad</span>
                <span className="filter-label-value">Todos</span>
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="filter-chevron"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M6 9l6 6l6 -6" />
              </svg>
            </summary>

            <div className="filter-content">
              <label>
                <input type="checkbox" name="tipo" value="casa" /> Casa
              </label>
              <label>
                <input type="checkbox" name="tipo" value="departamento" /> Departamento
              </label>
              <label>
                <input type="checkbox" name="tipo" value="terreno" /> Terreno
              </label>
            </div>
          </details>

          <button type="submit" className="search-submit">
            Buscar
          </button>
        </form>

        <div className="quick-filters">
          <Link href="/publicaciones?tipo=casa" className="property-type-button">
            Casas
          </Link>
          <Link href="/publicaciones?tipo=departamento" className="property-type-button">
            Departamentos
          </Link>
          <Link href="/publicaciones?tipo=terreno" className="property-type-button">
            Terrenos
          </Link>
        </div>
      </section>

      {/* Recomendaciones personalizadas */}
      <section className="for-you-section">
        <h2>Ofertas para ti</h2>

        <div className="for-you-description">
          <p>
            {usuario?.intereses?.length || favIds.size
              ? "Selección personalizada según tus favoritos e intereses."
              : "Selección personalizada basada en tus búsquedas recientes."}
          </p>
          <Link href="/publicaciones" className="view-all-link link">
            Ver todas
            <Icon name="i-arrow-up-right" />
          </Link>
        </div>

        <div className="for-you-listings">
          {destacadas.map((l) => (
            <ListingCardDetailed
              key={l.slug}
              href={`/publicaciones/${l.slug}?ref=rec`}
              image={l.fotos[0]?.url ?? "/images/property1.webp"}
              imageAlt={l.fotos[0]?.alt ?? l.titulo}
              price={formatearPrecio(l.precio, l.operacion)}
              title={l.titulo}
              location={location(l)}
              features={featuresDe(l)}
              agent={AGENTE}
              slug={l.slug}
              favorito={esFav(l)}
              logueado={!!usuario}
              rutaLogin={`/login?next=${encodeURIComponent(`/publicaciones/${l.slug}`)}`}
            />
          ))}
        </div>
      </section>

      {/* Catálogo de propiedades disponibles */}
      <section className="discover-section">
        <h2>Explora más propiedades</h2>
        <p>Desplázate para seguir descubriendo publicaciones cerca de ti.</p>

        <div className="discover-listings">
          {resto.map((l) => (
            <ListingCardCompact
              key={l.slug}
              href={`/publicaciones/${l.slug}?ref=rec`}
              image={l.fotos[0]?.url ?? "/images/property1.webp"}
              imageAlt={l.fotos[0]?.alt ?? l.titulo}
              price={formatearPrecio(l.precio, l.operacion)}
              title={l.titulo}
              location={location(l)}
              features={featuresDe(l)}
              tag={l.tipoPropiedad === "terreno" ? "Terreno" : undefined}
              slug={l.slug}
              favorito={esFav(l)}
              logueado={!!usuario}
            />
          ))}
        </div>

        <Link href="/publicaciones" className="load-more-button">
          Cargar más resultados
        </Link>
      </section>
    </>
  );
}
