/**
 * Geocodificación de direcciones con Nominatim (OpenStreetMap).
 * Política de uso: identificación obligatoria (User-Agent con contacto),
 * máximo 1 petición por segundo y sin bulk — solo geocodificar direcciones
 * nuevas al publicar, nunca en bucle.
 *
 * Variables:
 *   NOMINATIM_CONTACT_EMAIL  para el User-Agent (recomendado en producción)
 *   NOMINATIM_URL            por defecto https://nominatim.openstreetmap.org
 *   GEOCODER=off             desactiva la geocodificación (pruebas sin red)
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

/**
 * Geocodifica una consulta de texto libre. Devuelve [lng, lat] (GeoJSON) o
 * null. Nunca lanza: publicar no debe fallar por el mapa.
 */
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

/**
 * Dirección de una publicación → coordenadas. Nominatim es exigente con
 * direcciones largas (colonia con guiones, "C.P."), así que se intenta de
 * más completa a más simple hasta encontrar coincidencia. Cada intento
 * espera la cuota de 1 req/s.
 */
export async function geocodificarDireccion(d: Direccion): Promise<[number, number] | null> {
  if (!activo()) return null;
  const variantes = [
    `${d.calle}, ${d.colonia}, ${d.ciudad}, ${d.estado}, México`,
    `${d.calle}, ${d.ciudad}, ${d.estado}, México`,
    `${d.calle}, ${d.ciudad}, México`,
    `${d.colonia}, ${d.ciudad}, ${d.estado}, México`,
  ];
  for (const q of variantes) {
    const coords = await geocodificar(q);
    if (coords) return coords;
  }
  return null;
}
