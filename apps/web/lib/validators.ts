import { z } from "zod";

/** Fuente única de validación: se usa igual en cliente y servidor. */

export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(128, "La contraseña es demasiado larga");

export const usernameSchema = z
  .string()
  .min(3, "Mínimo 3 caracteres")
  .max(30, "Máximo 30 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo, sin espacios");

export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9\s()\-]{8,20}$/, "Teléfono inválido")
  .optional()
  .or(z.literal(""));

export const userRegistrationSchema = z
  .object({
    username: usernameSchema,
    email: z.string().email("Correo inválido").max(254),
    tel: phoneSchema,
    password: passwordSchema,
    "confirm-password": z.string(),
  })
  .refine((d) => d.password === d["confirm-password"], {
    message: "Las contraseñas no coinciden",
    path: ["confirm-password"],
  });

export const ownerRegistrationSchema = z
  .object({
    fullname: z.string().min(5, "Escribe tu nombre completo como aparece en tu INE").max(120),
    username: usernameSchema,
    email: z.string().email("Correo inválido").max(254),
    tel: z
      .string()
      .regex(/^\+?[0-9\s()\-]{8,20}$/, "Teléfono inválido")
      .refine((v) => v.length >= 8, "El teléfono es obligatorio para propietarios"),
    password: passwordSchema,
    "confirm-password": z.string(),
  })
  .refine((d) => d.password === d["confirm-password"], {
    message: "Las contraseñas no coinciden",
    path: ["confirm-password"],
  });

export const loginSchema = z.object({
  email: z.string().min(1, "Escribe tu correo o usuario").max(254),
  password: z.string().min(1, "Escribe tu contraseña").max(128),
});

/** Selección de intereses tras el registro: mínimo 3. */
export const interesesSchema = z.object({
  intereses: z.array(z.string().max(64)).min(3, "Elige al menos 3 intereses").max(30),
});

/** Catálogo cerrado de amenidades (clave → icono en IconSprite). */
export const AMENIDADES = {
  alberca: "i-pool",
  estacionamiento: "i-garage",
  "aire-acondicionado": "i-air",
  chimenea: "i-flame",
  cava: "i-wine",
  "casa-inteligente": "i-smart-home",
  vigilancia: "i-shield",
  gimnasio: "i-gym",
  terraza: "i-terrace",
} as const;

export type AmenityKey = keyof typeof AMENIDADES;

/** Etiquetas en español de cada amenidad. */
export const AMENIDADES_ETIQUETAS: Record<AmenityKey, string> = {
  alberca: "Alberca",
  estacionamiento: "Estacionamiento",
  "aire-acondicionado": "Aire acondicionado",
  chimenea: "Chimeneas",
  cava: "Cava climatizada",
  "casa-inteligente": "Casa inteligente",
  vigilancia: "Acceso controlado y vigilancia",
  gimnasio: "Gimnasio",
  terraza: "Terraza",
};

export const OPERACIONES = ["venta", "renta"] as const;
export const TIPOS_PROPIEDAD = ["casa", "departamento", "terreno", "local-comercial"] as const;

/**
 * Características que aplican a cada tipo de propiedad. El asistente y la
 * ficha usan este mapa para mostrar solo los campos pertinentes.
 * - terreno: únicamente metros de terreno.
 * - departamento: metros interiores, recámaras, baños, cajones, nivel y
 *   espacios adicionales (balcón, patio, bodega...).
 * - casa: terreno, construcción e interiores, recámaras, baños, cajones,
 *   espacios adicionales y número de pisos.
 * - local-comercial: metros, baños, cajones, pisos y extras (bodega...).
 */
export const CARACTERISTICAS_POR_TIPO = {
  terreno: ["terrenoM2"],
  departamento: ["interioresM2", "recamaras", "banos", "cajones", "piso", "espaciosAdicionales"],
  casa: ["terrenoM2", "construccionM2", "interioresM2", "recamaras", "banos", "cajones", "espaciosAdicionales", "pisos"],
  "local-comercial": ["metrosM2", "banos", "cajones", "pisos", "extras"],
} as const satisfies Record<(typeof TIPOS_PROPIEDAD)[number], readonly string[]>;

