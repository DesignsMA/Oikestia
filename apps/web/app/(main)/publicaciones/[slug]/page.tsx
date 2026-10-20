import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/IconSprite";
import {
  getPorSlug,
  getOwnerPublico,
  formatearPrecio,
  tiempoRelativo,
  direccionCompleta,
  amenidadesConIcono,
  caracteristicasDe,
  parrafos,
  embedMapa,
} from "@/lib/listings";
import { PERFILES_OCUPANTES_ETIQUETAS } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";
import { conversacionDePublicacion } from "@/lib/mensajes";
import { esFavorito } from "@/lib/favoritos";
import { registrarVisita, incrementar } from "@/lib/estadisticas";
import { headers } from "next/headers";
import BotonFavorito from "@/components/BotonFavorito";
import BotonCompartir from "@/components/BotonCompartir";
import GaleriaFicha from "@/components/GaleriaFicha";
import Cercanas from "@/components/Cercanas";
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
  const { slug } = await params;
  const sp = await searchParams;
  const listing = await getPorSlug(slug);
  if (!listing) notFound();

  const owner = await getOwnerPublico(listing.owner);
  const usuario = await getSessionUser();
  const amenidades = amenidadesConIcono(listing.amenidades);
  const parrafosDesc = parrafos(listing.descripcion);

  const esMia = !!usuario && usuario.id === String(listing.owner);
  const leadExistente = !esMia && usuario ? await conversacionDePublicacion(slug) : null;
  const favorito = usuario ? await esFavorito(listing._id) : false;

  // Estadística de visita (agregada y anónima): no bloquea el render.
  if (!esMia) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
    void registrarVisita(listing._id, ip, h.get("user-agent") ?? "");
    void incrementar(listing._id, "vecesMostradoContacto");
    const ref = typeof sp.ref === "string" ? sp.ref : "";
    if (ref === "busq") void incrementar(listing._id, "desdeBusqueda");
    else if (ref === "rec") void incrementar(listing._id, "desdeRecomendaciones");
  }

  const rutaLogin = `/login?next=${encodeURIComponent(`/publicaciones/${slug}`)}`;
  const rutaContacto = esMia
    ? null
    : !usuario
      ? rutaLogin
      : leadExistente
        ? `/mensajes?lead=${leadExistente}`
        : `/mensajes/nuevo?publicacion=${encodeURIComponent(slug)}`;
  const etiquetaContacto = esMia ? "Editar publicación" : "Enviar Mensaje";
  const hrefContacto = esMia ? `/propietario/publicar?editar=${slug}` : rutaContacto!;

  const opLabel = listing.operacion === "venta" ? "En venta" : "En renta";
  const fecha = tiempoRelativo(listing.publicadoEn ?? listing.creado);
  const direccion = direccionCompleta(listing.direccion);

  const features = caracteristicasDe(listing);
  const amenidadesLibres = listing.amenidadesLibres ?? [];
  const reglas = listing.reglas;

  const mapa = listing.ubicacion ? embedMapa(listing.ubicacion.coords) : null;

  return (
    <section className="listing-section">
      <GaleriaFicha fotos={listing.fotos} titulo={listing.titulo} />

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
              {features.map((f, i) => (
                <li className="feature-item" key={`${f.label}-${i}`}>
                  <Icon name={f.icon} />
                  <span className="feature-value">{f.value}</span>
                  {f.label ? <span className="feature-label">{f.label}</span> : null}
                </li>
              ))}
            </ul>
          )}

          <h2>Acerca de la propiedad</h2>
          {parrafosDesc.map((p, i) => (
            <p key={i}>{p}</p>
          ))}

          {(amenidades.length > 0 || amenidadesLibres.length > 0) && (
            <>
              <h2>Características y amenidades</h2>
              <ul className="listing-amenities">
                {amenidades.map((a) => (
                  <li key={a.label}>
                    <Icon name={a.icon} />
                    {a.label}
                  </li>
                ))}
                {amenidadesLibres.map((a) => (
                  <li key={`libre-${a}`} className="amenity-libre">
                    <Icon name="i-plus" />
                    {a}
                  </li>
                ))}
              </ul>
            </>
          )}

          {reglas && (
            <>
              <h2>Reglas y condiciones</h2>
              <ul className="listing-reglas">
                {reglas.amueblado ? <li>Se renta amueblado</li> : null}
                <li>{reglas.aceptaMascotas ? "Se aceptan mascotas" : "No se aceptan mascotas"}</li>
                {reglas.fumaPermitido ? <li>Se permite fumar</li> : <li>No se permite fumar</li>}
                {reglas.depositoMeses ? (
                  <li>
                    Depósito de {reglas.depositoMeses} {reglas.depositoMeses === 1 ? "mes" : "meses"}
                  </li>
                ) : null}
                {reglas.incluyeServicios && reglas.incluyeServicios.length > 0 ? (
                  <li>Incluye: {reglas.incluyeServicios.join(", ")}</li>
                ) : null}
                {reglas.requisitosOcupantes && reglas.requisitosOcupantes.length > 0 ? (
                  <li>
                    Dirigido a:{" "}
                    {reglas.requisitosOcupantes
                      .map((r) => PERFILES_OCUPANTES_ETIQUETAS[r as keyof typeof PERFILES_OCUPANTES_ETIQUETAS] ?? r)
                      .join(", ")}
                  </li>
                ) : null}
                {reglas.notas ? <li>{reglas.notas}</li> : null}
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

          {listing.ubicacion && <Cercanas slug={listing.slug} />}
        </article>

        <aside className="listing-sidebar" aria-label="Contacto de la propiedad">
          <aside className="listing-owner" aria-label="Información del propietario">
            <div className="owner-identity">
              <img src={owner.avatarUrl} alt={`Foto de ${owner.nombre}`} className="owner-avatar" />
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
          </aside>

          <section className="listing-contact">
            <h2>¿Te interesa esta propiedad?</h2>
            <p className="contact-ayuda">
              {esMia
                ? "Esta es tu publicación."
                : "Envíale un mensaje al propietario. Tus datos solo se comparten según lo que elijas en tu cuenta."}
            </p>
            <Link className="contact-submit contact-mensaje" href={hrefContacto}>
              <Icon name={esMia ? "i-arrow-up-right" : "i-message"} />
              {etiquetaContacto}
            </Link>
            {!esMia && (
              <div className="contact-favorito">
                <BotonFavorito
                  slug={slug}
                  inicial={favorito}
                  logueado={!!usuario}
                  rutaLogin={rutaLogin}
                />
                <span>{favorito ? "Guardada en favoritos" : "Guardar en favoritos"}</span>
              </div>
            )}
            <BotonCompartir slug={slug} titulo={listing.titulo} />
          </section>
        </aside>
      </div>
    </section>
  );
}
