import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { solicitarVisita } from "@/lib/mensajes";
import { visitaSchema } from "@/lib/validators";
import { consumir, MINUTO } from "@/lib/rate-limit";
import { cuerpoEnLimites, ipDe } from "@/lib/guardas";

/** Solicitud de visita dentro de una conversación (cuenta como lead). */
export async function POST(req: NextRequest) {
  if (!cuerpoEnLimites(req, 4 * 1024)) {
    return NextResponse.json({ ok: false, error: "Solicitud demasiado larga" }, { status: 413 });
  }
  const porIp = await consumir(`mensajes:${ipDe(req)}`, 30, MINUTO);
  if (!porIp.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiados mensajes. Espera un momento." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as { lead?: unknown; fecha?: unknown } | null;
  const parsed = visitaSchema.safeParse({
    lead: typeof body?.lead === "string" ? body.lead : "",
    fecha: typeof body?.fecha === "string" ? body.fecha.trim() : "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const res = await solicitarVisita(parsed.data.lead, parsed.data.fecha);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: res.status });
  }
  return NextResponse.json(res, { status: 201 });
}
