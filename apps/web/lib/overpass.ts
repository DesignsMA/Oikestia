/**
 * Amenidades cercanas con Overpass (OpenStreetMap). Consulta con radio, cachea
 * en memoria por celda y devuelve categorías con distancias. Nunca lanza.
 */

export type AmenidadCercana = {
  categoria: string;
  etiqueta: string;
  nombre: string;
  distancia: number;
};

type CategoriaPOI = {
  etiqueta: string;
  filtro: (tags: Record<string, string>) => boolean;
};

const CATEGORIAS: Record<string, CategoriaPOI> = {
  educacion: {
    etiqueta: "Educación",
    filtro: (t) => t.amenity === "school" || t.amenity === "university" || t.amenity === "kindergarten" || t.amenity === "college",
  },
  salud: {
    etiqueta: "Salud",
    filtro: (t) => t.amenity === "hospital" || t.amenity === "clinic" || t.amenity === "pharmacy" || t.amenity === "doctors",
  },
  comercio: {
    etiqueta: "Comercio",
    filtro: (t) => t.shop === "supermarket" || t.shop === "mall" || t.shop === "department_store" || t.amenity === "marketplace",
  },
  transporte: {
    etiqueta: "Transporte",
    filtro: (t) => t.highway === "bus_stop" || t.amenity === "bus_station" || t.railway === "station" || t.public_transport === "station",
  },
  parques: {
    etiqueta: "Parques y deporte",
    filtro: (t) => t.leisure === "park" || t.leisure === "playground" || t.leisure === "sports_centre" || t.leisure === "pitch",
  },
  restaurantes: {
    etiqueta: "Restaurantes y cafés",
    filtro: (t) => t.amenity === "restaurant" || t.amenity === "cafe" || t.amenity === "fast_food",
  },
};

const baseUrl = () => (process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter").trim();

let ultimoRequest = 0;
const cache = new Map<string, { datos: AmenidadCercana[]; expira: number }>();
const TTL = 6 * 60 * 60 * 1000;
const MAX_ENTRADAS = 200;

function activo(): boolean {
  return process.env.OVERPASS !== "off";
}

async function esperaCuota(): Promise<void> {
  const minimo = 1200;
  const desde = Date.now() - ultimoRequest;
  if (desde < minimo) await new Promise((r) => setTimeout(r, minimo - desde));
  ultimoRequest = Date.now();
}

function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Amenidades cercanas a [lng, lat]. Devuelve las más cercanas por categoría. */
export async function amenidadesCercanas(
  coords: [number, number],
  radioMetros = 1500
): Promise<AmenidadCercana[]> {
  if (!activo()) return [];
  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const clave = `${lat.toFixed(3)},${lng.toFixed(3)},${radioMetros}`;
  const ahora = Date.now();
  const enCache = cache.get(clave);
  if (enCache && enCache.expira > ahora) return enCache.datos;

  const consulta = `[out:json][timeout:40];(
    nwr(around:${radioMetros},${lat},${lng})[amenity~"school|university|kindergarten|college|hospital|clinic|pharmacy|doctors|marketplace|restaurant|cafe|fast_food|bus_station"];
    nwr(around:${radioMetros},${lat},${lng})[shop~"supermarket|mall|department_store"];
    nwr(around:${radioMetros},${lat},${lng})[leisure~"park|playground|sports_centre|pitch"];
    nwr(around:${radioMetros},${lat},${lng})[highway=bus_stop];
    nwr(around:${radioMetros},${lat},${lng})[railway=station];
    nwr(around:${radioMetros},${lat},${lng})[public_transport=station];
  );out center tags;`;

  try {
    await esperaCuota();
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 45000);
    const res = await fetch(`${baseUrl()}?data=${encodeURIComponent(consulta)}`, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "Oikestia/1.0" },
      signal: control.signal,
      cache: "no-store",
    });
    clearTimeout(reloj);
    if (!res.ok) {
      console.warn("overpass status", res.status);
      return [];
    }

    const json = (await res.json()) as {
      elements?: Array<{ lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }>;
    };

    const porCategoria = new Map<string, AmenidadCercana[]>();
    for (const el of json.elements ?? []) {
      const tags = el.tags ?? {};
      const pLat = el.lat ?? el.center?.lat;
      const pLng = el.lon ?? el.center?.lon;
      if (pLat === undefined || pLng === undefined) continue;
      for (const [cat, def] of Object.entries(CATEGORIAS)) {
        if (!def.filtro(tags)) continue;
        const nombre = tags.name ?? def.etiqueta;
        const d = distanciaKm(lat, lng, pLat, pLng);
        const lista = porCategoria.get(cat) ?? [];
        lista.push({ categoria: cat, etiqueta: def.etiqueta, nombre, distancia: d });
        porCategoria.set(cat, lista);
        break;
      }
    }

    const resultado: AmenidadCercana[] = [];
    for (const claveCat of Object.keys(CATEGORIAS)) {
      const lista = (porCategoria.get(claveCat) ?? []).sort((a, b) => a.distancia - b.distancia).slice(0, 4);
      resultado.push(...lista);
    }
    resultado.sort((a, b) => a.distancia - b.distancia);

    if (cache.size >= MAX_ENTRADAS) {
      const primera = cache.keys().next().value;
      if (primera) cache.delete(primera);
    }
    cache.set(clave, { datos: resultado, expira: ahora + TTL });
    return resultado;
  } catch (e) {
    console.warn("overpass:", e instanceof Error ? e.message : e);
    return [];
  }
}
