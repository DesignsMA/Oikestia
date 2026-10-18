import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, ensureIndexes } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { borrarArchivos } from "@/lib/storage";
import type { ListingDoc } from "@/lib/listings";

const ESTADOS = ["borrador", "publicada", "pausada", "vendida", "rentada"] as const;

/** Cambia el estado de la publicación del propietario en sesión. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
  }

  const { id, estado } = await req.json().catch(() => ({}));
  if (!id || !ObjectId.isValid(id) || !ESTADOS.includes(estado)) {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    const { listings } = await getCollections();
    const _id = new ObjectId(id);

    const doc = (await listings.findOne({ _id })) as ListingDoc | null;
    if (!doc) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    if (String(doc.owner) !== user.id) {
      return NextResponse.json({ ok: false, error: "No es tu publicación" }, { status: 403 });
    }

    const cambios: Record<string, unknown> = { estado, actualizado: new Date() };
    if (estado === "publicada" && !doc.publicadoEn) cambios.publicadoEn = new Date();

    await listings.updateOne({ _id }, { $set: cambios });
    return NextResponse.json({ ok: true, estado });
  } catch (e) {
    console.error("publicaciones PATCH", e);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar" }, { status: 500 });
  }
}

/** Elimina la publicación y sus fotos de GridFS. */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
  }

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    const { listings } = await getCollections();
    const _id = new ObjectId(id);

    const doc = (await listings.findOne({ _id })) as ListingDoc | null;
    if (!doc) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    if (String(doc.owner) !== user.id) {
      return NextResponse.json({ ok: false, error: "No es tu publicación" }, { status: 403 });
    }

    await listings.deleteOne({ _id });
    const ids = doc.fotos.map((f) => f.fileId).filter((v): v is string => Boolean(v));
    if (ids.length) await borrarArchivos(ids, "fotos");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("publicaciones DELETE", e);
    return NextResponse.json({ ok: false, error: "No se pudo eliminar" }, { status: 500 });
  }
}
