import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { geocodificarConsulta } from "@/lib/geocode";
import { consumir, MINUTO } from "@/lib/rate-limit";
import { ipDe } from "@/lib/guardas";

/** Proxy de Nominatim para /buscar: 15 búsquedas/minuto por IP. */
export async function GET(req: NextRequest) {
  const porIp = await consumir(`geocode:${ipDe(req)}`, 15, MINUTO);
  if (!porIp.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas búsquedas. Espera un minuto." },
      { status: 429 }
    );
  }

  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 160) ?? "";
  if (q.length < 3) {
    return NextResponse.json({ ok: false, error: "Escribe una ubicación" }, { status: 400 });
  }
  const coords = await geocodificarConsulta(q);
  if (!coords) {
    return NextResponse.json({ ok: false, error: "No encontramos esa ubicación" }, { status: 404 });
  }
  // coords = [lng, lat] (GeoJSON)
  return NextResponse.json({ ok: true, coords });
}
