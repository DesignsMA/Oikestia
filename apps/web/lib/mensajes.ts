import { ObjectId, type Document } from "mongodb";
import { getCollections, ensureIndexes } from "./db";
import { getSessionUser } from "./auth";
import { decryptField } from "./crypto";

/** Mensajes por lead: un hilo por contacto/visita; acceso validado contra el documento. */

export type HiloUI = {
  id: string;
  listingSlug: string;
  listingTitulo: string;
  /** Portada de la publicación vinculada (o null). */
  listingFoto: string | null;
  tipo: string;
  estado: string;
  contraparte: string;
  creado: string;
  ultimoTexto: string | null;
  ultimoCreado: string | null;
  /** true si el último mensaje del hilo es mío. */
  ultimoMio: boolean | null;
};

export type MensajeUI = {
  id: string;
  texto: string;
  creado: string;
  emisor: string;
  mio: boolean;
};

export type HiloAbierto = {
  lead: {
    id: string;
    listingSlug: string;
    listingTitulo: string;
    tipo: string;
    estado: string;
    contraparte: string;
  };
  mensajes: MensajeUI[];
  /** Contacto de la contraparte, solo si lo comparte (nunca el propio). */
  contacto: DatosCompartidos | null;
};

export type InteresadoUI = {
  leadId: string;
  listingSlug: string;
  listingTitulo: string;
  nombre: string;
  avatarUrl: string;
  tipo: "mensaje" | "visita";
  estado: "nuevo" | "contactado" | "descartado" | "respondido";
  fecha: string;
  ultimoTexto: string | null;
  userId: string | null;
};

type Lead = {
  _id: ObjectId;
  listingId: ObjectId;
  listingSlug: string;
  listingTitulo: string;
  fullname: string;
  email: string;
  message: string;
  tipo: string;
  userId: string | null;
  creado: Date;
  estado: string;
};

/** Contacto compartido de forma explícita dentro de la conversación. */
export type DatosCompartidos = {
  correo: string | null;
  telefono: string | null;
  redes: string[];
};

type Acceso =
  | { ok: true; sesion: { id: string; username: string; rol: string }; lead: Lead; soyOwner: boolean }
  | { ok: false; status: 401 | 403 | 404 };

/** Nombre visible del propietario (PII cifrada con fallback a usuario). */
async function nombreOwner(ownerId: ObjectId): Promise<string> {
  const u = await usuarioBasico(ownerId);
  return u.nombre;
}

type UsuarioBasico = { nombre: string; avatarUrl: string; contacto: DatosCompartidos };

/** Nombre, avatar y contacto compartido de un usuario, sin exponer PII no compartida. */
async function usuarioBasico(userId: ObjectId): Promise<UsuarioBasico> {
  const vacio: UsuarioBasico = {
    nombre: "Propietario",
    avatarUrl: "/images/user-placeholder.webp",
    contacto: { correo: null, telefono: null, redes: [] },
  };
  try {
    const { users } = await getCollections();
    const u = (await users.findOne({ _id: userId })) as
      | {
          username: string;
          fullname_enc?: string;
          nombre_enc?: string;
          email_enc?: string;
          tel_enc?: string;
          avatarFileId?: string;
          compartir?: { correo?: boolean; telefono?: boolean; redes?: boolean };
          redes?: string[];
        }
      | null;
    if (!u) return vacio;

    let nombre = u.username;
    for (const enc of [u.nombre_enc, u.fullname_enc]) {
      if (enc) {
        try {
          nombre = decryptField(enc);
          break;
        } catch {
          /* clave rotada: se prueba el siguiente o el usuario */
        }
      }
    }

    const pref = {
      correo: u.compartir?.correo ?? true,
      telefono: u.compartir?.telefono ?? false,
      redes: u.compartir?.redes ?? false,
    };
    const descifra = (enc?: string): string | null => {
      if (!enc) return null;
      try {
        return decryptField(enc);
      } catch {
        return null;
      }
    };
    return {
      nombre,
      avatarUrl: u.avatarFileId ? `/api/fotos/${u.avatarFileId}` : "/images/user-placeholder.webp",
      contacto: {
        correo: pref.correo ? descifra(u.email_enc) : null,
        telefono: pref.telefono ? descifra(u.tel_enc) : null,
        redes: pref.redes ? (u.redes ?? []) : [],
      },
    };
  } catch {
    return vacio;
  }
}

