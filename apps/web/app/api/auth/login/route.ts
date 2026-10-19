import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCollections, ensureIndexes } from "@/lib/db";
import { sha256, verifyPassword } from "@/lib/crypto";
import { loginSchema } from "@/lib/validators";
import { createSession } from "@/lib/auth";
import { consumir, reiniciar, QUINCE_MIN } from "@/lib/rate-limit";
import { ipDe } from "@/lib/guardas";

/**
 * Límite de intentos persistente en Mongo: 5 intentos / 15 min
 * por IP y 10 / 15 min por identificador de cuenta. En un login
 * exitoso se vacían ambos contadores.
 */
const MAX_POR_IP = 5;
const MAX_POR_CUENTA = 10;

/** Inicio de sesión con correo o usuario. */
export async function POST(req: NextRequest) {
  const ip = ipDe(req);
  const claveIp = `login:ip:${ip}`;
  const porIp = await consumir(claveIp, MAX_POR_IP, QUINCE_MIN);
  if (!porIp.permitido) {
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
  const claveCuenta = `login:cuenta:${identificador.toLowerCase()}`;
  const porCuenta = await consumir(claveCuenta, MAX_POR_CUENTA, QUINCE_MIN);
  if (!porCuenta.permitido) {
    return NextResponse.redirect(new URL("/login?error=429", req.url), 303);
  }

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
    await Promise.all([reiniciar(claveIp), reiniciar(claveCuenta)]);

    if (user.rol === "user" && (!user.intereses || user.intereses.length < 3)) {
      return NextResponse.redirect(new URL("/registro/intereses", req.url), 303);
    }
    return NextResponse.redirect(new URL("/", req.url), 303);
  } catch (e) {
    console.error("login", e);
    return NextResponse.redirect(new URL("/login?error=500", req.url), 303);
  }
}
