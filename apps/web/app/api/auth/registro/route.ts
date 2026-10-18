import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCollections, ensureIndexes } from "@/lib/db";
import { encryptField, hashPassword, sha256 } from "@/lib/crypto";
import { userRegistrationSchema, ownerRegistrationSchema } from "@/lib/validators";
import { createSession } from "@/lib/auth";

const NORM = (v: string) => v.normalize("NFKC").trim();

/** Registro de usuario o propietario. Formularios: /registro, /propietario. */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const rol = form.get("rol") === "owner" ? "owner" : "user";
  const raw = {
    fullname: form.get("fullname")?.toString() ?? "",
    username: form.get("username")?.toString() ?? "",
    email: form.get("email")?.toString() ?? "",
    tel: form.get("tel")?.toString() ?? "",
    password: form.get("password")?.toString() ?? "",
    "confirm-password": form.get("confirm-password")?.toString() ?? "",
  };

  const schema = rol === "owner" ? ownerRegistrationSchema : userRegistrationSchema;
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const err = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: err.message, campo: err.path.join(".") },
      { status: 400 }
    );
  }

  const data = parsed.data as typeof raw & { fullname: string; tel: string };
  const username = NORM(data.username);
  const email = NORM(data.email).toLowerCase();
  const tel = NORM(data.tel ?? "");
  const usernameNorm = username.toLowerCase();
  const emailHash = sha256(email);

  try {
    await ensureIndexes();
    const { users } = await getCollections();

    const dup = await users.findOne({ $or: [{ usernameNorm }, { emailHash }] });
    if (dup) {
      const field = dup.usernameNorm === usernameNorm ? "usuario" : "correo";
      return NextResponse.json(
        { ok: false, error: `Ese ${field} ya está registrado` },
        { status: 409 }
      );
    }

    const now = new Date();
    const doc = {
      username,
      usernameNorm,
      emailHash,
      email_enc: encryptField(email),
      tel_enc: tel ? encryptField(tel) : "",
      password_enc: await hashPassword(data.password),
      rol,
      verificado: rol === "owner" && process.env.DEV_AUTO_VERIFY === "true",
      intereses: [] as string[],
      creado: now,
      actualizado: now,
      ...(rol === "owner" ? { fullname_enc: encryptField(NORM(data.fullname)) } : {}),
    };

    const result = await users.insertOne(doc);
    await createSession(String(result.insertedId));

    const destino = rol === "owner" ? "/propietario" : "/registro/intereses";
    return NextResponse.redirect(new URL(destino, req.url), 303);
  } catch (e) {
    console.error("registro", e);
    return NextResponse.json(
      { ok: false, error: "No se pudo crear la cuenta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
