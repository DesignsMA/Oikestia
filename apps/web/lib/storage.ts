import { getGridFS } from "./db";

/**
 * Subida de archivos a GridFS con límites del plan:
 * máximo 8 MB por imagen (MAX_UPLOAD_MB) y 20 fotos por publicación
 * (MAX_IMAGES_PER_LISTING). Solo tipos de imagen permitidos.
 */

export const TIPOS_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

export function maxUploadBytes(): number {
  const mb = Number(process.env.MAX_UPLOAD_MB ?? 8);
  return (Number.isFinite(mb) && mb > 0 ? mb : 8) * 1024 * 1024;
}

export function maxImagenesPorPublicacion(): number {
  const n = Number(process.env.MAX_IMAGES_PER_LISTING ?? 20);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

export type ArchivoSubido = { fileId: string; filename: string; contentType: string };

/** Guarda un archivo en el bucket indicado. Lanza Error con mensaje en español. */
export async function subirArchivo(
  file: File,
  bucket: "fotos" | "documentos",
  metadata: Record<string, unknown> = {}
): Promise<ArchivoSubido> {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new Error("Archivo inválido");
  }
  if (!file.size) throw new Error("El archivo está vacío");
  if (file.size > maxUploadBytes()) {
    throw new Error(`La imagen supera el máximo de ${maxUploadBytes() / 1024 / 1024} MB`);
  }
  const type = (file.type || "").toLowerCase();
  if (!TIPOS_PERMITIDOS.has(type)) {
    throw new Error("Formato no permitido: usa JPG, PNG, WEBP, AVIF o GIF");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const store = await getGridFS(bucket);
  const limpio = (file.name || "imagen").replace(/[^\w.\-]+/g, "_").slice(0, 100);

  const stream = store.openUploadStream(limpio, { metadata: { ...metadata, contentType: type } });
  await new Promise<void>((resolve, reject) => {
    stream.on("finish", () => resolve());
    stream.on("error", reject);
    stream.end(buffer);
  });

  return { fileId: String(stream.id), filename: limpio, contentType: type };
}

/** Borra archivos de GridFS (silencioso: se usa en limpiezas). */
export async function borrarArchivos(ids: string[], bucket: "fotos" | "documentos"): Promise<void> {
  const { ObjectId } = await import("mongodb");
  const store = await getGridFS(bucket);
  await Promise.all(
    ids
      .filter((id) => /^[a-f0-9]{24}$/i.test(id))
      .map((id) => store.delete(new ObjectId(id)).catch(() => undefined))
  );
}
