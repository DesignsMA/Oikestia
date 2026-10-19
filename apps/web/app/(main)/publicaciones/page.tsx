import type { Metadata } from "next";
import Link from "next/link";
import ListingCardCompact from "@/components/ListingCardCompact";
import {
  getPublicadas,
  formatearPrecio,
  parsearFiltros,
  hayFiltros,
  type ListingDoc,
} from "@/lib/listings";
import { seedListings } from "@/lib/seed-listings";
import { idsFavoritos } from "@/lib/favoritos";
import { getSessionUser } from "@/lib/auth";
import { AMENIDADES, AMENIDADES_ETIQUETAS, OPERACIONES, TIPOS_PROPIEDAD } from "@/lib/validators";
import { Icon } from "@/components/IconSprite";
import "@/app/styles/homepage.css";
import "@/app/styles/card-compact.css";
import "@/app/styles/intereses.css";

export const metadata: Metadata = {
  title: "Publicaciones",
  description:
    "Explora las publicaciones de propiedades disponibles en Oikestia: casas, departamentos y terrenos en venta y renta con filtros por precio, amenidades y ubicación.",
};

export const dynamic = "force-dynamic";

const ETIQUETA_TIPO: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  "local-comercial": "Local comercial",
};

/** Características de la tarjeta compacta derivadas del documento. */
function featuresDe(l: ListingDoc) {
  const f: { icon: "i-bed" | "i-bath" | "i-ruler"; label: string }[] = [];
  if (l.caracteristicas.recamaras) f.push({ icon: "i-bed", label: `${l.caracteristicas.recamaras}` });
  if (l.caracteristicas.banos) f.push({ icon: "i-bath", label: `${l.caracteristicas.banos}` });
  const m2 = l.caracteristicas.construccionM2 ?? l.caracteristicas.terrenoM2;
  if (m2) f.push({ icon: "i-ruler", label: `${m2.toLocaleString("es-MX")} m²` });
  return f;
}

