import type { NextRequest } from "next/server";

/** IP del cliente (detrás del proxy usa X-Forwarded-For). */
export function ipDe(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

/**
 * Origen de peticiones mutantes (CSRF básico): los navegadores
 * envían Sec-Fetch-Site y Origin; se rechazan las cross-site. Sin esos
 * headers (curl, herramientas) se permite.
 */
export function origenOk(req: NextRequest): boolean {
  const sitio = req.headers.get("sec-fetch-site");
  if (sitio) return sitio === "same-origin" || sitio === "same-site" || sitio === "none";
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("host") ?? "";
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Rechaza cuerpos por encima de maxBytes si el cliente declara Content-Length. */
export function cuerpoEnLimites(req: NextRequest, maxBytes: number): boolean {
  const cl = req.headers.get("content-length");
  if (!cl) return true;
  const n = Number(cl);
  return Number.isFinite(n) && n > 0 && n <= maxBytes;
}