/** Etiquetas de los campos numéricos y de lista de características. */
export const CAMPOS_CARACTERISTICA_ETIQUETAS = {
  terrenoM2: "m² de terreno",
  construccionM2: "m² de construcción",
  interioresM2: "m² interiores",
  metrosM2: "m² del local",
  recamaras: "Recámaras",
  banos: "Baños",
  cajones: "Cajones de estacionamiento",
  pisos: "Número de pisos",
  piso: "Nivel / piso",
} as const;

export type CampoCaracteristica = keyof typeof CAMPOS_CARACTERISTICA_ETIQUETAS;

/** Condiciones de renta / reglas de la propiedad. */
export const PERFILES_OCUPANTES = ["solo-mujeres", "solo-hombres", "estudiantes", "situacion-laboral"] as const;
export type PerfilOcupante = (typeof PERFILES_OCUPANTES)[number];

export const PERFILES_OCUPANTES_ETIQUETAS: Record<PerfilOcupante, string> = {
  "solo-mujeres": "Solo mujeres",
  "solo-hombres": "Solo hombres",
  estudiantes: "Estudiantes",
  "situacion-laboral": "Comprobante de situación laboral",
};

/** Características numéricas comunes a varios tipos. */
const numCaracteristica = z.coerce.number().min(0).max(1_000_000).optional();
const listaCaracteristica = z
  .array(z.string().trim().min(1).max(60))
  .max(15, "Demasiados elementos")
  .default([]);

/** Reglas y condiciones (sobre todo para renta). */
export const reglasSchema = z.object({
  amueblado: z.boolean().default(false),
  aceptaMascotas: z.boolean().default(false),
  fumaPermitido: z.boolean().default(false),
  depositoMeses: z.coerce.number().int().min(0).max(12).optional(),
  incluyeServicios: z
    .array(z.enum(["agua", "luz", "gas", "internet", "mantenimiento"]))
    .max(6)
    .default([]),
  requisitosOcupantes: z
    .array(z.enum(PERFILES_OCUPANTES))
    .max(4, "Demasiados requisitos")
    .default([]),
  notas: z.string().trim().max(600, "Las condiciones son demasiado largas").optional(),
});

/** Publicación de propiedad. Precios siempre en MXN. */
export const listingSchema = z
  .object({
    titulo: z.string().min(8, "Escribe un título de al menos 8 caracteres").max(120),
    operacion: z.enum(OPERACIONES, { message: "Elige operación: venta o renta" }),
    tipoPropiedad: z.enum(TIPOS_PROPIEDAD, { message: "Elige el tipo de propiedad" }),
    precio: z.coerce
      .number({ message: "Escribe un precio válido" })
      .positive("El precio debe ser mayor a 0")
      .max(999_999_999, "El precio es demasiado alto"),
    descripcion: z
      .string()
      .min(50, "Describe la propiedad con al menos 50 caracteres")
      .max(4000, "La descripción es demasiado larga"),
    calle: z.string().min(3, "Escribe la calle y número").max(120),
    colonia: z.string().min(2, "Escribe la colonia").max(80),
    ciudad: z.string().min(2, "Escribe la ciudad").max(80),
    estado: z.string().min(2, "Escribe el estado").max(60),
    cp: z.string().regex(/^\d{5}$/, "El código postal son 5 dígitos"),
    // Características por tipo (todas opcionales; se validan según el tipo).
    terrenoM2: numCaracteristica,
    construccionM2: numCaracteristica,
    interioresM2: numCaracteristica,
    metrosM2: numCaracteristica,
    recamaras: z.coerce.number().int().min(0).max(50).optional(),
    banos: z.coerce.number().int().min(0).max(50).optional(),
    cajones: z.coerce.number().int().min(0).max(50).optional(),
    pisos: z.coerce.number().int().min(0).max(100).optional(),
    piso: z.coerce.number().int().min(0).max(200).optional(),
    espaciosAdicionales: listaCaracteristica,
    extras: listaCaracteristica,
    // Amenidades generales filtrables + amenidades libres (texto del propietario).
    amenidades: z
      .array(z.enum(Object.keys(AMENIDADES) as [AmenityKey, ...AmenityKey[]]))
      .max(20, "Demasiadas amenidades")
      .default([]),
    amenidadesLibres: z
      .array(z.string().trim().min(2, "Amenidad demasiado corta").max(60, "Amenidad demasiado larga"))
      .max(30, "Demasiadas amenidades")
      .default([]),
  })
  .superRefine((d, ctx) => {
    const permitidas = new Set<string>(CARACTERISTICAS_POR_TIPO[d.tipoPropiedad]);
    const valores: Record<string, number | undefined> = {
      terrenoM2: d.terrenoM2,
      construccionM2: d.construccionM2,
      interioresM2: d.interioresM2,
      metrosM2: d.metrosM2,
      recamaras: d.recamaras,
      banos: d.banos,
      cajones: d.cajones,
      pisos: d.pisos,
      piso: d.piso,
    };
    for (const [campo, valor] of Object.entries(valores)) {
      if (valor !== undefined && !permitidas.has(campo)) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: `La característica «${campo}» no aplica para ${d.tipoPropiedad}.`,
        });
      }
    }
  });

