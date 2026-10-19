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

/** Publicación de propiedad. Precios siempre en MXN. */
export const listingSchema = z.object({
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
  recamaras: z.coerce.number().int().min(0).max(50).optional(),
  banos: z.coerce.number().int().min(0).max(50).optional(),
  cocheras: z.coerce.number().int().min(0).max(50).optional(),
  construccionM2: z.coerce.number().positive().max(1_000_000).optional(),
  terrenoM2: z.coerce.number().positive().max(1_000_000).optional(),
  amenidades: z
    .array(z.enum(Object.keys(AMENIDADES) as [AmenityKey, ...AmenityKey[]]))
    .max(20, "Demasiadas amenidades")
    .default([]),
});

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
export type NuevoMensajeInput = z.infer<typeof nuevoMensajeSchema>;
export type VisitaInput = z.infer<typeof visitaSchema>;
export type CuentaInput = z.infer<typeof cuentaSchema>;
export type CompartirInput = z.infer<typeof compartirSchema>;
export type PerfilContactoInput = z.infer<typeof perfilContactoSchema>;
