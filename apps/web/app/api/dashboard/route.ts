import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Traspaso al dashboard: token HMAC-SHA256 de 5 min y redirige a Dash. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=sesion", req.url), 303);
  if (user.rol !== "owner") return NextResponse.redirect(new URL("/propietario", req.url), 303);

  const secret = process.env.DASH_HANDOFF_SECRET ?? "";
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "DASH_HANDOFF_SECRET sin configurar" },
      { status: 500 }
    );
  }

  const payload = JSON.stringify({
    sub: user.id,
    name: user.username,
    rol: "owner",
    exp: Math.floor(Date.now() / 1000) + 300,
  });
  const cuerpo = Buffer.from(payload, "utf8").toString("base64url");
  const firma = createHmac("sha256", secret).update(cuerpo).digest("base64url");
  const token = `${cuerpo}.${firma}`;

  const dash = (process.env.DASH_PUBLIC_URL ?? "http://localhost:8050").replace(/\/+$/, "");
  return NextResponse.redirect(`${dash}/?token=${encodeURIComponent(token)}`, 307);
}
