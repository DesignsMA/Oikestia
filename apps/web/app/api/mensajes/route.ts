import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { abrirHilo, enviarMensaje } from "@/lib/mensajes";
import { mensajeSchema } from "@/lib/validators";

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
