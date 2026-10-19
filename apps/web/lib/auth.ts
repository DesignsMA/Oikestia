import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getCollections } from "./db";
import { randomToken, sha256, decryptField } from "./crypto";

/** Sesiones: cookie httpOnly con token opaco; en Mongo solo vive su hash (TTL 30 d). */

export const SESSION_COOKIE = "oikestia_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  rol: "user" | "owner";
  verificado: boolean;
  intereses: string[];
  /** Nombre visible (cifrado en reposo); null si no se ha definido. */
  nombre: string | null;
  /** Archivo de avatar en GridFS; null si usa el placeholder. */
  avatarFileId: string | null;
};

type UserDoc = {
  _id: unknown;
  username: string;
  email_enc: string;
  rol: "user" | "owner";
  verificado: boolean;
  intereses?: string[];
  nombre_enc?: string;
  avatarFileId?: string;
};

/** Crea una sesión nueva y deja la cookie establecida (solo válido en route handlers). */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const tokenHash = sha256(token);
  const expira = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const { sessions } = await getCollections();
  await sessions.insertOne({
    tokenHash,
    userId: new ObjectId(userId),
    creado: new Date(),
    expira,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

/** Usuario de la sesión actual, o null si no hay sesión válida. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const tokenHash = sha256(token);
    const { sessions, users } = await getCollections();
    const session = await sessions.findOne({ tokenHash });
    if (!session) return null;
    if (new Date(session.expira) <= new Date()) return null;

    const user = (await users.findOne({ _id: session.userId })) as UserDoc | null;
    if (!user) return null;

    return {
      id: String(user._id),
      username: user.username,
      email: descifraSeguro(user.email_enc),
      rol: user.rol,
      verificado: user.verificado,
      intereses: user.intereses ?? [],
      nombre: descifraSeguro(user.nombre_enc) || null,
      avatarFileId: typeof user.avatarFileId === "string" ? user.avatarFileId : null,
    };
  } catch (e) {
    // Sin conexión a la base de datos (p. ej. durante el build) no hay sesión.
    console.error("getSessionUser", e);
    return null;
  }
}

/** Descifra tolerando registros antiguos sin PII cifrada. */
function descifraSeguro(valor: unknown): string {
  if (typeof valor !== "string" || !valor) return "";
  try {
    return decryptField(valor);
  } catch {
    return "";
  }
}

/** Revoca la sesión actual y elimina la cookie. */
export async function destroySession(): Promise<void> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) {
      const { sessions } = await getCollections();
      await sessions.deleteOne({ tokenHash: sha256(token) });
    }
    store.delete(SESSION_COOKIE);
  } catch {
    // Sin base de datos no hay nada que revocar.
  }
}
