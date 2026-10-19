import { getCollections } from "./db";

/** Catálogo de intereses; se siembra en Mongo en el primer arranque. */

export type InterestItem = {
  grupo: string;
  clave: string;
  etiqueta: string;
  reglas: Record<string, unknown>;
};

export const DEFAULT_INTERESTS: InterestItem[] = [
  // Tipo de propiedad
  { grupo: "Tipo de propiedad", clave: "casa", etiqueta: "Casas", reglas: { tipoPropiedad: "casa" } },
  { grupo: "Tipo de propiedad", clave: "departamento", etiqueta: "Departamentos", reglas: { tipoPropiedad: "departamento" } },
  { grupo: "Tipo de propiedad", clave: "terreno", etiqueta: "Terrenos", reglas: { tipoPropiedad: "terreno" } },
  { grupo: "Tipo de propiedad", clave: "local-comercial", etiqueta: "Locales comerciales", reglas: { tipoPropiedad: "local-comercial" } },

  // Operación
  { grupo: "Operación", clave: "comprar", etiqueta: "Quiero comprar", reglas: { operacion: "venta" } },
  { grupo: "Operación", clave: "rentar", etiqueta: "Quiero rentar", reglas: { operacion: "renta" } },

  // Estilo de vida y entorno
  { grupo: "Estilo de vida", clave: "cerca-universidades", etiqueta: "Cerca de universidades", reglas: { cercania: ["universidad"] } },
  { grupo: "Estilo de vida", clave: "familiar-escuelas", etiqueta: "Familiar, cerca de escuelas", reglas: { cercania: ["escuela"] } },
  { grupo: "Estilo de vida", clave: "zona-tranquila", etiqueta: "Zona tranquila", reglas: { estilo: "tranquila" } },
  { grupo: "Estilo de vida", clave: "naturaleza", etiqueta: "Naturaleza y espacios verdes", reglas: { cercania: ["parque"] } },
  { grupo: "Estilo de vida", clave: "transporte-publico", etiqueta: "Cerca de transporte público", reglas: { cercania: ["transporte"] } },
  { grupo: "Estilo de vida", clave: "mascotas", etiqueta: "Apto para mascotas", reglas: { regla: { mascotas: "permitido" } } },
  { grupo: "Estilo de vida", clave: "inversion", etiqueta: "Como inversión", reglas: { objetivo: "inversion" } },

  // Amenidades deseadas
  { grupo: "Amenidades", clave: "alberca", etiqueta: "Alberca", reglas: { amenidades: ["alberca"] } },
  { grupo: "Amenidades", clave: "estacionamiento", etiqueta: "Estacionamiento", reglas: { amenidades: ["estacionamiento"] } },
  { grupo: "Amenidades", clave: "gym", etiqueta: "Gimnasio", reglas: { amenidades: ["gym"] } },
  { grupo: "Amenidades", clave: "terraza", etiqueta: "Terraza", reglas: { amenidades: ["terraza"] } },
  { grupo: "Amenidades", clave: "cctv", etiqueta: "Videovigilancia", reglas: { amenidades: ["cctv"] } },

  // Presupuesto
  { grupo: "Presupuesto", clave: "hasta-1m", etiqueta: "Hasta $1,000,000", reglas: { precioMax: 1000000 } },
  { grupo: "Presupuesto", clave: "1m-3m", etiqueta: "$1,000,000 a $3,000,000", reglas: { precioMin: 1000000, precioMax: 3000000 } },
  { grupo: "Presupuesto", clave: "3m+", etiqueta: "Más de $3,000,000", reglas: { precioMin: 3000000 } },

  // Zonas
  { grupo: "Zonas", clave: "angelopolis", etiqueta: "Angelópolis", reglas: { zona: "angelopolis" } },
  { grupo: "Zonas", clave: "centro-historico", etiqueta: "Centro Histórico", reglas: { zona: "centro" } },
  { grupo: "Zonas", clave: "cholula", etiqueta: "Cholula", reglas: { zona: "cholula" } },
  { grupo: "Zonas", clave: "angelopolis-sur", etiqueta: "Sur de Puebla", reglas: { zona: "sur" } },
];

/** Siembra el catálogo si la colección está vacía. Idempotente. */
export async function seedInterests(): Promise<void> {
  const { interest_catalog } = await getCollections();
  const existing = await interest_catalog.estimatedDocumentCount();
  if (existing > 0) return;
  await interest_catalog.insertMany(DEFAULT_INTERESTS);
}

/** Catálogo agrupado para la pantalla de intereses. */
export async function getInterestCatalog(): Promise<Record<string, InterestItem[]>> {
  try {
    await seedInterests();
    const { interest_catalog } = await getCollections();
    const all = (await interest_catalog.find({}).toArray()) as unknown as InterestItem[];
    const grouped: Record<string, InterestItem[]> = {};
    for (const item of all) {
      (grouped[item.grupo] ??= []).push(item);
    }
    return grouped;
  } catch {
    // Sin Mongo (build, caída puntual) se sirve el catálogo por defecto.
    const grouped: Record<string, InterestItem[]> = {};
    for (const item of DEFAULT_INTERESTS) {
      (grouped[item.grupo] ??= []).push(item);
    }
    return grouped;
  }
}
