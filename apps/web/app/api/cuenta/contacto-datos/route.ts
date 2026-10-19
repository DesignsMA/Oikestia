import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { encryptField } from "@/lib/crypto";
import { perfilContactoSchema } from "@/lib/validators";
import { consumir, HORA } from "@/lib/rate-limit";
import { destino } from "@/lib/guardas";

/** Teléfono y redes sociales del perfil (teléfono cifrado en reposo). */
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

  const parsed = perfilContactoSchema.safeParse({
    tel: form.get("tel")?.toString() ?? "",
    instagram: form.get("instagram")?.toString() ?? "",
    facebook: form.get("facebook")?.toString() ?? "",
    x: form.get("x")?.toString() ?? "",
  });
  if (!parsed.success) {
    return NextResponse.redirect(destino(req, "/cuenta/contacto?error=3"), 303);
  }

  try {
    const { users } = await getCollections();
    const tel = parsed.data.tel?.trim() ?? "";
    const redes = [parsed.data.instagram, parsed.data.facebook, parsed.data.x]
      .map((r) => (r ?? "").trim())
      .filter(Boolean);

    await users.updateOne(
      { _id: new ObjectId(user.id) },
      {
        ...(tel
          ? { $set: { tel_enc: encryptField(tel), redes, actualizado: new Date() } }
          : { $unset: { tel_enc: "" }, $set: { redes, actualizado: new Date() } }),
      }
    );
    return NextResponse.redirect(destino(req, "/cuenta/contacto?ok=1"), 303);
  } catch (e) {
    console.error("cuenta/contacto-datos", e);
    return NextResponse.redirect(destino(req, "/cuenta/contacto?error=5"), 303);
  }
}
