import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { iniciarConversacion, conversacionDePublicacion } from "@/lib/mensajes";
import { nuevoMensajeSchema } from "@/lib/validators";
import { consumir, HORA } from "@/lib/rate-limit";
import { cuerpoEnLimites, ipDe } from "@/lib/guardas";

/** Primer mensaje: crea (o reutiliza) la conversación para esa publicación. */
export async function POST(req: NextRequest) {
  if (!cuerpoEnLimites(req, 8 * 1024)) {
    return NextResponse.json({ ok: false, error: "Mensaje demasiado largo" }, { status: 413 });
  }
  const porIp = await consumir(`mensajes:${ipDe(req)}`, 30, HORA);
  if (!porIp.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiados mensajes. Espera un momento." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as
    | { listing?: unknown; message?: unknown }
    | null;
  const parsed = nuevoMensajeSchema.safeParse({
    listing: typeof body?.listing === "string" ? body.listing : "",
    message: typeof body?.message === "string" ? body.message.trim() : "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const res = await iniciarConversacion(parsed.data.listing, parsed.data.message);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true, leadId: res.leadId }, { status: 201 });
}

/** Conversación ya existente para esa publicación (si la hay). */
export async function GET(req: NextRequest) {
  const listing = new URL(req.url).searchParams.get("listing") ?? "";
  const leadId = await conversacionDePublicacion(listing);
  return NextResponse.json({ ok: true, leadId });
}
