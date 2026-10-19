import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCollections, ensureIndexes } from "@/lib/db";
import { interesesSchema } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_INTERESTS } from "@/lib/intereses";
import { consumir, HORA } from "@/lib/rate-limit";
import { destino, ipDe } from "@/lib/guardas";

/** Guarda la selección de intereses (mínimo 3) del usuario en sesión. */
export async function POST(req: NextRequest) {
  const porIp = await consumir(`intereses:${ipDe(req)}`, 20, HORA);
  if (!porIp.permitido) {
    return NextResponse.redirect(destino(req, "/registro/intereses?error=429"), 303);
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(destino(req, "/login?error=sesion"), 303);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(destino(req, "/registro/intereses?error=1"), 303);
  }

  const seleccion = form
    .getAll("intereses")
    .map((v) => v.toString())
    .slice(0, 30);

  const parsed = interesesSchema.safeParse({ intereses: seleccion });
  if (!parsed.success) {
    return NextResponse.redirect(destino(req, "/registro/intereses?error=3"), 303);
  }

  // Solo claves que existen en el catálogo.
  const validas = new Set(DEFAULT_INTERESTS.map((i) => i.clave));
  const limpias = parsed.data.intereses.filter((k) => validas.has(k));
  if (limpias.length < 3) {
    return NextResponse.redirect(destino(req, "/registro/intereses?error=3"), 303);
  }

  try {
    await ensureIndexes();
    const { users } = await getCollections();
    await users.updateOne(
      { usernameNorm: user.username.toLowerCase() },
      { $set: { intereses: limpias, actualizado: new Date() } }
    );
    return NextResponse.redirect(destino(req, "/"), 303);
  } catch (e) {
    console.error("intereses", e);
    return NextResponse.redirect(destino(req, "/registro/intereses?error=500"), 303);
  }
}
