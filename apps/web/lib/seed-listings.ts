import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { getCollections } from "./db";
import { hashPassword, encryptField, sha256 } from "./crypto";
import { slugify } from "./listings";
import type { ListingDoc, ListingFoto } from "./listings";

/** Siembra idempotente de publicaciones de demostración. */

type Muestra = {
  titulo: string;
  operacion: "venta" | "renta";
  tipo: ListingDoc["tipoPropiedad"];
  precio: number;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  /** [lng, lat] aproximadas (GeoJSON); el geocodificado las refina. */
  coords?: [number, number];
  recamaras?: number;
  banos?: number;
  cocheras?: number;
  construccionM2?: number;
  terrenoM2?: number;
  amenidades: string[];
  fotos: { url: string; alt: string }[];
  descripcion: string;
  calle: string;
};

const F = (n: number, alt: string): { url: string; alt: string } => ({
  url: `/images/property${n}.webp`,
  alt,
});

const descCasa =
  "Casa de arquitectura contemporánea con ventanales de piso a techo, iluminación natural durante todo el el día y acabados de primera. La planta social conecta sala, comedor y cocina en un solo espacio abierto hacia el jardín trasero.\n\n" +
  "Cuenta con recámaras amplias con vestidor, baños con acabados de mármol, cotechera techada y sistemas de aire acondicionado central. La ubicación permite llegar en minutos a escuelas, parques y centros comerciales.";

const descDepto =
  "Departamento con vista panorámica, balcón orientado al poniente y acabados modernos. La cocina integral incluye isla de desayuno y la sala aprovecha la altura libre para mayor sensación de amplitud.\n\n" +
  "El edificio ofrece acceso controlado, vigilancia 24/7, gimnasio, área verde y estacionamiento techado. Muy cerca de Angelópolis, transporte público y servicios de la zona.";

const descTerreno =
  "Terreno plano con frente amplio sobre camino pavimentado y todos los servicios públicos disponibles (agua, luz y drenaje).\n\n" +
  "Zona en crecimiento con fácil acceso a la carretera principal, ideal para vivienda unifamiliar o desarrollo de pocos patios. Escrituras libres de gravamen.";

const descLocal =
  "Local comercial con localización de alto tránsito, fachada con visibility amplia y antepuerta para ventanales de exhibición.\n\n" +
  "Incluye baño de cortesía, área de bodega, instalaciones eléctricas reforzadas y estacionamiento de visita. Listo para operar.";

const L = (m: Muestra): Omit<ListingDoc, "_id" | "owner" | "estado" | "creado" | "actualizado" | "publicadoEn"> & {
  slug: string;
} => ({
  slug: slugify(m.titulo),
  titulo: m.titulo,
  operacion: m.operacion,
  tipoPropiedad: m.tipo,
  precio: m.precio,
  moneda: "MXN",
  descripcion: m.descripcion,
  direccion: {
    calle: m.calle,
    colonia: m.colonia,
    ciudad: m.ciudad,
    estado: m.estado,
    cp: m.cp,
  },
  ...(m.coords ? { ubicacion: { type: "Point" as const, coords: m.coords } } : {}),
  caracteristicas: {
    recamaras: m.recamaras,
    banos: m.banos,
    cocheras: m.cocheras,
    construccionM2: m.construccionM2,
    terrenoM2: m.terrenoM2,
  },
  amenidades: m.amenidades,
  fotos: m.fotos.map((f): ListingFoto => ({ ...f })),
});

