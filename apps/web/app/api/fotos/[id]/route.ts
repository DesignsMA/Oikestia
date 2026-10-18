import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { Readable } from "node:stream";
import { getGridFS } from "@/lib/db";

/** Sirve una foto almacenada en GridFS (bucket "fotos"). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "Identificador inválido" }, { status: 400 });
  }

  try {
    const bucket = await getGridFS("fotos");
    const fileId = new ObjectId(id);

    const file = await bucket.find({ _id: fileId }).next();
    if (!file) {
      return NextResponse.json({ ok: false, error: "Foto no encontrada" }, { status: 404 });
    }

    const stream = bucket.openDownloadStream(fileId);
    const web = Readable.toWeb(stream) as ReadableStream;

    return new NextResponse(web, {
      status: 200,
      headers: {
        "Content-Type": (file.metadata?.contentType as string | undefined) ?? "application/octet-stream",
        "Content-Length": String(file.length),
        // Los IDs son únicos e inmutables: cachear agresivamente.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("fotos", e);
    return NextResponse.json({ ok: false, error: "No se pudo leer la foto" }, { status: 500 });
  }
}
