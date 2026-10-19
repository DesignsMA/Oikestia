import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { toggleFavorito } from "@/lib/favoritos";
import { consumir, HORA } from "@/lib/rate-limit";

/** Favoritos: POST alterna una publicación (body {slug}); GET no se usa (se lee en servidor). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
  }

  const limite = await consumir(`favoritos:${user.id}`, 60, HORA);
  if (!limite.permitido) {
    return NextResponse.json({ ok: false, error: "Demasiadas acciones. Espera un momento." }, { status: 429 });
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
    const res = await toggleFavorito(slug);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "Publicación no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, favorito: res.favorito });
  } catch (e) {
    console.error("favoritos", e);
    return NextResponse.json({ ok: false, error: "No se pudo guardar" }, { status: 500 });
  }
}
