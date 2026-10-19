import { ObjectId, type Filter } from "mongodb";
import { getCollections } from "./db";
import { decryptField } from "./crypto";
import {
  AMENIDADES,
  AMENIDADES_ETIQUETAS,
  OPERACIONES,
  TIPOS_PROPIEDAD,
  type AmenityKey,
} from "./validators";

/** Modelo de publicaciones: fotos en GridFS (las de ejemplo, en /images); precios en MXN. */

export type ListingFoto = {
  /** Presente si la foto vive en GridFS. */
  fileId?: string;
  /** URL final: /api/fotos/<id> para GridFS, o ruta estática para el seed. */
  url: string;
  alt: string;
};

export type ListingDoc = {
  _id: ObjectId;
  slug: string;
  titulo: string;
  operacion: "venta" | "renta";
  tipoPropiedad: "casa" | "departamento" | "terreno" | "local-comercial";
  precio: number;
  moneda: "MXN";
  descripcion: string;
  direccion: { calle: string; colonia: string; ciudad: string; estado: string; cp: string };
  /** Opcional: se completa al geocodificar la dirección. */
  ubicacion?: { type: "Point"; coords: [number, number] };
  caracteristicas: {
    recamaras?: number;
    banos?: number;
    cocheras?: number;
    construccionM2?: number;
    terrenoM2?: number;
  };
  amenidades: string[];
  fotos: ListingFoto[];
  owner: ObjectId;
  estado: "borrador" | "publicada" | "pausada" | "vendida" | "rentada";
  creado: Date;
  actualizado: Date;
  publicadoEn?: Date;
};

const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** "$1,250,000" o "$12,000 /mes" (renta). */
export function formatearPrecio(precio: number, operacion: string): string {
  const base = fmtMXN.format(precio);
  return operacion === "renta" ? `${base} /mes` : base;
}

/** "Publicado hace 3 días" en español, con singular/plural. */
export function tiempoRelativo(desde: Date): string {
  const seg = Math.max(0, Math.floor((Date.now() - desde.getTime()) / 1000));
  const min = Math.floor(seg / 60);
  const horas = Math.floor(min / 60);
  const dias = Math.floor(horas / 24);
  const meses = Math.floor(dias / 30);
  const anios = Math.floor(dias / 365);
  if (meses >= 12) return `Publicado hace ${anios} ${anios === 1 ? "año" : "años"}`;
  if (meses >= 1) return `Publicado hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
  if (dias >= 1) return `Publicado hace ${dias} ${dias === 1 ? "día" : "días"}`;
  if (horas >= 1) return `Publicado hace ${horas} ${horas === 1 ? "hora" : "horas"}`;
  if (min >= 1) return `Publicado hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  return "Publicado hace un instante";
}

/** Dirección completa en una línea. */
export function direccionCompleta(d: ListingDoc["direccion"]): string {
  return `${d.calle}, ${d.colonia}, ${d.ciudad}, ${d.estado}, C.P. ${d.cp}`;
}

