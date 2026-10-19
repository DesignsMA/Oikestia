import { NextResponse } from "next/server";
import { hilosDeSesion } from "@/lib/mensajes";

/** Hilos de mensajes de la sesión actual (polled desde /mensajes). */
export async function GET() {
  try {
    const hilos = await hilosDeSesion();
    if (!hilos) {
      return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, hilos });
  } catch (e) {
    console.error("leads GET", e);
    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar tus conversaciones" },
      { status: 500 }
    );
  }
}
