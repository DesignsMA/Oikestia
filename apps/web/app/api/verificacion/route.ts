import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, ensureIndexes } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { verificacionSchema } from "@/lib/validators";
import { subirArchivo } from "@/lib/storage";
import { consumir, HORA } from "@/lib/rate-limit";
import { cuerpoEnLimites } from "@/lib/guardas";

/** Verificación de identidad: documento a GridFS (bucket "documentos") con estado pendiente. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
  }
  if (user.rol !== "owner") {
    return NextResponse.json({ ok: false, error: "Solo propietarios se verifican" }, { status: 403 });
  }
  if (user.verificado) {
    return NextResponse.json({ ok: true, estado: "verificado", yaVerificado: true });
  }
  if (!cuerpoEnLimites(req, 9 * 1024 * 1024)) {
    return NextResponse.json({ ok: false, error: "El documento supera el tamaño máximo" }, { status: 413 });
  }
  const porUsuario = await consumir(`verificacion:${user.id}`, 5, HORA);
  if (!porUsuario.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiados envíos. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = verificacionSchema.safeParse({
    tipoDocumento: form.get("tipoDocumento")?.toString() ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const documento = form.getAll("documento").find((f): f is File => f instanceof File);
  if (!documento) {
    return NextResponse.json({ ok: false, error: "Adjunta la foto de tu documento" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    const up = await subirArchivo(documento, "documentos", { userId: user.id });

    const autoVerify = process.env.DEV_AUTO_VERIFY === "true";
    const ahora = new Date();
    const estado = autoVerify ? "verificado" : "pendiente";

    const { verificaciones, users } = await getCollections();
    await verificaciones.insertOne({
      userId: ObjectId.createFromHexString(user.id),
      tipoDocumento: parsed.data.tipoDocumento,
      fileId: up.fileId,
      filename: up.filename,
      estado,
      creado: ahora,
      resueltoEn: autoVerify ? ahora : null,
    });

    if (autoVerify) {
      await users.updateOne(
        { usernameNorm: user.username.toLowerCase() },
        { $set: { verificado: true, actualizado: ahora } }
      );
    }

    return NextResponse.json({
      ok: true,
      estado,
      mensaje: autoVerify
        ? "Cuenta verificada (modo desarrollo). Ya puedes publicar."
        : "Documento recibido. La revisión puede tardar hasta 48 horas hábiles.",
    });
  } catch (e) {
    console.error("verificacion", e);
    const msg = e instanceof Error ? e.message : "No se pudo subir el documento";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