/** URL del catálogo sin el parámetro indicado (para los chips activos). */
function urlSin(
  sp: Record<string, string | string[] | undefined>,
  ...claves: string[]
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (claves.includes(k)) continue;
    if (Array.isArray(v)) for (const item of v) params.append(k, item);
    else if (typeof v === "string" && v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/publicaciones?${qs}` : "/publicaciones";
}

/** Catálogo público con filtros por query string (texto, tipo, precio, orden...). */
export default async function PublicacionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filtros = parsearFiltros(sp);
  await seedListings();
  const items = await getPublicadas(filtros);
  const activos = hayFiltros(filtros);

  const usuario = await getSessionUser();
  const favIds = new Set((await idsFavoritos()).map(String));

  const chips: { texto: string; href: string }[] = [];
  if (filtros.q) chips.push({ texto: `«${filtros.q}»`, href: urlSin(sp, "q") });
  if (filtros.tipo) chips.push({ texto: ETIQUETA_TIPO[filtros.tipo]!, href: urlSin(sp, "tipo") });
  if (filtros.tipos?.length)
    chips.push({
      texto: filtros.tipos.map((t) => ETIQUETA_TIPO[t]).join(", "),
      href: urlSin(sp, "tipo"),
    });
  if (filtros.operacion)
    chips.push({
      texto: filtros.operacion === "venta" ? "En venta" : "En renta",
      href: urlSin(sp, "operacion"),
    });
  if (filtros.precioMin !== undefined)
    chips.push({ texto: `Desde $${filtros.precioMin.toLocaleString("es-MX")}`, href: urlSin(sp, "precioMin") });
  if (filtros.precioMax !== undefined)
    chips.push({ texto: `Hasta $${filtros.precioMax.toLocaleString("es-MX")}`, href: urlSin(sp, "precioMax") });
  if (filtros.recamaras !== undefined)
    chips.push({ texto: `${filtros.recamaras}+ recámaras`, href: urlSin(sp, "recamaras") });
  for (const a of filtros.amenidades ?? []) {
    chips.push({ texto: AMENIDADES_ETIQUETAS[a as keyof typeof AMENIDADES], href: urlSin(sp, "amenidades") });
  }

  return (
    <section className="discover-section">
      <h2>Publicaciones</h2>
      <p>
        {items.length > 0
          ? `${items.length} ${items.length === 1 ? "propiedad encontrada" : "propiedades encontradas"} en Oikestia${activos ? " con tus filtros" : ""}.`
          : "Aún no hay publicaciones. ¡Sé el primero en publicar!"}
      </p>

      <form className="filtros-barra" action="/publicaciones" method="get">
        <div className="filtros-campos">
          <input
            type="search"
            name="q"
            className="filtros-q"
            placeholder="Colonia, ciudad o título"
            defaultValue={filtros.q ?? ""}
            aria-label="Buscar por texto"
            maxLength={80}
          />

          <select name="tipo" defaultValue={filtros.tipo ?? ""} aria-label="Tipo de propiedad">
            <option value="">Cualquier tipo</option>
            {TIPOS_PROPIEDAD.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </select>

          <select name="operacion" defaultValue={filtros.operacion ?? ""} aria-label="Operación">
            <option value="">Venta y renta</option>
            {OPERACIONES.map((op) => (
              <option key={op} value={op}>
                {op === "venta" ? "En venta" : "En renta"}
              </option>
            ))}
          </select>

          <select name="recamaras" defaultValue={filtros.recamaras ? String(filtros.recamaras) : ""} aria-label="Recámaras">
            <option value="">Recámaras</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>

          <input
            type="number"
            name="precioMin"
            className="filtros-precio"
            placeholder="Precio mín."
            defaultValue={filtros.precioMin ?? ""}
            min={0}
            aria-label="Precio mínimo en pesos"
          />
          <input
            type="number"
            name="precioMax"
            className="filtros-precio"
            placeholder="Precio máx."
            defaultValue={filtros.precioMax ?? ""}
            min={0}
            aria-label="Precio máximo en pesos"
          />

          <select name="orden" defaultValue={filtros.orden ?? "reciente"} aria-label="Ordenar">
            <option value="reciente">Más recientes</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </select>

          <button type="submit" className="filtros-buscar">
            <Icon name="i-search" />
            Aplicar
          </button>
        </div>

        <fieldset className="filtros-amenidades">
          <legend>Amenidades</legend>
          <div className="intereses-opciones">
            {(Object.keys(AMENIDADES) as (keyof typeof AMENIDADES)[]).map((clave) => {
              const marcada = (filtros.amenidades ?? []).includes(clave);
              return (
                <label key={clave} className={marcada ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
                  <input type="checkbox" name="amenidades" value={clave} defaultChecked={marcada} />
                  <span>{AMENIDADES_ETIQUETAS[clave]}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </form>

      {chips.length > 0 && (
        <div className="filtros-activos">
          {chips.map((c, i) => (
            <Link key={i} href={c.href} className="filtros-chip" title="Quitar este filtro">
              {c.texto}
              <span aria-hidden="true">×</span>
            </Link>
          ))}
          <Link href="/publicaciones" className="filtros-limpiar">
            Limpiar todo
          </Link>
        </div>
      )}

      <div className="discover-listings">
        {items.map((l) => (
          <ListingCardCompact
            key={l.slug}
            href={`/publicaciones/${l.slug}`}
            image={l.fotos[0]?.url ?? "/images/property1.webp"}
            imageAlt={l.fotos[0]?.alt ?? l.titulo}
            price={formatearPrecio(l.precio, l.operacion)}
            title={l.titulo}
            location={`${l.direccion.colonia}, ${l.direccion.ciudad}, ${l.direccion.estado}.`}
            features={featuresDe(l)}
            tag={l.tipoPropiedad === "terreno" ? "Terreno" : undefined}
            slug={l.slug}
            favorito={favIds.has(String(l._id))}
            logueado={!!usuario}
          />
        ))}
      </div>

      {items.length === 0 && activos && (
        <div className="filtros-vacio">
          <p>No encontramos propiedades con esos filtros.</p>
          <Link href="/publicaciones" className="filtros-buscar filtros-buscar-inline">
            Quitar filtros
          </Link>
        </div>
      )}

      {items.length === 0 && !activos && (
        <p>
          <Link href="/propietario" className="link">
            Publica tu propiedad
          </Link>
        </p>
      )}
    </section>
  );
}
