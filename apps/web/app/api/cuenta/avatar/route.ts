import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { subirArchivo, borrarArchivos } from "@/lib/storage";
import { consumir, HORA } from "@/lib/rate-limit";
import { destino, cuerpoEnLimites } from "@/lib/guardas";

/** Foto de perfil: sube a GridFS ("fotos") y reemplaza la anterior. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(destino(req, "/login?error=sesion"), 303);
  }

  if (!cuerpoEnLimites(req, 9 * 1024 * 1024)) {
    return NextResponse.redirect(destino(req, "/cuenta?error=413"), 303);
  }

  const porUsuario = await consumir(`avatar:${user.id}`, 10, HORA);
  if (!porUsuario.permitido) {
    return NextResponse.redirect(destino(req, "/cuenta?error=429"), 303);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(destino(req, "/cuenta?error=3"), 303);
  }

  const archivo = form.getAll("avatar").find((f): f is File => f instanceof File);
  if (!archivo || !archivo.size) {
    return NextResponse.redirect(destino(req, "/cuenta?error=archivo"), 303);
  }

  try {
    const subido = await subirArchivo(archivo, "fotos", { tipo: "avatar", userId: user.id });
    const { users } = await getCollections();
    await users.updateOne(
      { _id: new ObjectId(user.id) },
      { $set: { avatarFileId: subido.fileId, actualizado: new Date() } }
    );

    if (user.avatarFileId && user.avatarFileId !== subido.fileId) {
      await borrarArchivos([user.avatarFileId], "fotos");
    }

    return NextResponse.redirect(destino(req, "/cuenta?ok=1"), 303);
  } catch (e) {
    console.error("cuenta/avatar", e);
    const msg = e instanceof Error ? e.message : "";
    const codigo = msg.includes("Formato") || msg.includes("máximo") || msg.includes("vacío")
      ? "archivo"
      : "5";
    return NextResponse.redirect(destino(req, `/cuenta?error=${codigo}`), 303);
  }
}
