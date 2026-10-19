import { NextResponse, type NextRequest } from "next/server";
import { origenOk } from "@/lib/guardas";

/** Guardas globales de /api: host permitido, método y origen (CSRF). */

const METODO_API = /^(GET|POST|HEAD)$/;

function hostPermitido(host: string): boolean {
  const nombre = host
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^\[|\]$/g, "");
  if (!nombre) return true;
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(nombre)) return true;
  const extra = new Set<string>();
  for (const fuente of [process.env.TRUSTED_HOSTS ?? "", process.env.APP_PUBLIC_URL ?? ""]) {
    for (const parte of fuente.split(",")) {
      const v = parte.trim().toLowerCase();
      if (!v) continue;
      try {
        extra.add(v.includes("://") ? new URL(v).hostname.replace(/^\[|\]$/g, "") : v.replace(/:\d+$/, "").replace(/^\[|\]$/g, ""));
      } catch {
        /* valor sin formato de URL: usarlo tal cual */
        extra.add(v.replace(/:\d+$/, ""));
      }
    }
  }
  return extra.has(nombre);
}

export function middleware(req: NextRequest) {
  if (!hostPermitido(req.headers.get("host") ?? "")) {
    return new NextResponse("Host no permitido", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!METODO_API.test(req.method)) {
    return new NextResponse("Método no permitido", {
      status: 405,
      headers: { "Content-Type": "text/plain; charset=utf-8", Allow: "GET, POST, HEAD" },
    });
  }

  if (req.method === "POST" && !origenOk(req)) {
    return NextResponse.json({ ok: false, error: "Origen no permitido" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
