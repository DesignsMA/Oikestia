import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@/components/IconSprite";
import {
  getPorSlug,
  getOwnerPublico,
  formatearPrecio,
  tiempoRelativo,
  direccionCompleta,
  amenidadesConIcono,
  parrafos,
  embedMapa,
} from "@/lib/listings";
import "@/app/styles/listing.css";
import "@/app/styles/homepage.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPorSlug(slug);
  if (!listing) return {};
  return {
    title: listing.titulo,
    description: `${listing.titulo}: ${formatearPrecio(listing.precio, listing.operacion)} en ${direccionCompleta(listing.direccion)}. Conoce fotos, amenidades, ubicación y contacta directamente al propietario en Oikestia.`,
  };
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const listing = await getPorSlug(slug);
  if (!listing) notFound();

  const owner = await getOwnerPublico(listing.owner);
  const fotos = listing.fotos.slice(0, 3);
  const amenidades = amenidadesConIcono(listing.amenidades);
  const parrafosDesc = parrafos(listing.descripcion);
  const enviado = typeof sp.enviado === "string" ? decodeURIComponent(sp.enviado) : null;
  const error = typeof sp.error === "string" ? decodeURIComponent(sp.error) : null;

  const opLabel = listing.operacion === "venta" ? "En venta" : "En renta";
  const fecha = tiempoRelativo(listing.publicadoEn ?? listing.creado);
  const direccion = direccionCompleta(listing.direccion);

  const features: { icon: "i-bed" | "i-bath" | "i-garage" | "i-ruler"; value: string; label: string }[] = [];
  if (listing.caracteristicas.recamaras)
    features.push({ icon: "i-bed", value: String(listing.caracteristicas.recamaras), label: "Habitaciones" });
  if (listing.caracteristicas.banos)
    features.push({ icon: "i-bath", value: String(listing.caracteristicas.banos), label: "Baños" });
  if (listing.caracteristicas.cocheras)
    features.push({ icon: "i-garage", value: String(listing.caracteristicas.cocheras), label: "Cochera" });
  if (listing.caracteristicas.construccionM2)
    features.push({ icon: "i-ruler", value: String(listing.caracteristicas.construccionM2), label: "m² de construcción" });
  else if (listing.caracteristicas.terrenoM2)
    features.push({ icon: "i-ruler", value: String(listing.caracteristicas.terrenoM2), label: "m² de terreno" });

  const mapa = listing.ubicacion ? embedMapa(listing.ubicacion.coords) : null;

  return (
    <section className="listing-section">
      <div className="listing-gallery">
        {fotos.map((img, i) => (
          <div className="gallery-item" key={img.url}>
            {i === 2 && listing.fotos.length > 2 ? (
              <div className="gallery-item-overlay">
                <Icon name="i-gallery" />
                <a href="#galeria" className="overlay-link link">
                  Ver todas las fotos ({listing.fotos.length}).
                </a>
              </div>
            ) : null}
            <img src={img.url} alt={img.alt} className="listing-image" />
          </div>
        ))}
      </div>

      <div className="listing-layout">
        <article className="listing-main">
          <div className="listing-state">
            <span className="listing-for-sale">{opLabel}</span>
            <span className="listing-info">
              <Icon name="i-clock" />
              <span className="listing-date">{fecha}</span>
            </span>
          </div>

          <h1 className="listing-title">{listing.titulo}</h1>

          <div className="listing-info">
            <Icon name="i-pin" />
            <p>{direccion}</p>
          </div>

          <p className="listing-price">{formatearPrecio(listing.precio, listing.operacion)}</p>

          {features.length > 0 && (
            <ul className="listing-features">
              {features.map((f) => (
                <li className="feature-item" key={f.label}>
                  <Icon name={f.icon} />
                  <span className="feature-value">{f.value}</span>
                  <span className="feature-label">{f.label}</span>
                </li>
              ))}
            </ul>
          )}

          <h2>Acerca de la propiedad</h2>
          {parrafosDesc.map((p, i) => (
            <p key={i}>{p}</p>
          ))}

          {amenidades.length > 0 && (
            <>
              <h2>Características y amenidades</h2>
              <ul className="listing-amenities">
                {amenidades.map((a) => (
                  <li key={a.label}>
                    <Icon name={a.icon} />
                    {a.label}
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2>Ubicación</h2>
          {mapa ? (
            <div className="listing-map">
              <iframe src={mapa} title="Mapa de la propiedad" />
            </div>
          ) : (
            <p>Ubicación aproximada: {direccion}</p>
          )}
        </article>

        <aside className="listing-sidebar" aria-label="Contacto de la propiedad">
          <aside className="listing-owner" aria-label="Información del propietario">
            <div className="owner-identity">
              <img src="/images/user-placeholder.webp" alt={`Foto de ${owner.nombre}`} className="owner-avatar" />
              <div>
                <h2 className="owner-name">
                  {owner.nombre}
                  {owner.verificado && (
                    <svg className="owner-verified" aria-label="Propietario verificado" role="img">
                      <use href="#i-verified" />
                    </svg>
                  )}
                </h2>
                <p className="owner-role">{owner.verificado ? "Propietario verificado" : "Propietario"}</p>
              </div>
            </div>

            {owner.telefono && (
              <a href={`tel:${owner.telefono.replace(/[^\d+]/g, "")}`} className="owner-phone">
                <Icon name="i-phone" />
                {owner.telefono}
              </a>
            )}
          </aside>

          <section className="listing-contact">
            <h2>¿Te interesa esta propiedad?</h2>

            {enviado && (
              <p className="contact-aviso contact-ok" role="status">
                {enviado}
              </p>
            )}
            {error && (
              <p className="contact-aviso contact-error" role="alert">
                {error}
              </p>
            )}

            <form action="/api/contacto" method="post">
              <input type="hidden" name="listing" value={listing.slug} />
              <fieldset className="contact-fieldset">
                <label htmlFor="fullname">Nombre completo</label>
                <input type="text" id="fullname" name="fullname" placeholder="Juana Pérez" required />

                <label htmlFor="contact-email">Correo electrónico</label>
                <input type="email" id="contact-email" name="email" placeholder="nombre@gmail.com" required />

                <label htmlFor="message">Mensaje</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder={`Me interesa agendar una visita para ${listing.titulo}...`}
                  required
                ></textarea>
              </fieldset>

              <input type="submit" name="tipo" value="mensaje" className="contact-submit" />

              <button type="submit" name="tipo" value="visita" className="tour-button">
                <Icon name="i-calendar" />
                Solicitar visita
              </button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