/** Solo el contacto compartido (para el hilo). */
async function contactoDelUsuario(userId: string | null): Promise<DatosCompartidos | null> {
  if (!userId || !ObjectId.isValid(userId)) return null;
  const u = await usuarioBasico(new ObjectId(userId));
  const { correo, telefono, redes } = u.contacto;
  if (!correo && !telefono && redes.length === 0) return null;
  return { correo, telefono, redes };
}

/** Valida sesión + participación en el lead. Base de GET y POST. */
async function accesoLead(leadHex: string): Promise<Acceso> {
  const sesion = await getSessionUser();
  if (!sesion) return { ok: false, status: 401 };
  if (!ObjectId.isValid(leadHex)) return { ok: false, status: 404 };

  await ensureIndexes();
  const { leads, listings } = await getCollections();
  const lead = (await leads.findOne({ _id: new ObjectId(leadHex) })) as Lead | null;
  if (!lead) return { ok: false, status: 404 };

  const listing = await listings.findOne({ _id: lead.listingId }, { projection: { owner: 1 } });
  if (!listing) return { ok: false, status: 404 };

  const soyOwner = String(listing.owner) === sesion.id;
  const soyInteresado = lead.userId === sesion.id;
  if (!soyOwner && !soyInteresado) return { ok: false, status: 403 };

  return { ok: true, sesion, lead, soyOwner };
}

/** Hilos de la sesión actual: recibidos (owner) o iniciados (user). */
export async function hilosDeSesion(): Promise<HiloUI[] | null> {
  const sesion = await getSessionUser();
  if (!sesion) return null;
  await ensureIndexes();
  const { leads, listings, messages } = await getCollections();

  // Un propietario ve tanto lo recibido en sus publicaciones como lo que
  // él mismo haya iniciado (puede contactar a otros propietarios).
  const esDueno = sesion.rol === "owner";
  let filtro: Document;
  if (esDueno) {
    const mios = await listings
      .find({ owner: new ObjectId(sesion.id) }, { projection: { _id: 1 } })
      .toArray();
    const ids = mios.map((m) => m._id);
    filtro = { $or: [{ userId: sesion.id }, { listingId: { $in: ids } }] };
  } else {
    filtro = { userId: sesion.id };
  }

  const docs = (await leads
    .find(filtro)
    .sort({ creado: -1 })
    .limit(50)
    .toArray()) as unknown as Lead[];
  if (!docs.length) return [];

  // Último mensaje por hilo en una sola agregación.
  const ultimos = await messages
    .aggregate([
      { $match: { leadId: { $in: docs.map((d) => d._id) } } },
      { $sort: { creado: -1 } },
      {
        $group: {
          _id: "$leadId",
          texto: { $first: "$texto" },
          creado: { $first: "$creado" },
          emisorId: { $first: "$emisorId" },
        },
      },
    ])
    .toArray();
  const porLead = new Map(ultimos.map((u) => [String(u._id), u]));

  // Nombres de propietarios sin N+1 (para el panel del interesado).
  const pubs = (await listings
    .find({ _id: { $in: docs.map((d) => d.listingId) } }, { projection: { owner: 1, fotos: 1 } })
    .toArray()) as unknown as { _id: unknown; owner: unknown; fotos?: { url: string }[] }[];
  const duenos = [...new Set(pubs.map((p) => String(p.owner)))];
  const nombres = new Map<string, string>();
  await Promise.all(
    duenos.map(async (id) => {
      nombres.set(id, await nombreOwner(new ObjectId(id)));
    })
  );

  return docs.map((lead) => {
    const u = porLead.get(String(lead._id));
    const pub = pubs.find((p) => String(p._id) === String(lead.listingId));
    const yoInicie = lead.userId === sesion.id;
    return {
      id: String(lead._id),
      listingSlug: lead.listingSlug,
      listingTitulo: lead.listingTitulo,
      listingFoto: pub?.fotos?.[0]?.url ?? null,
      tipo: lead.tipo,
      estado: lead.estado || "nuevo",
      contraparte:
        esDueno && !yoInicie
          ? lead.fullname || "Interesado"
          : (pub ? nombres.get(String(pub.owner)) : undefined) ?? "Propietario",
      creado: new Date(lead.creado).toISOString(),
      ultimoTexto: u ? String(u.texto) : null,
      ultimoCreado: u?.creado ? new Date(u.creado).toISOString() : null,
      ultimoMio: u ? String(u.emisorId ?? "") === sesion.id : null,
    };
  });
}

