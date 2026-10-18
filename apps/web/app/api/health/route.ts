import { NextResponse } from "next/server";

/** Healthcheck para Docker/Railway. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "oikestia-web" });
}