const MUESTRAS: Muestra[] = [
  {
    titulo: "Casa Contemporánea en Lomas de Angelópolis",
    operacion: "venta",
    tipo: "casa",
    precio: 1250000,
    calle: "Paseo de los Libres 214",
    colonia: "Lomas de Angelópolis",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72480",
    recamaras: 4,
    banos: 5,
    cocheras: 2,
    construccionM2: 450,
    amenidades: ["alberca", "estacionamiento", "aire-acondicionado", "vigilancia"],
    fotos: [
      F(1, "Casa contemporánea iluminada con alberca"),
      F(5, "Terraza y alberca al atardecer"),
    ],
    descripcion: descCasa,
  },
  {
    titulo: "Departamento Panorámico en Angelópolis",
    operacion: "venta",
    tipo: "departamento",
    precio: 850000,
    calle: "Av. Nitro 420",
    colonia: "Angelópolis",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72490",
    recamaras: 2,
    banos: 2,
    construccionM2: 120,
    amenidades: ["estacionamiento", "gimnasio", "vigilancia", "terraza"],
    fotos: [
      F(2, "Departamento con vista panorámica a la ciudad"),
      F(6, "Fachada del edificio"),
    ],
    descripcion: descDepto,
  },
  {
    titulo: "Casa Minimalista en La Vista",
    operacion: "venta",
    tipo: "casa",
    precio: 420000,
    calle: "Calle Encino 88",
    colonia: "La Vista",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72450",
    recamaras: 3,
    banos: 2,
    construccionM2: 210,
    amenidades: ["estacionamiento", "chimenea"],
    fotos: [F(3, "Cocina minimalista de una casa")],
    descripcion: descCasa,
  },
  {
    titulo: "Terreno Baldío en Cholula",
    operacion: "venta",
    tipo: "terreno",
    precio: 180000,
    calle: "Camino Real a San Pedro 17",
    colonia: "San Pedro Cholula",
    ciudad: "San Pedro Cholula",
    estado: "Puebla",
    cp: "72760",
    terrenoM2: 600,
    amenidades: [],
    fotos: [F(4, "Terreno baldío con acceso a camino")],
    descripcion: descTerreno,
  },
  {
    titulo: "Casa con Vista al Club",
    operacion: "venta",
    tipo: "casa",
    precio: 2100000,
    calle: "Calle Fairway 9",
    colonia: "Club de Golf",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72499",
    recamaras: 5,
    banos: 5,
    cocheras: 3,
    construccionM2: 850,
    amenidades: ["alberca", "cava", "vigilancia", "casa-inteligente"],
    fotos: [
      F(5, "Casa con terraza y alberca al atardecer"),
      F(1, "Fachada principal"),
    ],
    descripcion: descCasa,
  },
  {
    titulo: "Departamento Boutique en el Centro",
    operacion: "renta",
    tipo: "departamento",
    precio: 350000,
    calle: "3 Sur 105",
    colonia: "Centro Histórico",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72000",
    recamaras: 1,
    construccionM2: 85,
    amenidades: ["vigilancia"],
    fotos: [F(6, "Fachada de departamento boutique de concreto y madera")],
    descripcion: descDepto,
  },
  {
    titulo: "Casa Familiar en San Manuel",
    operacion: "venta",
    tipo: "casa",
    precio: 640000,
    calle: "Calle 5 de Mayo 33",
    colonia: "San Manuel",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72440",
    recamaras: 4,
    construccionM2: 320,
    amenidades: ["estacionamiento"],
    fotos: [F(1, "Casa de dos pisos con jardín")],
    descripcion: descCasa,
  },
  {
    titulo: "Departamento en Zavaleta",
    operacion: "venta",
    tipo: "departamento",
    precio: 295000,
    calle: "Calzada Zaragoza 240",
    colonia: "Zavaleta",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72410",
    recamaras: 2,
    construccionM2: 95,
    amenidades: ["estacionamiento"],
    fotos: [F(2, "Departamento luminoso con balcón")],
    descripcion: descDepto,
  },
  {
    titulo: "Casa de Campo en Atlixco",
    operacion: "venta",
    tipo: "casa",
    precio: 510000,
    calle: "Camino al Observatorio 5",
    colonia: "Centro",
    ciudad: "Atlixco",
    estado: "Puebla",
    cp: "74160",
    recamaras: 3,
    construccionM2: 260,
    terrenoM2: 1200,
    amenidades: ["alberca", "chimenea"],
    fotos: [F(3, "Interior de casa de campo")],
    descripcion: descCasa,
  },
  {
    titulo: "Terreno Baldío en Cuautlancingo",
    operacion: "venta",
    tipo: "terreno",
    precio: 97000,
    calle: "Camino a San Andrés 410",
    colonia: "San Martín Texmelucan",
    ciudad: "Cuautlancingo",
    estado: "Puebla",
    cp: "72470",
    terrenoM2: 400,
    amenidades: [],
    fotos: [F(4, "Terreno baldío plano con acceso a camino")],
    descripcion: descTerreno,
  },
  {
    titulo: "Departamento Penthouse en Angelópolis",
    operacion: "venta",
    tipo: "departamento",
    precio: 1780000,
    calle: "Av. San Román 1120",
    colonia: "Angelópolis",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72490",
    recamaras: 3,
    construccionM2: 280,
    amenidades: ["terraza", "alberca", "gimnasio", "aire-acondicionado"],
    fotos: [F(5, "Penthouse con terraza")],
    descripcion: descDepto,
  },
  {
    titulo: "Casa de Esquina en Mayorazgo",
    operacion: "venta",
    tipo: "casa",
    precio: 389000,
    calle: "Calle Esperanza 7",
    colonia: "Mayorazgo 1ra Sección",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72430",
    recamaras: 3,
    construccionM2: 180,
    amenidades: ["estacionamiento"],
    fotos: [F(6, "Casa en esquina con fachada blanca")],
    descripcion: descCasa,
  },
  {
    titulo: "Departamento Estudio en Cholula",
    operacion: "renta",
    tipo: "departamento",
    precio: 165000,
    calle: "14 Sur 304",
    colonia: "San Andrés Cholula",
    ciudad: "San Andrés Cholula",
    estado: "Puebla",
    cp: "72820",
    recamaras: 1,
    construccionM2: 48,
    amenidades: ["vigilancia"],
    fotos: [F(2, "Estudio pequeño amueblado")],
    descripcion: descDepto,
  },
];

