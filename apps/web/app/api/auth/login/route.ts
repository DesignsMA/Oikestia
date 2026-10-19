import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCollections, ensureIndexes } from "@/lib/db";
import { sha256, verifyPassword } from "@/lib/crypto";
import { loginSchema } from "@/lib/validators";
import { createSession } from "@/lib/auth";
import { consumir, reiniciar, QUINCE_MIN } from "@/lib/rate-limit";
import { destino, ipDe } from "@/lib/guardas";

/** Límite de intentos: 5/15 min por IP, 10/15 min por cuenta; se vacía al acertar. */
const MAX_POR_IP = 5;
const MAX_POR_CUENTA = 10;

/** Inicio de sesión con correo o usuario. */
export async function POST(req: NextRequest) {
  const ip = ipDe(req);
  const claveIp = `login:ip:${ip}`;
  const porIp = await consumir(claveIp, MAX_POR_IP, QUINCE_MIN);
  if (!porIp.permitido) {
    return NextResponse.redirect(destino(req, "/login?error=429"), 303);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(destino(req, "/login?error=1"), 303);
  }

  const raw = {
    email: form.get("email")?.toString() ?? "",
    password: form.get("password")?.toString() ?? "",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.redirect(destino(req, "/login?error=1"), 303);
  }

  const identificador = parsed.data.email.normalize("NFKC").trim();
  const esCorreo = identificador.includes("@");
  const claveCuenta = `login:cuenta:${identificador.toLowerCase()}`;
  const porCuenta = await consumir(claveCuenta, MAX_POR_CUENTA, QUINCE_MIN);
  if (!porCuenta.permitido) {
    return NextResponse.redirect(destino(req, "/login?error=429"), 303);
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
      return NextResponse.redirect(destino(req, "/login?error=1"), 303);
    }

    const ok = await verifyPassword(user.password_enc as string, parsed.data.password);
    if (!ok) {
      return NextResponse.redirect(destino(req, "/login?error=1"), 303);
    }

    await createSession(String(user._id));
    await Promise.all([reiniciar(claveIp), reiniciar(claveCuenta)]);

    if (user.rol === "user" && (!user.intereses || user.intereses.length < 3)) {
      return NextResponse.redirect(destino(req, "/registro/intereses"), 303);
    }
    return NextResponse.redirect(destino(req, "/"), 303);
  } catch (e) {
    console.error("login", e);
    return NextResponse.redirect(destino(req, "/login?error=500"), 303);
  }
}
