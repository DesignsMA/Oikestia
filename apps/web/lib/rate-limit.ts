import type { Collection } from "mongodb";
import { getCollections } from "./db";

/**
 * Límite de peticiones persistente en Mongo.
 * Ventana fija por clave: contador con $inc y limpieza automática por
 * índice TTL sobre "hasta". Sirve en despliegues multi-instancia.
 * Si Mongo no responde se degrada a un contador en memoria (protege
 * solo el proceso actual) para no tumbar la funcionalidad.
 */

export type Consumo = { permitido: boolean; restantes: number };

export const MINUTO = 60 * 1000;
export const QUINCE_MIN = 15 * MINUTO;
export const HORA = 60 * MINUTO;

type BucketMem = { n: number; fin: number };
const memoria = new Map<string, BucketMem>();

function consumirMemoria(clave: string, max: number, ventanaMs: number): Consumo {
  const ahora = Date.now();
  const b = memoria.get(clave);
  if (!b || b.fin <= ahora) {
    memoria.set(clave, { n: 1, fin: ahora + ventanaMs });
    return { permitido: 1 <= max, restantes: Math.max(0, max - 1) };
  }
  b.n += 1;
  if (memoria.size > 5000) {
    for (const [k, v] of memoria) if (v.fin <= ahora) memoria.delete(k);
  }
  return { permitido: b.n <= max, restantes: Math.max(0, max - b.n) };
}

/** Suma 1 al contador de `clave`. Devuelve false cuando se supera `max`. */
export async function consumir(clave: string, max: number, ventanaMs: number): Promise<Consumo> {
  try {
    const { rate_limits } = await getCollections();
    // La colección usa _id string (clave:ventana), no ObjectId.
    const col = rate_limits as unknown as Collection<{ _id: string; clave: string; n: number; hasta: Date }>;
    const ahora = Date.now();
    const ventana = Math.floor(ahora / ventanaMs);
    const id = `${clave}:${ventana}`;
    const hasta = new Date((ventana + 1) * ventanaMs + 60_000);
    let doc: { n?: number } | null;
    try {
      doc = await col.findOneAndUpdate(
        { _id: id },
        { $inc: { n: 1 }, $setOnInsert: { clave, hasta } },
        { upsert: true, returnDocument: "after" }
      );
    } catch {
      // Carrera de upsert (clave duplicada): reintenta sin insertar.
      doc = await col.findOneAndUpdate({ _id: id }, { $inc: { n: 1 } }, { returnDocument: "after" });
    }
    const n = Number(doc?.n ?? 1);
    return { permitido: n <= max, restantes: Math.max(0, max - n) };
  } catch (e) {
    console.error("rate-limit", e);
    return consumirMemoria(clave, max, ventanaMs);
  }
}

/** Vacía los contadores de una clave (p. ej. tras un login exitoso). */
export async function reiniciar(clave: string): Promise<void> {
  const ahora = Date.now();
  for (const [k, v] of memoria) if (k.startsWith(clave) && v.fin > ahora) memoria.delete(k);
  try {
    const { rate_limits } = await getCollections();
    await rate_limits.deleteMany({ clave });
  } catch {
    /* silencioso: el TTL limpia igualmente */
  }
}
