import { ObjectId } from "mongodb";
import { getCollections } from "./db";
import { getSessionUser } from "./auth";
import { idsFavoritos } from "./favoritos";
import type { ListingDoc } from "./listings";
import { DEFAULT_INTERESTS } from "./intereses";

/**
 * Recomendaciones por afinidad: puntúa publicaciones publicadas según los
 * favoritos, los intereses del registro y los contactos recientes del usuario.
 * Sin señales, cae en las más recientes (comportamiento previo).
 */

type Reglas = {
  tipoPropiedad?: string;
  operacion?: string;
  precioMin?: number;
  precioMax?: number;
  amenidades?: string[];
  zona?: string;
};

const CLAVES_AMENIDAD = new Set(
  DEFAULT_INTERESTS.filter((i) => (i.reglas as Reglas).amenidades).map((i) => i.clave)
);

/** Suma puntos de una publicación frente a un perfil de afinidad. */
function puntuar(l: ListingDoc, tipo: Map<string, number>, oper: Map<string, number>, amen: Map<string, number>, precio: { min?: number; max?: number; n: number }, ciudades: Map<string, number>): number {
  let p = 0;
  if (tipo.has(l.tipoPropiedad)) p += 3 * tipo.get(l.tipoPropiedad)!;
  if (oper.has(l.operacion)) p += 2 * oper.get(l.operacion)!;
  for (const a of l.amenidades) if (amen.has(a)) p += 2 * amen.get(a)!;
  if (precio.n > 0) {
    const dentro =
      (precio.min === undefined || l.precio >= precio.min) &&
      (precio.max === undefined || l.precio <= precio.max);
    if (dentro) p += 2;
  }
  const ciudad = l.direccion.ciudad.toLowerCase();
  if (ciudades.has(ciudad)) p += 1.5 * ciudades.get(ciudad)!;
  return p;
}

/** Publicaciones recomendadas para la sesión (o las más recientes si no hay señales). */
export async function recomendaciones(limite = 6): Promise<ListingDoc[]> {
  const { listings, users, leads } = await getCollections();

  const recientes = (await listings
    .find({ estado: "publicada" })
    .sort({ publicadoEn: -1, actualizado: -1 })
    .limit(limite)
    .toArray()) as unknown as ListingDoc[];

  const sesion = await getSessionUser();
  if (!sesion) return recientes;

  const tipo = new Map<string, number>();
  const oper = new Map<string, number>();
  const amen = new Map<string, number>();
  const ciudades = new Map<string, number>();
  const precio = { min: undefined as number | undefined, max: undefined as number | undefined, n: 0 };
  const sumar = (m: Map<string, number>, k: string, v = 1) => m.set(k, (m.get(k) ?? 0) + v);

  // 1) Favoritos: señal más fuerte.
  const favIds = await idsFavoritos();
  if (favIds.length) {
    const favs = (await listings
      .find({ _id: { $in: favIds } })
      .toArray()) as unknown as ListingDoc[];
    for (const f of favs) {
      sumar(tipo, f.tipoPropiedad, 2);
      sumar(oper, f.operacion, 2);
      for (const a of f.amenidades) sumar(amen, a, 2);
      sumar(ciudades, f.direccion.ciudad.toLowerCase(), 2);
    }
  }

  // 2) Intereses del registro.
  const u = (await users.findOne(
    { _id: new ObjectId(sesion.id) },
    { projection: { intereses: 1, ciudad: 1 } }
  )) as { intereses?: string[]; ciudad?: string } | null;
  for (const clave of u?.intereses ?? []) {
    const regla = (DEFAULT_INTERESTS.find((i) => i.clave === clave)?.reglas ?? {}) as Reglas;
    if (regla.tipoPropiedad) sumar(tipo, regla.tipoPropiedad);
    if (regla.operacion) sumar(oper, regla.operacion);
    for (const a of regla.amenidades ?? []) sumar(amen, a);
    if (regla.precioMin !== undefined) precio.min = regla.precioMin;
    if (regla.precioMax !== undefined) {
      precio.max = precio.max === undefined ? regla.precioMax : Math.max(precio.max, regla.precioMax);
    }
    if (regla.precioMin !== undefined || regla.precioMax !== undefined) precio.n += 1;
  }

  // 3) Contactos recientes (qué tipos/zonas le interesan de verdad).
  const ultimosLeads = (await leads
    .find({ userId: new ObjectId(sesion.id) })
    .sort({ creado: -1 })
    .limit(10)
    .toArray()) as unknown as { listingId: unknown }[];
  if (ultimosLeads.length) {
    const idsLeads = ultimosLeads
      .map((l) => l.listingId)
      .filter((id): id is ObjectId => id instanceof ObjectId);
    const pubs = (await listings
      .find({ _id: { $in: idsLeads } })
      .toArray()) as unknown as ListingDoc[];
    for (const pub of pubs) {
      sumar(tipo, pub.tipoPropiedad);
      sumar(oper, pub.operacion);
      sumar(ciudades, pub.direccion.ciudad.toLowerCase());
    }
  }

  const haySenales = tipo.size || oper.size || amen.size || ciudades.size || precio.n;
  if (!haySenales) return recientes;

  const candidatas = (await listings
    .find({ estado: "publicada" })
    .limit(60)
    .toArray()) as unknown as ListingDoc[];

  return candidatas
    .map((l) => ({ l, score: puntuar(l, tipo, oper, amen, precio, ciudades) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((x) => x.l);
}
