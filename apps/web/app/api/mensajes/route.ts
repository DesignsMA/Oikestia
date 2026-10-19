import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { abrirHilo, enviarMensaje } from "@/lib/mensajes";
import { mensajeSchema } from "@/lib/validators";
import { consumir, MINUTO } from "@/lib/rate-limit";
import { cuerpoEnLimites, ipDe } from "@/lib/guardas";

/** Hilo completo de una conversación (solo participantes). */
export async function GET(req: NextRequest) {
  const lead = new URL(req.url).searchParams.get("lead") ?? "";
  const res = await abrirHilo(lead);
  if (!res.ok) {
    const error =
      res.status === 401
        ? "Inicia sesión"
        : res.status === 403
          ? "No es tu conversación"
          : "Conversación no encontrada";
    return NextResponse.json({ ok: false, error }, { status: res.status });
  }
  return NextResponse.json({ ok: true, hilo: res.hilo, soyOwner: res.soyOwner });
}

/** Envía un mensaje al hilo (solo participantes). */
export async function POST(req: NextRequest) {
  if (!cuerpoEnLimites(req, 8 * 1024)) {
    return NextResponse.json({ ok: false, error: "Mensaje demasiado largo" }, { status: 413 });
  }
  // El GET (polling) no se limita; el envío sí: 30/min por IP.
  const porIp = await consumir(`mensajes:${ipDe(req)}`, 30, MINUTO);
  if (!porIp.permitido) {
    return NextResponse.json({ ok: false, error: "Demasiados mensajes. Espera un momento." }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { lead?: unknown; texto?: unknown } | null;
  const parsed = mensajeSchema.safeParse({
    lead: typeof body?.lead === "string" ? body.lead : "",
    texto: typeof body?.texto === "string" ? body.texto.trim() : "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const res = await enviarMensaje(parsed.data.lead, parsed.data.texto);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: res.status });
  }
  return NextResponse.json(res, { status: 201 });
}
