/**
 * Geocodificación con Nominatim (OpenStreetMap): 1 req/s, User-Agent con
 * contacto. NOMINATIM_URL cambia la instancia; GEOCODER=off la desactiva.
 * La búsqueda es tolerante: si el match estricto falla, se reintenta con
 * variantes progresivamente más simples (sin número, solo colonia, solo CP).
 */

let ultimoRequest = 0;

function baseUrl(): string {
  return (process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org").replace(/\/$/, "");
}

function userAgent(): string {
  const contacto = process.env.NOMINATIM_CONTACT_EMAIL;
  return contacto ? `Oikestia/1.0 (${contacto})` : "Oikestia/1.0";
}

function activo(): boolean {
  return process.env.GEOCODER !== "off";
}

/** Espera para respetar el límite de 1 req/s de Nominatim. */
async function esperaCuota(): Promise<void> {
  const minimo = 1100;
  const desde = Date.now() - ultimoRequest;
  if (desde < minimo) {
    await new Promise((r) => setTimeout(r, minimo - desde));
  }
  ultimoRequest = Date.now();
}

/** Geocodifica texto libre → [lng, lat] (GeoJSON) o null. Nunca lanza. */
export async function geocodificar(consulta: string): Promise<[number, number] | null> {
  if (!activo()) return null;
  const q = consulta.trim();
  if (q.length < 5) return null;

  try {
    await esperaCuota();
    const url = new URL(`${baseUrl()}/search`);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("countrycodes", "mx");
    url.searchParams.set("q", q);

    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 8000);
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent(), "Accept-Language": "es-MX,es" },
      signal: control.signal,
      cache: "no-store",
    });
    clearTimeout(reloj);

    if (!res.ok) return null;
    const datos = (await res.json()) as Array<{ lon: string; lat: string }>;
    const primero = datos[0];
    if (!primero) return null;

    const lng = Number(primero.lon);
    const lat = Number(primero.lat);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    return [lng, lat];
  } catch (e) {
    console.warn("geocodificar:", e instanceof Error ? e.message : e);
    return null;
  }
}

export type Direccion = { calle: string; colonia: string; ciudad: string; estado: string; cp: string };

/** Quita el número de la calle para buscar de forma tolerante ("Av. Juárez 123" → "Av. Juárez"). */
function calleSinNumero(calle: string): string {
  return calle.replace(/\s*(no\.?|núm\.?|#)?\s*\d+\s*[a-z]?\s*$/i, "").trim();
}

/** Variantes de la dirección, de más completa a más simple (para fuzzy match). */
function variantesDireccion(d: Direccion): string[] {
  const sin = (s: string) => (s ?? "").trim();
  const calle = sin(d.calle);
  const calleBase = calleSinNumero(calle);
  const colonia = sin(d.colonia);
  const ciudad = sin(d.ciudad);
  const estado = sin(d.estado);
  const cp = sin(d.cp);

  const joins = (partes: (string | undefined)[]) => partes.filter((p): p is string => !!p && p.length > 0).join(", ");

  const candidatas = [
    joins([calle, colonia, ciudad, estado, cp, "México"]),
    joins([calle, colonia, ciudad, estado, "México"]),
    joins([calle, ciudad, estado, "México"]),
    joins([calle, ciudad, "México"]),
    joins([calleBase, colonia, ciudad, "México"]),
    joins([colonia, ciudad, estado, "México"]),
    joins([ciudad, estado, cp, "México"]),
    joins([cp, "México"]),
  ];

  // Elimina duplicados y variantes demasiado cortas (Nominatim exige ≥ 5 chars).
  const vistas = new Set<string>();
  const res: string[] = [];
  for (const c of candidatas) {
    const k = c.toLowerCase();
    if (vistas.has(k)) continue;
    vistas.add(k);
    if (c.replace(/[^a-z0-9áéíóúñ]/gi, "").length >= 5) res.push(c);
  }
  return res;
}

/** Dirección → coordenadas, probando variantes de la dirección de más completa a más simple. */
export async function geocodificarDireccion(d: Direccion): Promise<[number, number] | null> {
  if (!activo()) return null;
  for (const q of variantesDireccion(d)) {
    const coords = await geocodificar(q);
    if (coords) return coords;
  }
  return null;
}

/** Texto libre del buscador → coordenadas, probando la consulta y una versión sin número. */
export async function geocodificarConsulta(consulta: string): Promise<[number, number] | null> {
  const q = consulta.trim();
  const directo = await geocodificar(q);
  if (directo) return directo;
  const sinNumero = calleSinNumero(q);
  if (sinNumero && sinNumero !== q) return geocodificar(sinNumero);
  return null;
}
