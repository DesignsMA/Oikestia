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
  coords: [number, number];
  caracteristicas: ListingDoc["caracteristicas"];
  amenidades: string[];
  amenidadesLibres?: string[];
  reglas?: ListingDoc["reglas"];
  fotos: { url: string; alt: string }[];
  descripcion: string;
  calle: string;
};

const F = (n: number, alt: string): { url: string; alt: string } => ({
  url: `/images/property${n}.webp`,
  alt,
});

const descCasa =
  "Casa de arquitectura contemporánea con ventanales de piso a techo, iluminación natural durante todo el día y acabados de primera. La planta social conecta sala, comedor y cocina en un solo espacio abierto hacia el jardín trasero.\n\n" +
  "Cuenta con recámaras amplias con vestidor, baños con acabados de mármol, cochera techada y aire acondicionado central. La ubicación permite llegar en minutos a escuelas, parques y centros comerciales.";

const descDepto =
  "Departamento con vista panorámica, balcón orientado al poniente y acabados modernos. La cocina integral incluye isla de desayuno y la sala aprovecha la altura libre para mayor sensación de amplitud.\n\n" +
  "El edificio ofrece acceso controlado, vigilancia 24/7, gimnasio, área verde y estacionamiento techado. Muy cerca de Angelópolis, transporte público y servicios de la zona.";

const descTerreno =
  "Terreno plano con frente amplio sobre camino pavimentado y todos los servicios públicos disponibles (agua, luz y drenaje).\n\n" +
  "Zona en crecimiento con fácil acceso a la carretera principal, ideal para vivienda unifamiliar o desarrollo de pocos patios. Escrituras libres de gravamen.";

const descLocal =
  "Local comercial con localización de alto tránsito, fachada con visibilidad amplia y antepuerta para ventanales de exhibición.\n\n" +
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
  ubicacion: { type: "Point" as const, coords: m.coords },
  caracteristicas: m.caracteristicas,
  amenidades: m.amenidades,
  amenidadesLibres: m.amenidadesLibres ?? [],
  reglas: m.reglas,
  estadisticas: { visitas: 0, usuariosUnicos: 0, favoritos: 0, contactos: 0 },
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
    coords: [-98.2345, 19.0375],
    caracteristicas: { terrenoM2: 520, construccionM2: 450, recamaras: 4, banos: 4, cajones: 2, pisos: 2, espaciosAdicionales: ["Jardín", "Cochera techada"] },
    amenidades: ["alberca", "estacionamiento", "aire-acondicionado", "vigilancia"],
    amenidadesLibres: ["Paneles solares", "Cisterna", "Cuarto de servicio"],
    fotos: [
      F(1, "Casa contemporánea iluminada con alberca"),
      F(2, "Sala principal de la casa"),
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
    coords: [-98.2325, 19.0425],
    caracteristicas: { interioresM2: 120, recamaras: 2, banos: 2, cajones: 1, piso: 8, espaciosAdicionales: ["Balcón"] },
    amenidades: ["estacionamiento", "gimnasio", "vigilancia", "terraza"],
    amenidadesLibres: ["Elevador", "Área de coworking"],
    fotos: [
      F(2, "Departamento con vista panorámica a la ciudad"),
      F(6, "Fachada del edificio"),
      F(3, "Cocina integral del departamento"),
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
    coords: [-98.244, 19.033],
    caracteristicas: { terrenoM2: 250, construccionM2: 210, recamaras: 3, banos: 2, cajones: 2, pisos: 2 },
    amenidades: ["estacionamiento", "chimenea"],
    fotos: [
      F(3, "Cocina minimalista de la casa"),
      F(1, "Fachada principal de la casa minimalista"),
      F(4, "Jardín lateral de la casa"),
    ],
    descripcion: descCasa,
  },
  {
    titulo: "Local Comercial en Zavaleta",
    operacion: "renta",
    tipo: "local-comercial",
    precio: 32000,
    calle: "Calzada Zaragoza 240",
    colonia: "Zavaleta",
    ciudad: "Puebla",
    estado: "Puebla",
    cp: "72410",
    coords: [-98.188, 19.055],
    caracteristicas: { metrosM2: 110, banos: 1, cajones: 2, pisos: 1, extras: ["Bodega", "Antepuerta"] },
    amenidades: ["estacionamiento", "vigilancia", "aire-acondicionado"],
    amenidadesLibres: ["Instalación eléctrica trifásica", "Vitrina de exhibición"],
    reglas: {
      amueblado: false,
      aceptaMascotas: false,
      fumaPermitido: false,
      depositoMeses: 2,
      incluyeServicios: ["agua", "mantenimiento"],
      requisitosOcupantes: ["situacion-laboral"],
      notas: "Contrato mínimo de 12 meses. Se solicita comprobante de situación laboral.",
    },
    fotos: [
      F(4, "Fachada del local comercial"),
      F(6, "Interior del local comercial"),
      F(5, "Vista exterior del local al atardecer"),
    ],
    descripcion: descLocal,
  },
  {
    titulo: "Terreno en San Pedro Cholula",
    operacion: "venta",
    tipo: "terreno",
    precio: 180000,
    calle: "Camino Real a San Pedro 17",
    colonia: "San Pedro Cholula",
    ciudad: "San Pedro Cholula",
    estado: "Puebla",
    cp: "72760",
    coords: [-98.296, 19.057],
    caracteristicas: { terrenoM2: 600 },
    amenidades: [],
    fotos: [
      F(5, "Terreno con acceso a camino"),
      F(1, "Vista general del terreno"),
      F(2, "Linderos del terreno"),
    ],
    descripcion: descTerreno,
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
      nombre_enc: encryptField("Propietario Demo"),
      fullname_enc: encryptField("Propietario Demo"),
      compartir: { correo: true, telefono: false, redes: false },
      creado: ahora,
      actualizado: ahora,
    });
    owner = { _id: res.insertedId };
    console.warn(`[oikestia] Cuenta demo creada: propietario.demo / ${claveDemo}`);
  }

  const ahora = Date.now();
  const docs = MUESTRAS.map((m, i) => {
    const base = L(m);
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
