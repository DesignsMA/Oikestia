import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCollections, ensureIndexes } from "@/lib/db";
import { sha256, verifyPassword } from "@/lib/crypto";
import { loginSchema } from "@/lib/validators";
import { createSession } from "@/lib/auth";

/**
 * Límite de intentos: en memoria por IP (5 intentos / 15 min).
 * Es suficiente en dev; en producción multi-instancia se sustituirá
 * por un almacén persistente en la Fase 8 (endurecimiento).
 */
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
type Intento = { n: number; ventana: number };
const intentos = new Map<string, Intento>();

function permite(ip: string): boolean {
  const ahora = Date.now();
  const it = intentos.get(ip);
  if (!it || ahora - it.ventana > VENTANA_MS) {
    intentos.set(ip, { n: 1, ventana: ahora });
    return true;
  }
  if (it.n >= MAX_INTENTOS) return false;
  it.n += 1;
  return true;
}

/** Inicio de sesión con correo o usuario. */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!permite(ip)) {
    return NextResponse.redirect(new URL("/login?error=429", req.url), 303);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
  }

  const raw = {
    email: form.get("email")?.toString() ?? "",
    password: form.get("password")?.toString() ?? "",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
  }

  const identificador = parsed.data.email.normalize("NFKC").trim();
  const esCorreo = identificador.includes("@");

  try {
    await ensureIndexes();
    const { users } = await getCollections();

    const user = await users.findOne(
      esCorreo
        ? { emailHash: sha256(identificador.toLowerCase()) }
        : { usernameNorm: identificador.toLowerCase() }
    );

    if (!user || !user.password_enc) {
      return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
    }

    const ok = await verifyPassword(user.password_enc as string, parsed.data.password);
    if (!ok) {
      return NextResponse.redirect(new URL("/login?error=1", req.url), 303);
    }

    await createSession(String(user._id));
    intentos.delete(ip);

    if (user.rol === "user" && (!user.intereses || user.intereses.length < 3)) {
      return NextResponse.redirect(new URL("/registro/intereses", req.url), 303);
    }
    return NextResponse.redirect(new URL("/", req.url), 303);
  } catch (e) {
    console.error("login", e);
    return NextResponse.redirect(new URL("/login?error=500", req.url), 303);
  }
}