/** Slugs legibles y únicos en español. */
export function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/** Slug único contra la colección (sufijo -2, -3...). */
export async function slugUnico(base: string): Promise<string> {
  const { listings } = await getCollections();
  let slug = base || "propiedad";
  let n = 1;
  while (await listings.findOne({ slug }, { projection: { _id: 1 } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/* ---------------- Filtros de búsqueda ---------------- */

export type FiltrosPublicacion = {
  /** Texto libre: título, descripción, calle, colonia, ciudad o CP. */
  q?: string;
  tipo?: (typeof TIPOS_PROPIEDAD)[number];
  /** Varios tipos a la vez (checkboxes de la home). */
  tipos?: (typeof TIPOS_PROPIEDAD)[number][];
  operacion?: (typeof OPERACIONES)[number];
  precioMin?: number;
  precioMax?: number;
  recamaras?: number;
  amenidades?: string[];
  orden?: "reciente" | "precio-asc" | "precio-desc";
};

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Mapas de letras con acentos en español. $regex no hereda la collation
 * de la query, así que la tolerancia a acentos se resuelve en el patrón.
 */
const ACENTOS: Record<string, string> = {
  a: "[aáàäâ]",
  e: "[eéèëê]",
  i: "[iíìïî]",
  o: "[oóòöô]",
  u: "[uúùüû]",
  n: "[nñ]",
  c: "[cç]",
};

/** Expresión insensible a mayúsculas y acentos ("angelopolis" ≡ "Ángelopolis"). */
function regexTolerante(texto: string): RegExp {
  const cuerpo = [...texto]
    .map((ch) => ACENTOS[ch.toLowerCase()] ?? escapeRegex(ch))
    .join("");
  return new RegExp(cuerpo, "i");
}

function soloString(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return undefined;
  const limpio = s.trim();
  return limpio ? limpio : undefined;
}

function soloNumero(v: string | string[] | undefined): number | undefined {
  const s = soloString(v);
  if (s === undefined) return undefined;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/** Rangos de precio de la home (?precio=1m-3m) → [min, max]. */
const RANGOS_PRECIO: Record<string, [number | undefined, number | undefined]> = {
  "0-1m": [undefined, 1_000_000],
  "1m-3m": [1_000_000, 3_000_000],
  "3m-6m": [3_000_000, 6_000_000],
  "6m+": [6_000_000, undefined],
};

/** Lee y sanea los query params del catálogo (?tipo=casa&operacion=renta...). */
export function parsearFiltros(
  sp: Record<string, string | string[] | undefined>
): FiltrosPublicacion {
  const f: FiltrosPublicacion = {};

  const q = soloString(sp.q)?.slice(0, 80);
  if (q) f.q = q;

  const tipos = (Array.isArray(sp.tipo) ? sp.tipo : sp.tipo ? [sp.tipo] : [])
    .map((t) => soloString(t))
    .filter((t): t is string => !!t && (TIPOS_PROPIEDAD as readonly string[]).includes(t))
    .slice(0, 4);
  if (tipos.length === 1) f.tipo = tipos[0] as FiltrosPublicacion["tipo"];
  else if (tipos.length > 1) f.tipos = tipos as FiltrosPublicacion["tipos"];

  const operacion = soloString(sp.operacion);
  if (operacion && (OPERACIONES as readonly string[]).includes(operacion)) {
    f.operacion = operacion as FiltrosPublicacion["operacion"];
  }

  const precioMin = soloNumero(sp.precioMin);
  if (precioMin !== undefined) f.precioMin = precioMin;
  const precioMax = soloNumero(sp.precioMax);
  if (precioMax !== undefined) f.precioMax = precioMax;
  if (f.precioMin === undefined && f.precioMax === undefined) {
    const rango = RANGOS_PRECIO[soloString(sp.precio) ?? ""];
    if (rango) {
      if (rango[0] !== undefined) f.precioMin = rango[0];
      if (rango[1] !== undefined) f.precioMax = rango[1];
    }
  }

  const recamaras = soloNumero(sp.recamaras);
  if (recamaras !== undefined) f.recamaras = Math.min(Math.floor(recamaras), 50);

  const amenidades = (Array.isArray(sp.amenidades) ? sp.amenidades : [sp.amenidades])
    .filter((v): v is string => typeof v === "string")
    .filter((v) => v in AMENIDADES)
    .slice(0, 20);
  if (amenidades.length) f.amenidades = [...new Set(amenidades)];

  const orden = soloString(sp.orden);
  if (orden === "precio-asc" || orden === "precio-desc" || orden === "reciente") {
    f.orden = orden;
  }

  return f;
}

/** ¿El filtro aporta algún criterio? */
export function hayFiltros(f: FiltrosPublicacion): boolean {
  return Object.values(f).some((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined));
}

/** Filtro Mongo solo con estado "publicada" + criterios activos. */
export function queryPublicadas(f: FiltrosPublicacion = {}): Filter<Record<string, unknown>> {
  const cond: Record<string, unknown> = { estado: "publicada" };

  if (f.q) {
    const re = regexTolerante(f.q);
    cond.$or = [
      { titulo: re },
      { descripcion: re },
      { "direccion.calle": re },
      { "direccion.colonia": re },
      { "direccion.ciudad": re },
      { "direccion.cp": re },
    ];
  }
  if (f.tipos?.length) cond.tipoPropiedad = { $in: f.tipos };
  else if (f.tipo) cond.tipoPropiedad = f.tipo;
  if (f.operacion) cond.operacion = f.operacion;

  if (f.precioMin !== undefined || f.precioMax !== undefined) {
    const rango: Record<string, number> = {};
    if (f.precioMin !== undefined) rango.$gte = f.precioMin;
    if (f.precioMax !== undefined) rango.$lte = f.precioMax;
    cond.precio = rango;
  }
  if (f.recamaras !== undefined) cond["caracteristicas.recamaras"] = { $gte: f.recamaras };
  if (f.amenidades?.length) cond.amenidades = { $all: f.amenidades };

  return cond as Filter<Record<string, unknown>>;
}

function sortPublicaciones(f: FiltrosPublicacion): Record<string, 1 | -1> {
  if (f.orden === "precio-asc") return { precio: 1, publicadoEn: -1 };
  if (f.orden === "precio-desc") return { precio: -1, publicadoEn: -1 };
  return { publicadoEn: -1, actualizado: -1 };
}

/** Publicaciones publicadas con filtros. Si la colección está vacía, siembra la demo. */
export async function getPublicadas(
  filtros: FiltrosPublicacion = {},
  limite = 60
): Promise<ListingDoc[]> {
  const { listings } = await getCollections();
  if ((await listings.estimatedDocumentCount()) === 0) {
    const { seedListings } = await import("./seed-listings");
    await seedListings();
  }
  return (await listings
    .find(queryPublicadas(filtros), { collation: { locale: "es", strength: 1 } })
    .sort(sortPublicaciones(filtros))
    .limit(limite)
    .toArray()) as unknown as ListingDoc[];
}

/** Publicación por slug (solo publicadas para el público). Siembra demo si la BD está vacía. */
export async function getPorSlug(slug: string): Promise<ListingDoc | null> {
  const { listings } = await getCollections();
  let doc = await listings.findOne({ slug, estado: "publicada" });
  if (!doc && (await listings.estimatedDocumentCount()) === 0) {
    const { seedListings } = await import("./seed-listings");
    await seedListings();
    doc = await listings.findOne({ slug, estado: "publicada" });
  }
  return doc as ListingDoc | null;
}

/** Publicaciones de un propietario, cualquier estado. */
export async function getPorOwner(ownerId: string): Promise<ListingDoc[]> {
  const { listings } = await getCollections();
  const owner = new ObjectId(ownerId);
  return (await listings.find({ owner }).sort({ actualizado: -1 }).toArray()) as unknown as ListingDoc[];
}

export type OwnerPublico = {
  nombre: string;
  avatarUrl: string;
  verificado: boolean;
};

/** Datos públicos del propietario para la ficha (nombre y foto; sin teléfono). */
export async function getOwnerPublico(ownerId: ObjectId): Promise<OwnerPublico> {
  try {
    const { users } = await getCollections();
    const user = (await users.findOne({ _id: ownerId })) as
      | {
          fullname_enc?: string;
          nombre_enc?: string;
          username: string;
          verificado: boolean;
          avatarFileId?: string;
        }
      | null;
    if (!user) return { nombre: "Propietario", avatarUrl: "/images/user-placeholder.webp", verificado: false };
    let nombre = user.username;
    for (const enc of [user.nombre_enc, user.fullname_enc]) {
      if (enc) {
        try {
          nombre = decryptField(enc);
          break;
        } catch {
          /* clave rotada: se prueba el siguiente o el usuario */
        }
      }
    }
    return {
      nombre,
      avatarUrl: user.avatarFileId ? `/api/fotos/${user.avatarFileId}` : "/images/user-placeholder.webp",
      verificado: user.verificado,
    };
  } catch {
    return { nombre: "Propietario", avatarUrl: "/images/user-placeholder.webp", verificado: false };
  }
}

/** Amenidades con su icono para la ficha de detalle. */
export function amenidadesConIcono(claves: string[]): { icon: (typeof AMENIDADES)[AmenityKey]; label: string }[] {
  const res: { icon: (typeof AMENIDADES)[AmenityKey]; label: string }[] = [];
  for (const clave of claves) {
    const icon = AMENIDADES[clave as AmenityKey];
    if (icon) res.push({ icon, label: AMENIDADES_ETIQUETAS[clave as AmenityKey] ?? clave });
  }
  return res;
}

/** Párrafos de la descripción (separados por línea en blanco). */
export function parrafos(descripcion: string): string[] {
  return descripcion
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Embed de OpenStreetMap centrado en [lng, lat] (con margen). */
export function embedMapa(coords: [number, number]): string {
  const [lng, lat] = coords;
  const d = 0.004;
  const bbox = [lng - d, lat - d / 1.6, lng + d, lat + d / 1.6].join("%2C");
  return `https://www.openstreetmap.org/export/embed?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}
