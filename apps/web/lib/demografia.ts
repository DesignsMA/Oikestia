/**
 * Métricas demográficas derivadas (sin pedir datos nuevos al usuario).
 *
 * - dispositivo: se infiere del user-agent (móvil, tablet o escritorio).
 * - ubicacionGeneral: se infiere de los intereses del usuario (grupo Zonas);
 *   los visitantes anónimos quedan en "sin dato".
 * - edad / genero: no hay fuente en los datos existentes, por eso no se
 *   registran (el dashboard los muestra como "sin dato").
 */

export type Demografia = {
  dispositivo?: string;
  ubicacionGeneral?: string;
};

/** Clasifica el user-agent en un bucket de dispositivo. */
export function dispositivoDe(ua: string): string {
  const s = (ua || "").toLowerCase();
  if (!s) return "sin dato";
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(s)) return "móvil";
  return "escritorio";
}

/** Zonas conocidas del catálogo de intereses → etiqueta de ubicación general. */
const ZONA_UBICACION: Record<string, string> = {
  angelopolis: "Angelópolis, Puebla",
  centro: "Centro Histórico, Puebla",
  cholula: "Cholula, Puebla",
  sur: "Sur de Puebla",
};

/** Deriva la ubicación general a partir de las claves de interés del usuario. */
export function ubicacionDeIntereses(intereses: string[]): string | undefined {
  for (const clave of intereses) {
    const zona = ZONA_UBICACION[clave];
    if (zona) return zona;
  }
  return undefined;
}

/** Construye el bloque demográfico a partir del UA y los intereses del usuario. */
export function demografiaDe(ua: string, intereses: string[] = []): Demografia {
  const demo: Demografia = { dispositivo: dispositivoDe(ua) };
  const ubicacion = ubicacionDeIntereses(intereses);
  if (ubicacion) demo.ubicacionGeneral = ubicacion;
  return demo;
}
