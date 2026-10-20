import type { MetadataRoute } from "next";

const BASE = (process.env.APP_PUBLIC_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** robots.txt: permite el sitio público y bloquea áreas privadas/API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/cuenta",
        "/mensajes",
        "/propietario",
        "/login",
        "/registro",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
