import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { compartirSchema } from "@/lib/validators";
import { consumir, HORA } from "@/lib/rate-limit";
import { destino } from "@/lib/guardas";

/** Qué datos comparte el usuario con el propietario al contactar. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(destino(req, "/login?error=sesion"), 303);
  }

  const porUsuario = await consumir(`cuenta:${user.id}`, 30, HORA);
  if (!porUsuario.permitido) {
    return NextResponse.redirect(destino(req, "/cuenta/contacto?error=429"), 303);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(destino(req, "/cuenta/contacto?error=3"), 303);
  }

  const parsed = compartirSchema.safeParse({
    correo: form.get("correo") !== null,
    telefono: form.get("telefono") !== null,
    redes: form.get("redes") !== null,
  });
  if (!parsed.success) {
    return NextResponse.redirect(destino(req, "/cuenta/contacto?error=3"), 303);
  }

  try {
    const { users } = await getCollections();
    await users.updateOne(
      { _id: new ObjectId(user.id) },
      { $set: { compartir: parsed.data, actualizado: new Date() } }
    );
    return NextResponse.redirect(destino(req, "/cuenta/contacto?ok=1"), 303);
  } catch (e) {
    console.error("cuenta/contacto", e);
    return NextResponse.redirect(destino(req, "/cuenta/contacto?error=5"), 303);
  }
}
