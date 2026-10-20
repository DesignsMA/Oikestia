import { createHash } from "crypto";
import type { ObjectId } from "mongodb";
import { getCollections } from "./db";

/**
 * Registro de interacciones de una publicación. Las métricas son agregadas y
 * anónimas: los usuarios únicos se deduplican con un hash irreversible (sin IP
 * en claro) que caduca a los 30 días.
 */

const DIAS_VISTA = 30;

function hashVisitante(ip: string, ua: string, dia: string): string {
  const sal = process.env.SESSION_SECRET ?? "oikestia";
  return createHash("sha256").update(`${sal}|${ip}|${ua}|${dia}`).digest("hex");
}

/** Cuenta una visita; incrementa únicos solo la primera vez del día. */
export async function registrarVisita(
  listingId: ObjectId,
  ip: string,
  ua: string
): Promise<void> {
  try {
    const { listings, vistas } = await getCollections();
    const dia = new Date().toISOString().slice(0, 10);
    const visitante = hashVisitante(ip, ua, dia);

    const antes = await vistas.findOne({ listingId, visitante }, { projection: { _id: 1 } });
    const inc: Record<string, number> = { "estadisticas.visitas": 1 };
    if (!antes) {
      inc["estadisticas.usuariosUnicos"] = 1;
      await vistas.updateOne(
        { listingId, visitante },
        {
          $setOnInsert: {
            listingId,
            visitante,
            creado: new Date(),
            expira: new Date(Date.now() + DIAS_VISTA * 24 * 60 * 60 * 1000),
          },
        },
        { upsert: true }
      );
    }
    await listings.updateOne({ _id: listingId }, { $inc: inc });
  } catch (e) {
    // Las estadísticas nunca deben romper la página.
    console.warn("registrarVisita", e instanceof Error ? e.message : e);
  }
}

/** Suma un contador simple ("contactos", "compartidos", "vecesMostradoContacto"...). */
export async function incrementar(
  listingId: ObjectId,
  campo:
    | "contactos"
    | "compartidos"
    | "vecesMostradoContacto"
    | "desdeBusqueda"
    | "desdeRecomendaciones"
    | "favoritos",
  delta = 1
): Promise<void> {
  try {
    const { listings } = await getCollections();
    await listings.updateOne({ _id: listingId }, { $inc: { [`estadisticas.${campo}`]: delta } });
  } catch (e) {
    console.warn("incrementar", e instanceof Error ? e.message : e);
  }
}
