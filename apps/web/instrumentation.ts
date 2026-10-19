/** Valida la configuración al arrancar. Solo se exige con APP_ENV=production. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.APP_ENV !== "production") return;

  const errores: string[] = [];
  const min = (n: string) => (process.env[n] ?? "").length >= 32;

  for (const n of ["SESSION_SECRET", "DATA_ENCRYPTION_KEY", "DASH_HANDOFF_SECRET"]) {
    if (!min(n)) errores.push(`${n} vacío o con menos de 32 caracteres`);
  }
  const url = process.env.APP_PUBLIC_URL ?? "";
  if (!url.startsWith("https://")) {
    errores.push(`APP_PUBLIC_URL debe ser https:// (valor: ${url || "vacío"})`);
  }
  if (process.env.COOKIE_SECURE !== "true") {
    errores.push("COOKIE_SECURE debe ser true tras el proxy HTTPS");
  }
  if (process.env.DEV_AUTO_VERIFY === "true") {
    errores.push("DEV_AUTO_VERIFY=true solo está permitido en desarrollo");
  }
  if (!process.env.NOMINATIM_CONTACT_EMAIL) {
    errores.push("NOMINATIM_CONTACT_EMAIL es obligatorio (política de uso de Nominatim)");
  }

  if (errores.length > 0) {
    console.error(
      "[oikestia] Configuración de producción inválida; el servidor no arranca:\n" +
        errores.map((e) => `  - ${e}`).join("\n"),
    );
    process.exit(1);
  }
}
