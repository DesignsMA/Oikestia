import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { cuentaSchema } from "@/lib/validators";
import { consumir, HORA } from "@/lib/rate-limit";
import { destino } from "@/lib/guardas";

/** Nombre visible de la cuenta (cifrado en reposo). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(destino(req, "/login?error=sesion"), 303);
  }

  const porUsuario = await consumir(`cuenta:${user.id}`, 30, HORA);
  if (!porUsuario.permitido) {
    return NextResponse.redirect(destino(req, "/cuenta?error=429"), 303);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(destino(req, "/cuenta?error=3"), 303);
  }

  const parsed = cuentaSchema.safeParse({
    nombre: form.get("nombre")?.toString() ?? "",
  });
  if (!parsed.success) {
    return NextResponse.redirect(destino(req, "/cuenta?error=3"), 303);
  }

  try {
    const { users } = await getCollections();
    const nombre = parsed.data.nombre;
    await users.updateOne(
      { _id: new ObjectId(user.id) },
      nombre
        ? { $set: { nombre_enc: encryptField(nombre), actualizado: new Date() } }
        : { $unset: { nombre_enc: "" }, $set: { actualizado: new Date() } }
    );
    return NextResponse.redirect(destino(req, "/cuenta?ok=1"), 303);
  } catch (e) {
    console.error("cuenta", e);
    return NextResponse.redirect(destino(req, "/cuenta?error=5"), 303);
  }
}
