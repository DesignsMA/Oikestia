/**
 * Geocodificación con Geoapify (solo servidor: la API key nunca llega al navegador).
 *
 * Estrategia CP-first: en México el código postal es el anclave más confiable; con él
 * se obtienen coordenadas y se deducen colonia/ciudad/estado, y luego la calle se
 * busca acotada a esa zona (evita el clásico match de "Av. Juárez" en otro municipio).
 * Sin GEOAPIFY_API_KEY las rutas caen a Nominatim (lib/geocode.ts).
 */

import type { Direccion } from "./geocode";

const BASE = "https://api.geoapify.com/v1/geocode";
const TIMEOUT_MS = 8000;
/** Radio máximo (km) entre el ancla del CP y el resultado de la búsqueda de calle. */
const MAX_KM_CALLE = 15;

/** Partes de dirección que Geoapify puede rellenar (todas opcionales). */
export type DireccionParcial = Partial<Pick<Direccion, "calle" | "colonia" | "ciudad" | "estado" | "cp">>;

export type OpcionSugerencia = { texto: string; lat: number; lng: number; direccion: DireccionParcial };

export type ResultadoBusqueda = { coords: [number, number]; direccion: DireccionParcial };

/** Propiedades relevantes de una feature de Geoapify. */
type Props = {
  formatted?: string;
  lat?: number;
  lon?: number;
  street?: string;
  housenumber?: string;
  suburb?: string;
  neighbourhood?: string;
  district?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
  distance?: number;
};

export function geoapifyActivo(): boolean {
  return Boolean(process.env.GEOAPIFY_API_KEY?.trim());
}

function clave(): string {
  return process.env.GEOAPIFY_API_KEY?.trim() ?? "";
}

/** Respuesta GeoJSON (o lista plana) → propiedades de resultados. */
function parsear(data: unknown): Props[] {
  const aPropiedades = (x: unknown): Props => {
    if (x && typeof x === "object" && "properties" in x) {
      return ((x as { properties?: Props }).properties ?? {}) as Props;
    }
    return (x ?? {}) as Props;
  };
  if (Array.isArray(data)) return data.map(aPropiedades);
  if (data && typeof data === "object" && "features" in data) {
    const features = (data as { features?: unknown[] }).features ?? [];
    return features.map(aPropiedades);
  }
  return [];
}

/** GET a un endpoint de Geoapify. Nunca lanza; devuelve [] ante cualquier fallo. */
async function get(
  endpoint: "search" | "autocomplete" | "reverse",
  params: Record<string, string>
): Promise<Props[]> {
  try {
    const url = new URL(`${BASE}/${endpoint}`);
    url.searchParams.set("apiKey", clave());
    url.searchParams.set("lang", "es");
    url.searchParams.set("filter", "countrycode:mx");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: control.signal, cache: "no-store" });
    clearTimeout(reloj);
    if (!res.ok) return [];
    return parsear(await res.json());
  } catch (e) {
    console.warn("geoapify:", e instanceof Error ? e.message : e);
    return [];
  }
}

