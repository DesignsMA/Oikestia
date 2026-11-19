import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { geocodificarConsulta, geocodificarDireccion, type Direccion } from "@/lib/geocode";
import { buscarDireccion, buscarTexto, geoapifyActivo } from "@/lib/geoapify";
import { consumir, MINUTO } from "@/lib/rate-limit";
import { ipDe } from "@/lib/guardas";

/**
 * Geocodificación compartida:15 búsquedas/minuto por IP.
 * - /buscar usa ?q= (texto libre).
 * - El asistente usa ?calle=&colonia=&ciudad=&estado=&cp= (prioridad al CP:
 *   con él se deducen colonia/ciudad/estado y luego se busca la calle acotada).
 */
export async function GET(req: NextRequest) {
  const porIp = await consumir(`geocode:${ipDe(req)}`, 15, MINUTO);
  if (!porIp.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas búsquedas. Espera un minuto." },
      { status: 429 }
    );
  }

  const sp = new URL(req.url).searchParams;
  const texto = (k: string, max: number) => sp.get(k)?.trim().slice(0, max) ?? "";
  const d: Direccion = {
    calle: texto("calle", 120),
    colonia: texto("colonia", 80),
    ciudad: texto("ciudad", 80),
    estado: texto("estado", 60),
    cp: texto("cp", 5).replace(/\D/g, ""),
  };
  const hayCampos = Object.values(d).some((v) => v.trim().length > 0);

  if (hayCampos) {
    const noEncontrado = () =>
      NextResponse.json(
        { ok: false, error: "No encontramos esa dirección. Revisa el código postal o mueve el pin." },
        { status: 404 }
      );

    if (geoapifyActivo()) {
      const r = await buscarDireccion(d);
      if (!r) return noEncontrado();
      // coords = [lng, lat] (GeoJSON); direccion = partes deducidas para el formulario.
      return NextResponse.json({ ok: true, coords: r.coords, direccion: r.direccion });
    }
    // Respaldo Nominatim: variantes de la dirección (incluye el CP).
    const coords = await geocodificarDireccion(d);
    if (!coords) return noEncontrado();
    return NextResponse.json({ ok: true, coords });
  }

  const q = sp.get("q")?.trim().slice(0, 160) ?? "";
  if (q.length < 3) {
    return NextResponse.json({ ok: false, error: "Escribe una ubicación" }, { status: 400 });
  }
  const coords = geoapifyActivo() ? await buscarTexto(q) : await geocodificarConsulta(q);
  if (!coords) {
    return NextResponse.json({ ok: false, error: "No encontramos esa ubicación" }, { status: 404 });
  }
  // coords = [lng, lat] (GeoJSON)
  return NextResponse.json({ ok: true, coords });
}
