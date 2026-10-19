import { NextResponse } from "next/server";
import { listarInteresados } from "@/lib/mensajes";

/** Interesados que contactaron las publicaciones del propietario en sesión. */
export async function GET() {
  try {
    const interesados = await listarInteresados();
    if (!interesados) {
      return NextResponse.json({ ok: false, error: "Inicia sesión como propietario" }, { status: 401 });
    }
    return NextResponse.json({ ok: true, interesados });
  } catch (e) {
    console.error("interesados GET", e);
    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar los interesados" },
      { status: 500 }
    );
  }
}
