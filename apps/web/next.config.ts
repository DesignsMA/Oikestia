import type { NextConfig } from "next";

const esProd = process.env.NODE_ENV === "production";

/**
 * CSP de la app web: sin scripts ni estilos de origen externo;
 * 'unsafe-inline' es necesario porque Next inyecta scripts inline sin
 * nonces. Los mapas de OpenStreetMap (tiles e iframe) son los únicos
 * recursos externos permitidos. Solo se envía en producción para no
 * interferir con el HMR de desarrollo.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'self' https://www.openstreetmap.org",
  "media-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // El mapa de /buscar pide geolocalización al navegador; el resto, no.
      {
        key: "Permissions-Policy",
        value: "accelerometer=(), camera=(), geolocation=(self), gyroscope=(), microphone=(), payment=()",
      },
      // Solo tiene efecto sobre HTTPS; en HTTP el navegador lo ignora.
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "X-XSS-Protection", value: "0" },
    ];
    if (esProd) headers.push({ key: "Content-Security-Policy", value: CSP });
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
