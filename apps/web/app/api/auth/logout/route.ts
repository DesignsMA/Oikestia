import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth";
import { destino } from "@/lib/guardas";

/** Cierre de sesión: revoca el registro en Mongo y borra la cookie. */
export async function POST(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(destino(req, "/"), 303);
}
