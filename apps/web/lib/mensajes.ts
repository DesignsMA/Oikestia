import { ObjectId, type Document } from "mongodb";
import { getCollections, ensureIndexes } from "./db";
import { getSessionUser } from "./auth";
import { decryptField } from "./crypto";

/**
 * Mensajes por lead: cada lead de contacto/visita tiene un hilo
 * con dos participantes — el propietario de la publicación y el interesado
 * (solo si inició sesión; los leads anónimos quedan solo para el dueño).
 * El acceso se valida siempre contra el documento, nunca contra el cliente.
 */

export type HiloUI = {
  id: string;
  listingSlug: string;
  listingTitulo: string;
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

type Acceso =
  | { ok: true; sesion: { id: string; username: string; rol: string }; lead: Lead; soyOwner: boolean }
  | { ok: false; status: 401 | 403 | 404 };

/** Nombre visible del propietario (PII cifrada con fallback a usuario). */
async function nombreOwner(ownerId: ObjectId): Promise<string> {
  try {
    const { users } = await getCollections();
    const u = (await users.findOne({ _id: ownerId })) as
      | { fullname_enc?: string; username: string }
      | null;
    if (!u) return "Propietario";
    if (u.fullname_enc) {
      try {
        return decryptField(u.fullname_enc);
      } catch {
        /* clave rotada */
      }
    }
    return u.username;
  } catch {
    return "Propietario";
  }
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
  const pubs = await listings
    .find({ _id: { $in: docs.map((d) => d.listingId) } }, { projection: { owner: 1 } })
    .toArray();
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

  const pub = await getCollections().then(({ listings }) =>
    listings.findOne({ _id: acceso.lead.listingId }, { projection: { owner: 1 } })
  );
  const contraparte = acceso.soyOwner
    ? acceso.lead.fullname || "Interesado"
    : pub
      ? await nombreOwner(pub.owner)
      : "Propietario";

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
