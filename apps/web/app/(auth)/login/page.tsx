import type { Metadata } from "next";
import "@/app/styles/login.css";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Inicia sesión en Oikestia para acceder a tu cuenta y disfrutar de todas las funcionalidades.",
};

const ERRORES: Record<string, string> = {
  "1": "Usuario o contraseña incorrectos.",
  "429": "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
  "500": "No se pudo iniciar sesión. Intenta más tarde.",
  sesion: "Tu sesión expiró. Inicia sesión de nuevo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const error = sp.error ? (ERRORES[sp.error] ?? "No se pudo iniciar sesión. Intenta de nuevo.") : null;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  return (
    <main>
      <section className="login-section">
      <div className="login-bg">
        <img src="/images/login-bg.webp" alt="Edificio moderno en blanco y naranja." className="login-bg-image" />
      </div>
      <form action="/api/auth/login" method="post">
        {/* Identidad de marca y credenciales */}
        <img src="/images/logo.svg" alt="Oikestia logo" />
        <h1>Oikestia</h1>
        <p className="login-title">Bienvenido de vuelta. Inicia sesión en tu cuenta.</p>
        {next && <input type="hidden" name="next" value={next} />}
        <fieldset className="login-fieldset">
          <label htmlFor="login-email">Email o usuario</label>
          <div className="login-email">
            <input type="text" id="login-email" name="email" placeholder="nombre@gmail.com" required autoComplete="username" />
          </div>

          <div className="login-forgot-password">
            <label htmlFor="login-password">Contraseña</label>
            <a href="/recuperar">¿Olvidaste la contraseña?</a>
          </div>
          <div className="login-password">
            <input type="password" id="login-password" name="password" required autoComplete="current-password" />
          </div>
        </fieldset>
        {error && (
          <p className="login-error" role="alert">
            {error}
          </p>
        )}
        <input type="submit" value="Iniciar sesión" className="login-submit" />
        <div className="login-signup">
          <label>¿Aún no tienes cuenta?</label>
          <a href="/registro">Crea una cuenta</a>
        </div>
      </form>
      </section>
    </main>
  );
}
