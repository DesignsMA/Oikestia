import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

/** Encabezado fijo con blur; según la sesión muestra acceso o cierre de sesión. */
export default async function Header() {
  const user = await getSessionUser();

  return (
    <header className="homepage-header">
      <div className="header-content">
        <div className="header-logo">
          <img src="/images/logo.svg" alt="Oikestia Logo" width={200} className="logo" />
          <h1>Oikestia</h1>
        </div>

        <nav className="nav-links">
          <Link className="nav-link" href="/">Inicio</Link>
          <Link className="nav-link" href="/publicaciones">Publicaciones</Link>
          <Link className="nav-link" href="/buscar">Buscar en mapa</Link>
        </nav>

        <div className="header-account">
          {user ? (
            <>
              <Link href="/mensajes" className="nav-link">Mensajes</Link>
              <span className="header-username">{user.username}</span>
              <form action="/api/auth/logout" method="post" className="header-logout">
                <button type="submit" className="publish-btn">Cerrar sesión</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link">Iniciar sesión</Link>
              <Link href="/registro" className="publish-btn">Crear cuenta</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
