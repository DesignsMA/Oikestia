import { NextResponse, type NextRequest } from "next/server";
import { hilosDeSesion } from "@/lib/mensajes";

/** Hilos de mensajes de la sesión actual (polled desde /mensajes). */
export async function GET(req: NextRequest) {
  try {
    const paginaRaw = req.nextUrl.searchParams.get("pagina");
    const pagina = paginaRaw ? Math.max(0, Math.floor(Number(paginaRaw) || 0)) : 0;
    const resultado = await hilosDeSesion({ pagina });
    if (!resultado) {
      return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      hilos: resultado.hilos,
      total: resultado.total,
      hayMas: resultado.hayMas,
      pagina: resultado.pagina,
    });
  } catch (e) {
    console.error("leads GET", e);
    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar tus conversaciones" },
      { status: 500 }
    );
  }
}
