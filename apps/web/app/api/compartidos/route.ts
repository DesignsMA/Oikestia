import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublicadaIdPorSlug } from "@/lib/listings";
import { incrementar } from "@/lib/estadisticas";
import { consumir, HORA } from "@/lib/rate-limit";
import { headers } from "next/headers";

/** Compartidos: POST {slug} incrementa el contador (anónimo, sin requerir sesión). */
export async function POST(req: NextRequest) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
  const limite = await consumir(`compartidos:${ip}`, 60, HORA);
  if (!limite.permitido) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().slice(0, 140) : "";
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Publicación inválida" }, { status: 400 });
  }

  try {
    const id = await getPublicadaIdPorSlug(slug);
    if (!id) {
      return NextResponse.json({ ok: false, error: "Publicación no encontrada" }, { status: 404 });
    }
    await incrementar(id, "compartidos");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("compartidos", e);
    return NextResponse.json({ ok: false, error: "No se pudo registrar" }, { status: 500 });
  }
}
