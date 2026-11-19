import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sugerencias } from "@/lib/geoapify";
import { consumir, MINUTO } from "@/lib/rate-limit";
import { ipDe } from "@/lib/guardas";

/** Autocomplete del asistente:30 sugerencias/minuto por IP. Sin API key devuelve []. */
export async function GET(req: NextRequest) {
  const porIp = await consumir(`geocode-sug:${ipDe(req)}`, 30, MINUTO);
  if (!porIp.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas sugerencias. Espera un minuto." },
      { status: 429 }
    );
  }

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim().slice(0, 120) ?? "";
  if (q.length < 3) {
    return NextResponse.json({ ok: true, opciones: [] });
  }

  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const cerca = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  const opciones = await sugerencias(q, cerca);
  return NextResponse.json({ ok: true, opciones });
}