/** Hilo completo con mensajes (solo participantes). */
export async function abrirHilo(
  leadHex: string
): Promise<{ ok: true; hilo: HiloAbierto; soyOwner: boolean } | { ok: false; status: number }> {
  const acceso = await accesoLead(leadHex);
  if (!acceso.ok) return acceso;

  const { leads, messages } = await getCollections();
  const mensajes = await messages
    .find({ leadId: acceso.lead._id })
    .sort({ creado: 1 })
    .limit(300)
    .toArray();

  await messages.updateMany(
    {
      leadId: acceso.lead._id,
      leido: false,
      emisorId: { $ne: new ObjectId(acceso.sesion.id) },
    },
    { $set: { leido: true } }
  );

  const pub = await getCollections().then(({ listings }) =>
    listings.findOne({ _id: acceso.lead.listingId }, { projection: { owner: 1 } })
  );
  const contraparte = acceso.soyOwner
    ? acceso.lead.fullname || "Interesado"
    : pub
      ? await nombreOwner(pub.owner)
      : "Propietario";

  // El contacto mostrado es el de la contraparte; nunca el propio.
  const contacto = acceso.soyOwner
    ? await contactoDelUsuario(acceso.lead.userId)
    : pub
      ? await contactoDelUsuario(String(pub.owner))
      : null;

  return {
    ok: true,
    soyOwner: acceso.soyOwner,
    hilo: {
      lead: {
        id: String(acceso.lead._id),
        listingSlug: acceso.lead.listingSlug,
        listingTitulo: acceso.lead.listingTitulo,
        tipo: acceso.lead.tipo,
        estado: acceso.lead.estado || "nuevo",
        contraparte,
      },
      mensajes: mensajes.map((m) => ({
        id: String(m._id),
        texto: String(m.texto),
        creado: new Date(m.creado).toISOString(),
        emisor: String(m.emisorNombre ?? ""),
        mio: String(m.emisorId ?? "") === acceso.sesion.id,
      })),
      contacto,
    },
  };
}

/** Agrega un mensaje al hilo (solo participantes) y marca «respondido». */
export async function enviarMensaje(
  leadHex: string,
  texto: string
): Promise<{ ok: true; mensaje: MensajeUI } | { ok: false; status: number; error: string }> {
  const acceso = await accesoLead(leadHex);
  if (!acceso.ok) {
    return {
      ok: false,
      status: acceso.status,
      error:
        acceso.status === 401
          ? "Inicia sesión para responder"
          : acceso.status === 403
            ? "No es tu conversación"
            : "Conversación no encontrada",
    };
  }

  const { messages, leads } = await getCollections();
  const ahora = new Date();
  const doc = {
    leadId: acceso.lead._id,
    emisorId: new ObjectId(acceso.sesion.id),
    emisorNombre: acceso.sesion.username,
    texto,
    leido: false,
    creado: ahora,
  };
  const res = await messages.insertOne(doc as Document);

  if (acceso.soyOwner && (acceso.lead.estado || "nuevo") === "nuevo") {
    await leads.updateOne({ _id: acceso.lead._id }, { $set: { estado: "respondido" } });
  }

  return {
    ok: true,
    mensaje: {
      id: String(res.insertedId),
      texto,
      creado: ahora.toISOString(),
      emisor: acceso.sesion.username,
      mio: true,
    },
  };
}

/** Mensajes sin leer en los hilos de la sesión (recibidos y no abiertos). */
export async function noLeidos(): Promise<number> {  try {
    const sesion = await getSessionUser();
    if (!sesion) return 0;

    const { leads, listings, messages } = await getCollections();
    let filtro: Document;
    if (sesion.rol === "owner") {
      const mios = await listings
        .find({ owner: new ObjectId(sesion.id) }, { projection: { _id: 1 } })
        .toArray();
      filtro = { $or: [{ userId: sesion.id }, { listingId: { $in: mios.map((m) => m._id) } }] };
    } else {
      filtro = { userId: sesion.id };
    }

    const misLeads = await leads.find(filtro, { projection: { _id: 1 } }).limit(300).toArray();
    if (!misLeads.length) return 0;

    return await messages.countDocuments({
      leadId: { $in: misLeads.map((l) => l._id) },
      leido: false,
      emisorId: { $ne: new ObjectId(sesion.id) },
    });
  } catch {
    return 0;
  }
}

