import { ObjectId } from "mongodb";
import { getCollections } from "./db";

/** Estado de verificación de identidad visible para la cuenta. */

export type EstadoVerificacion = "sin-iniciar" | "pendiente" | "verificado" | "rechazado";

export type VerificacionEstado = {
  estado: EstadoVerificacion;
  tipoDocumento: string | null;
  creado: Date | null;
};

/** Última solicitud de verificación del usuario (o "sin-iniciar"). */
export async function ultimaVerificacion(
  userId: string,
  verificado: boolean
): Promise<VerificacionEstado> {
  if (verificado) {
    return { estado: "verificado", tipoDocumento: null, creado: null };
  }
  try {
    const { verificaciones } = await getCollections();
    const doc = (await verificaciones.findOne(
      { userId: new ObjectId(userId) },
      { sort: { creado: -1 } }
    )) as { estado?: string; tipoDocumento?: string; creado?: Date } | null;
    if (!doc) return { estado: "sin-iniciar", tipoDocumento: null, creado: null };
    const estado = (doc.estado as EstadoVerificacion) ?? "pendiente";
    return {
      estado,
      tipoDocumento: doc.tipoDocumento ?? null,
      creado: doc.creado ?? null,
    };
  } catch {
    return { estado: "sin-iniciar", tipoDocumento: null, creado: null };
  }
}
