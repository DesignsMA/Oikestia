import { NextResponse } from "next/server";
import { geocodificar } from "@/lib/geocode";

/**
 * Proxy de Nominatim para centrar el mapa de /buscar.
 * Así el navegador no llama directo a Nominatim (User-Agent y cuota
 * de 1 req/s se gestionan en el servidor).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 160) ?? "";
  if (q.length < 4) {
    return NextResponse.json({ ok: false, error: "Escribe una ubicación" }, { status: 400 });
  }
  const coords = await geocodificar(q);
  if (!coords) {
    return NextResponse.json({ ok: false, error: "No encontramos esa ubicación" }, { status: 404 });
  }
  // coords = [lng, lat] (GeoJSON)
  return NextResponse.json({ ok: true, coords });
}