/** Crea el propietario demo y las publicaciones si la colección está vacía. */
export async function seedListings(): Promise<boolean> {
  if (process.env.SEED_DEMO !== "true") return false;
  const { listings, users } = await getCollections();
  if ((await listings.estimatedDocumentCount()) > 0) return false;

  // Propietario de demo (solo existe en bases de datos vacías).
  let owner = (await users.findOne({ usernameNorm: "propietario.demo" })) as { _id: ObjectId } | null;
  if (!owner) {
    const claveDemo = randomBytes(18).toString("base64url");
    const ahora = new Date();
    const res = await users.insertOne({
      username: "PropietarioDemo",
      usernameNorm: "propietario.demo",
      emailHash: sha256("demo@oikestia.mx"),
      email_enc: encryptField("demo@oikestia.mx"),
      tel_enc: encryptField("2221234567"),
      password_enc: await hashPassword(claveDemo),
      rol: "owner",
      verificado: true,
      intereses: [],
      fullname_enc: encryptField("Propietario Demo"),
      creado: ahora,
      actualizado: ahora,
    });
    owner = { _id: res.insertedId };
    console.warn(`[oikestia] Cuenta demo creada: propietario.demo / ${claveDemo}`);
  }

  const ahora = Date.now();
  const docs = MUESTRAS.map((m, i) => {
    const base = L(m);
    const coords = COORDS[m.titulo];
    if (coords) base.ubicacion = { type: "Point", coords };
    const creado = new Date(ahora - (i + 1) * 86_400_000 * 3);
    return {
      ...base,
      owner: owner!._id,
      estado: "publicada",
      creado,
      actualizado: creado,
      publicadoEn: creado,
    };
  });

  await listings.insertMany(docs as unknown as ListingDoc[]);
  return true;
}

/** Slug de la ficha de detalle (Casa Lumina) para el seed de detalle completo. */
export const SLUG_CASA_LUMINA = "casa-lumina";

/** Coordenadas aproximadas [lng, lat] por título para el mapa del seed. */
const COORDS: Record<string, [number, number]> = {
  "Casa Contemporánea en Lomas de Angelópolis": [-98.2345, 19.0375],
  "Departamento Panorámico en Angelópolis": [-98.2325, 19.0425],
  "Casa Minimalista en La Vista": [-98.244, 19.033],
  "Terreno Baldío en Cholula": [-98.296, 19.057],
  "Casa con Vista al Club": [-98.25, 19.045],
  "Departamento Boutique en el Centro": [-98.2018, 19.0414],
  "Casa Familiar en San Manuel": [-98.2215, 19.03],
  "Departamento en Zavaleta": [-98.188, 19.055],
  "Casa de Campo en Atlixco": [-98.434, 18.909],
  "Terreno Baldío en Cuautlancingo": [-98.27, 19.056],
  "Departamento Penthouse en Angelópolis": [-98.233, 19.044],
  "Casa de Esquina en Mayorazgo": [-98.256, 19.018],
  "Departamento Estudio en Cholula": [-98.283, 19.048],
};
