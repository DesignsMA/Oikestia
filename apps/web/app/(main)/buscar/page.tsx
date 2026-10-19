import type { Metadata } from "next";
import {
  getPublicadas,
  formatearPrecio,
  parsearFiltros,
  hayFiltros,
  type ListingDoc,
} from "@/lib/listings";
import { seedListings } from "@/lib/seed-listings";
import BuscadorMapa, { type ItemBusqueda } from "@/components/BuscadorMapa";
import FiltrosBuscar from "@/components/FiltrosBuscar";
import "@/app/styles/homepage.css";
import "@/app/styles/card-compact.css";
import "@/app/styles/buscador.css";

export const metadata: Metadata = {
  title: "Buscar en mapa",
  description:
    "Buscador interactivo de propiedades en el mapa: radio de búsqueda, tu ubicación actual, filtros por tipo, precio y amenidades, y salto por colonia o dirección.",
};

export const dynamic = "force-dynamic";

const RADIOS = [0, 1, 2, 5, 10, 25, 50];

function numero(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function serializar(l: ListingDoc): ItemBusqueda {
  const features: ItemBusqueda["features"] = [];
  if (l.caracteristicas.recamaras) features.push({ icon: "i-bed", label: `${l.caracteristicas.recamaras}` });
  if (l.caracteristicas.banos) features.push({ icon: "i-bath", label: `${l.caracteristicas.banos}` });
  const m2 = l.caracteristicas.construccionM2 ?? l.caracteristicas.terrenoM2;
  if (m2) features.push({ icon: "i-ruler", label: `${m2.toLocaleString("es-MX")} m²` });

  return {
    slug: l.slug,
    titulo: l.titulo,
    precioTexto: formatearPrecio(l.precio, l.operacion),
    location: `${l.direccion.colonia}, ${l.direccion.ciudad}, ${l.direccion.estado}.`,
    image: l.fotos[0]?.url ?? "/images/property1.webp",
    imageAlt: l.fotos[0]?.alt ?? l.titulo,
    features,
    tag: l.tipoPropiedad === "terreno" ? "Terreno" : undefined,
    coords: l.ubicacion?.coords,
  };
}

/** Buscador en mapa; acepta ?lat&lng&radio para enlazar desde otras páginas y filtros del catálogo. */
export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  await seedListings();
  const filtros = parsearFiltros(sp);
  const items = (await getPublicadas(filtros, 200)).map(serializar);

  const lat = numero(sp.lat);
  const lng = numero(sp.lng);
  const radioCrudo = numero(sp.radio);
  const radio = radioCrudo !== undefined && RADIOS.includes(radioCrudo) ? radioCrudo : undefined;

  return (
    <section className="discover-section buscador-seccion">
      <h2>Buscar en mapa</h2>
      <FiltrosBuscar filtros={filtros} hayFiltros={hayFiltros(filtros)} />
      <BuscadorMapa items={items} inicial={{ lat, lng, radio }} />
    </section>
  );
}
