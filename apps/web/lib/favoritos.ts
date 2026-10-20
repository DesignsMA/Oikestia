import { ObjectId } from "mongodb";
import { getCollections, ensureIndexes } from "./db";
import { getSessionUser } from "./auth";
import type { ListingDoc } from "./listings";

/** Favoritos: relación (usuario, publicación); alimenta las recomendaciones. */

/** Alterna el favorito de una publicación por slug. Devuelve el estado final. */
export async function toggleFavorito(slug: string): Promise<{ ok: boolean; favorito: boolean }> {
  const sesion = await getSessionUser();
  if (!sesion) return { ok: false, favorito: false };
  await ensureIndexes();
  const { listings, favoritos } = await getCollections();

  const listing = await listings.findOne({ slug }, { projection: { _id: 1 } });
  if (!listing) return { ok: false, favorito: false };

  const userId = new ObjectId(sesion.id);
  const listingId = listing._id as ObjectId;
  const existente = await favoritos.findOne({ userId, listingId });

  if (existente) {
    await favoritos.deleteOne({ _id: existente._id });
    await listings.updateOne({ _id: listingId }, { $inc: { "estadisticas.favoritos": -1 } });
    return { ok: true, favorito: false };
  }
  await favoritos.insertOne({ userId, listingId, creado: new Date() });
  await listings.updateOne({ _id: listingId }, { $inc: { "estadisticas.favoritos": 1 } });
  return { ok: true, favorito: true };
}

/** ¿La sesión actual tiene esta publicación en favoritos? */
export async function esFavorito(listingId: ObjectId): Promise<boolean> {
  const sesion = await getSessionUser();
  if (!sesion) return false;
  const { favoritos } = await getCollections();
  const doc = await favoritos.findOne(
    { userId: new ObjectId(sesion.id), listingId },
    { projection: { _id: 1 } }
  );
  return !!doc;
}

/** IDs de publicaciones favoritas de la sesión. */
export async function idsFavoritos(): Promise<ObjectId[]> {
  const sesion = await getSessionUser();
  if (!sesion) return [];
  const { favoritos } = await getCollections();
  const docs = await favoritos
    .find({ userId: new ObjectId(sesion.id) }, { projection: { listingId: 1 } })
    .sort({ creado: -1 })
    .toArray();
  return docs.map((d) => d.listingId as ObjectId);
}

/** Publicaciones favoritas de la sesión (solo publicadas). */
export async function listarFavoritos(): Promise<ListingDoc[]> {
  const sesion = await getSessionUser();
  if (!sesion) return [];
  const ids = await idsFavoritos();
  if (!ids.length) return [];
  const { listings } = await getCollections();
  const docs = (await listings
    .find({ _id: { $in: ids }, estado: "publicada" })
    .toArray()) as unknown as ListingDoc[];
  // Orden según el orden de favoritos (más reciente primero).
  const orden = new Map(ids.map((id, i) => [String(id), i]));
  return docs.sort((a, b) => (orden.get(String(a._id)) ?? 0) - (orden.get(String(b._id)) ?? 0));
}
