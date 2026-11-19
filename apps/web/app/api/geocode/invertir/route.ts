import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { invertirNominatim } from "@/lib/geocode";
import { invertir, geoapifyActivo } from "@/lib/geoapify";
import { consumir, MINUTO } from "@/lib/rate-limit";
import { ipDe } from "@/lib/guardas";

/**
 * Reverse geocoding para afinar con el pin: coordenadas → partes de dirección.
 *20 consultas/minuto por IP. `distance` (metros) la da Geoapify; sin API key
 * el respaldo Nominatim no la incluye y el cliente llena igual.
 */
export async function GET(req: NextRequest) {
  const porIp = await consumir(`geocode-inv:${ipDe(req)}`, 20, MINUTO);
  if (!porIp.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas consultas. Espera un minuto." },
      { status: 429 }
    );
  }

  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ ok: false, error: "Coordenadas inválidas" }, { status: 400 });
  }

  const sinDireccion = () =>
    NextResponse.json(
      { ok: false, error: "Sin dirección exacta en ese punto. Se guardan las coordenadas." },
      { status: 404 }
    );

  if (geoapifyActivo()) {
    const r = await invertir(lat, lng);
    if (!r) return sinDireccion();
    return NextResponse.json({ ok: true, ...r });
  }

  const d = await invertirNominatim(lat, lng);
  if (!d) return sinDireccion();
  return NextResponse.json({ ok: true, direccion: d });
}