function coordsDe(p: Props): [number, number] | null {
  const lng = Number(p.lon);
  const lat = Number(p.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return [lng, lat];
}

/** Feature → partes de dirección (solo las que trae). */
function aDireccion(p: Props): DireccionParcial {
  const d: DireccionParcial = {};
  const calle = [p.street, p.housenumber].filter(Boolean).join(" ").trim();
  const colonia = p.suburb ?? p.neighbourhood ?? p.district ?? p.quarter ?? "";
  const ciudad = p.city ?? p.town ?? p.village ?? p.municipality ?? "";
  if (calle) d.calle = calle;
  if (colonia.trim()) d.colonia = colonia.trim();
  if (ciudad.trim()) d.ciudad = ciudad.trim();
  if (p.state?.trim()) d.estado = p.state.trim();
  if (p.postcode?.trim()) d.cp = p.postcode.trim();
  return d;
}

/** Mezcla dos direcciones ganando el valor no vacío de `b`. */
function mezclar(a: DireccionParcial, b: DireccionParcial): DireccionParcial {
  const r: DireccionParcial = {};
  for (const k of ["calle", "colonia", "ciudad", "estado", "cp"] as const) {
    const v = b[k]?.trim() ? b[k]!.trim() : a[k]?.trim();
    if (v) r[k] = v;
  }
  return r;
}

function distKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[1] * Math.PI) / 180) * Math.cos((b[1] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** "Paseo de los Libres 214" → { street: "Paseo de los Libres", houseNumber: "214" }. */
function partirCalle(calle: string): { street: string; houseNumber?: string } {
  const m = calle.match(/^(.*?)\s+(\d{1,5}[a-z]?)$/i);
  if (m && m[1].trim().length >= 3) return { street: m[1].trim(), houseNumber: m[2] };
  return { street: calle };
}

/** Texto libre → coordenadas (se usa en /buscar). */
export async function buscarTexto(texto: string): Promise<[number, number] | null> {
  if (!geoapifyActivo()) return null;
  const q = texto.trim();
  if (q.length < 3) return null;
  const r = await get("search", { text: q, limit: "1" });
  return r[0] ? coordsDe(r[0]) : null;
}

/**
 * Dirección estructurada → coordenadas + partes deducidas.
 * Orden: (1) CP como ancla, (2) calle acotada al ancla, (3) respaldos.
 */
export async function buscarDireccion(d: Direccion): Promise<ResultadoBusqueda | null> {
  if (!geoapifyActivo()) return null;
  const cp = /^\d{5}$/.test(d.cp.trim()) ? d.cp.trim() : "";
  const calle = d.calle.trim();
  const ciudad = d.ciudad.trim();

  //1) Ancla: código postal (preciso en México) → coords + colonia/ciudad/estado.
  let ancla: ResultadoBusqueda | null = null;
  if (cp) {
    const r = await get("search", { postcode: cp, limit: "1" });
    const p = r[0];
    const coords = p ? coordsDe(p) : null;
    if (p && coords) ancla = { coords, direccion: aDireccion(p) };
  }

  //2) Calle: estructurada; con el ancla del CP se acota para no caer en otro municipio.
  if (calle) {
    const { street, houseNumber } = partirCalle(calle);
    const params: Record<string, string> = { street, limit: "1" };
    if (houseNumber) params.houseNumber = houseNumber;
    if (cp) params.postcode = cp;
    if (ciudad) params.city = ciudad;

    // Sin CP ni ciudad no hay contexto: se usa texto libre con todo lo disponible.
    const sinContexto = !cp && !ciudad;
    if (sinContexto) {
      const partes = [calle, d.colonia.trim(), ciudad, d.estado.trim()].filter(Boolean);
      const texto = [...partes, "México"].join(", ");
      const r = await get("search", { text: texto, limit: "1" });
      const p = r[0];
      const coords = p ? coordsDe(p) : null;
      if (p && coords) return { coords, direccion: mezclar(ancla?.direccion ?? {}, aDireccion(p)) };
    } else {
      if (ancla) params.bias = `proximity:${ancla.coords[0]},${ancla.coords[1]}`;
      const r = await get("search", params);
      const p = r[0];
      const coords = p ? coordsDe(p) : null;
      if (p && coords) {
        // Rechaza resultados lejanos al ancla (bias es solo una preferencia de orden).
        if (!ancla || distKm(ancla.coords, coords) <= MAX_KM_CALLE) {
          return { coords, direccion: mezclar(ancla?.direccion ?? {}, aDireccion(p)) };
        }
      }
    }
  }

  //3) Respaldo: el CP solo (la calle no se encontró); el pin se afina arrastrando.
  if (ancla) return ancla;

  //4) Sin CP: texto libre con las partes disponibles.
  const partes = [calle, d.colonia.trim(), ciudad, d.estado.trim(), cp].filter(Boolean);
  if (partes.length === 0) return null;
  const r = await get("search", { text: [...partes, "México"].join(", "), limit: "1" });
  const p = r[0];
  const coords = p ? coordsDe(p) : null;
  if (!p || !coords) return null;
  return { coords, direccion: aDireccion(p) };
}

/** Sugerencias para el autocomplete (mientras se escribe). */
export async function sugerencias(
  texto: string,
  cerca?: { lat: number; lng: number } | null
): Promise<OpcionSugerencia[]> {
  if (!geoapifyActivo()) return [];
  const q = texto.trim();
  if (q.length < 3) return [];
  const params: Record<string, string> = { text: q, limit: "6" };
  if (cerca) params.bias = `proximity:${cerca.lng},${cerca.lat}`;
  const rs = await get("autocomplete", params);
  const out: OpcionSugerencia[] = [];
  for (const p of rs) {
    const coords = coordsDe(p);
    const textoFormateado = p.formatted?.trim();
    if (!coords || !textoFormateado) continue;
    out.push({ texto: textoFormateado, lat: coords[1], lng: coords[0], direccion: aDireccion(p) });
  }
  return out;
}

/** Coordenadas → dirección (para afinar con el pin). `distance` = metros al punto. */
export async function invertir(
  lat: number,
  lng: number
): Promise<{ direccion: DireccionParcial; distance?: number } | null> {
  if (!geoapifyActivo()) return null;
  const r = await get("reverse", { lat: String(lat), lon: String(lng), limit: "1" });
  const p = r[0];
  if (!p) return null;
  const direccion = aDireccion(p);
  if (Object.keys(direccion).length === 0) return null;
  const distance = typeof p.distance === "number" ? p.distance : undefined;
  return distance === undefined ? { direccion } : { direccion, distance };
}