/** Publicación (existente) para el flujo de contacto por mensaje. */
export async function publicacionParaContacto(
  slug: string
): Promise<{ id: ObjectId; slug: string; titulo: string; ownerId: string; esMia: boolean } | null> {
  const sesion = await getSessionUser();
  const { listings } = await getCollections();
  const doc = await listings.findOne(
    { slug, estado: "publicada" },
    { projection: { titulo: 1, owner: 1 } }
  );
  if (!doc) return null;
  return {
    id: doc._id as ObjectId,
    slug,
    titulo: String(doc.titulo),
    ownerId: String(doc.owner),
    esMia: !!sesion && String(doc.owner) === sesion.id,
  };
}

/** Conversación existente de la sesión para una publicación, si la hay. */
export async function conversacionDePublicacion(slug: string): Promise<string | null> {
  const sesion = await getSessionUser();
  if (!sesion) return null;
  const { leads } = await getCollections();
  const doc = await leads.findOne(
    { listingSlug: slug, userId: sesion.id },
    { projection: { _id: 1 }, sort: { creado: -1 } }
  );
  return doc ? String(doc._id) : null;
}

/** Inicia un lead + primer mensaje desde la ficha. Crea la conversación al enviar. */
export async function iniciarConversacion(
  slug: string,
  texto: string
): Promise<{ ok: true; leadId: string } | { ok: false; status: number; error: string }> {
  const sesion = await getSessionUser();
  if (!sesion) return { ok: false, status: 401, error: "Inicia sesión para enviar el mensaje" };

  await ensureIndexes();
  const { listings, leads, messages } = await getCollections();

  const listing = await listings.findOne(
    { slug, estado: "publicada" },
    { projection: { _id: 1, titulo: 1, owner: 1 } }
  );
  if (!listing) return { ok: false, status: 404, error: "Publicación no encontrada" };
  if (String(listing.owner) === sesion.id) {
    return { ok: false, status: 403, error: "No puedes contactarte a ti mismo" };
  }

  // Reutiliza la conversación existente para esa publicación.
  const existente = await leads.findOne(
    { listingSlug: slug, userId: sesion.id },
    { projection: { _id: 1 }, sort: { creado: -1 } }
  );
  const ahora = new Date();

  if (existente) {
    await messages.insertOne({
      leadId: existente._id,
      emisorId: new ObjectId(sesion.id),
      emisorNombre: sesion.username,
      texto,
      leido: false,
      creado: ahora,
    } as Document);
    return { ok: true, leadId: String(existente._id) };
  }

  const res = await leads.insertOne({
    listingId: listing._id,
    listingSlug: slug,
    listingTitulo: String(listing.titulo),
    fullname: sesion.nombre || sesion.username,
    email: "",
    message: texto,
    tipo: "mensaje",
    userId: sesion.id,
    creado: ahora,
    estado: "nuevo",
  });

  await messages.insertOne({
    leadId: res.insertedId,
    emisorId: new ObjectId(sesion.id),
    emisorNombre: sesion.username,
    texto,
    leido: false,
    creado: ahora,
  } as Document);

  // Estadística: nuevo contacto iniciado sobre la publicación.
  await listings.updateOne({ _id: listing._id }, { $inc: { "estadisticas.contactos": 1 } });

  return { ok: true, leadId: String(res.insertedId) };
}

/** Solicitud de visita: mensaje con fecha propuesta; también cuenta como lead. */
export async function solicitarVisita(
  leadHex: string,
  fechaPropuesta: string
): Promise<{ ok: true; mensaje: MensajeUI } | { ok: false; status: number; error: string }> {
  const acceso = await accesoLead(leadHex);
  if (!acceso.ok) {
    return {
      ok: false,
      status: acceso.status,
      error: acceso.status === 403 ? "No es tu conversación" : "Conversación no encontrada",
    };
  }

  const { messages, leads } = await getCollections();
  const ahora = new Date();
  const texto = `Solicito una visita. Fecha propuesta: ${fechaPropuesta}`;
  const doc = {
    leadId: acceso.lead._id,
    emisorId: new ObjectId(acceso.sesion.id),
    emisorNombre: acceso.sesion.username,
    texto,
    leido: false,
    creado: ahora,
  };
  const res = await messages.insertOne(doc as Document);

  const cambios: Document = { tipo: "visita" };
  if ((acceso.lead.estado || "nuevo") === "nuevo") {
    cambios.estado = acceso.soyOwner ? "respondido" : "nuevo";
  }
  await leads.updateOne({ _id: acceso.lead._id }, { $set: cambios });

  return {
    ok: true,
    mensaje: {
      id: String(res.insertedId),
      texto,
      creado: ahora.toISOString(),
      emisor: acceso.sesion.username,
      mio: true,
    },
  };
}

