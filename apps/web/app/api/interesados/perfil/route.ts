import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { perfilInteresado } from "@/lib/mensajes";

/** Perfil de un interesado, solo si existe un lead con el propietario (sin enumeración). */
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("user") ?? "";
  try {
    const perfil = await perfilInteresado(userId);
    if (!perfil) {
      return NextResponse.json({ ok: false, error: "No disponible" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, perfil });
  } catch (e) {
    console.error("interesados/perfil GET", e);
    return NextResponse.json({ ok: false, error: "No disponible" }, { status: 500 });
  }
}