export type ReglasInput = z.infer<typeof reglasSchema>;

/** Primer mensaje al propietario desde la ficha de publicación. */
export const nuevoMensajeSchema = z.object({
  listing: z.string().min(1).max(140),
  message: z.string().min(10, "Escribe un mensaje de al menos 10 caracteres").max(2000),
});

/** Solicitud de visita dentro de una conversación. */
export const visitaSchema = z.object({
  lead: z.string().min(1, "Conversación inválida").max(64),
  fecha: z.string().min(4, "Indica una fecha").max(80),
});

/** Documento de verificación de identidad (solo metadatos; el archivo va a GridFS). */
export const verificacionSchema = z.object({
  fullname: z
    .string()
    .normalize("NFKC")
    .trim()
    .min(5, "Escribe tu nombre completo como aparece en tu INE")
    .max(120, "El nombre es demasiado largo"),
  tipoDocumento: z.enum(["ine", "pasaporte", "cedula"], { message: "Elige el tipo de documento" }),
});

/** Respuesta dentro de un hilo de mensajes. */
export const mensajeSchema = z.object({
  lead: z.string().min(1, "Conversación inválida").max(64),
  texto: z.string().min(1, "Escribe un mensaje").max(2000, "El mensaje es demasiado largo"),
});

/** Nombre visible de la cuenta; vacío significa usar el usuario. */
export const cuentaSchema = z.object({
  nombre: z
    .string()
    .normalize("NFKC")
    .trim()
    .max(60, "Máximo 60 caracteres")
    .refine((v) => !/[\u0000-\u001f\u007f]/.test(v), "El nombre contiene caracteres inválidos"),
});

/** Preferencias de datos que el usuario comparte al contactar. */
export const compartirSchema = z.object({
  correo: z.boolean(),
  telefono: z.boolean(),
  redes: z.boolean(),
});

/** URL de red social opcional (vacío permitido). */
const redOpcional = z
  .string()
  .trim()
  .max(200, "La URL es demasiado larga")
  .url("Escribe un enlace válido (https://…)")
  .optional()
  .or(z.literal(""));

/** Teléfono y redes sociales del perfil (editables). */
export const perfilContactoSchema = z.object({
  tel: phoneSchema,
  instagram: redOpcional,
  facebook: redOpcional,
  x: redOpcional,
});

export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type OwnerRegistration = z.infer<typeof ownerRegistrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ListingInput = z.infer<typeof listingSchema>;
export type CaracteristicasInput = Pick<
  ListingInput,
  "terrenoM2" | "construccionM2" | "interioresM2" | "metrosM2" | "recamaras" | "banos" | "cajones" | "pisos" | "piso" | "espaciosAdicionales" | "extras"
>;
export type NuevoMensajeInput = z.infer<typeof nuevoMensajeSchema>;
export type VisitaInput = z.infer<typeof visitaSchema>;
export type CuentaInput = z.infer<typeof cuentaSchema>;
export type CompartirInput = z.infer<typeof compartirSchema>;
export type PerfilContactoInput = z.infer<typeof perfilContactoSchema>;