/** Relación de la sesión con un lead (sin enumeración): dueño o interesado. */
export async function relacionConLead(leadHex: string): Promise<"owner" | "interesado" | null> {
  const acceso = await accesoLead(leadHex);
  if (!acceso.ok) return null;
  return acceso.soyOwner ? "owner" : "interesado";
}

/** Interesados que contactaron las publicaciones del propietario en sesión. */
export async function listarInteresados(): Promise<InteresadoUI[] | null> {
  const sesion = await getSessionUser();
  if (!sesion || sesion.rol !== "owner") return null;
  await ensureIndexes();
  const { leads, listings, messages } = await getCollections();

  const mios = await listings
    .find({ owner: new ObjectId(sesion.id) }, { projection: { _id: 1 } })
    .toArray();
  const misIds = mios.map((m) => m._id);
  if (!misIds.length) return [];

  const docs = (await leads
    .find({ listingId: { $in: misIds }, userId: { $ne: null } })
    .sort({ creado: -1 })
    .limit(200)
    .toArray()) as unknown as Lead[];
  if (!docs.length) return [];

  const ultimos = await messages
    .aggregate([
      { $match: { leadId: { $in: docs.map((d) => d._id) } } },
      { $sort: { creado: -1 } },
      { $group: { _id: "$leadId", texto: { $first: "$texto" } } },
    ])
    .toArray();
  const porLead = new Map(ultimos.map((u) => [String(u._id), String(u.texto)]));

  const usuarios = new Map<string, UsuarioBasico>();
  await Promise.all(
    [...new Set(docs.map((d) => d.userId as string))].map(async (id) => {
      usuarios.set(id, await usuarioBasico(new ObjectId(id)));
    })
  );

  return docs.map((lead) => {
    const u = lead.userId ? usuarios.get(lead.userId) : undefined;
    return {
      leadId: String(lead._id),
      listingSlug: lead.listingSlug,
      listingTitulo: lead.listingTitulo,
      nombre: u?.nombre ?? lead.fullname ?? "Interesado",
      avatarUrl: u?.avatarUrl ?? "/images/user-placeholder.webp",
      tipo: lead.tipo === "visita" ? "visita" : "mensaje",
      estado: (lead.estado as InteresadoUI["estado"]) || "nuevo",
      fecha: new Date(lead.creado).toISOString(),
      ultimoTexto: porLead.get(String(lead._id)) ?? null,
      userId: lead.userId,
    };
  });
}

/** Datos de perfil del interesado si existe lead con el propietario (sin enumeración). */
export async function perfilInteresado(
  userId: string
): Promise<{ nombre: string; avatarUrl: string; email: string; telefono: string | null } | null> {
  const sesion = await getSessionUser();
  if (!sesion || sesion.rol !== "owner" || !ObjectId.isValid(userId)) return null;
  await ensureIndexes();
  const { leads, listings, users } = await getCollections();

  const mios = await listings
    .find({ owner: new ObjectId(sesion.id) }, { projection: { _id: 1 } })
    .toArray();
  const existe = await leads.findOne({ listingId: { $in: mios.map((m) => m._id) }, userId });
  if (!existe) return null;

  const u = (await users.findOne({ _id: new ObjectId(userId) })) as
    | { username: string; nombre_enc?: string; email_enc?: string; tel_enc?: string; avatarFileId?: string; compartir?: { correo?: boolean; telefono?: boolean } }
    | null;
  if (!u) return null;

  const descifra = (enc?: string): string | null => {
    if (!enc) return null;
    try {
      return decryptField(enc);
    } catch {
      return null;
    }
  };
  let nombre = u.username;
  if (u.nombre_enc) nombre = descifra(u.nombre_enc) ?? nombre;

  return {
    nombre,
    avatarUrl: u.avatarFileId ? `/api/fotos/${u.avatarFileId}` : "/images/user-placeholder.webp",
    email: (u.compartir?.correo ?? true) ? (descifra(u.email_enc) ?? "") : "",
    telefono: (u.compartir?.telefono ?? false) ? descifra(u.tel_enc) : null,
  };
}
