import Link from "next/link";
import "@/app/styles/header.css";
import { getSessionUser } from "@/lib/auth";
import { noLeidos } from "@/lib/mensajes";
import { Icon } from "@/components/IconSprite";
import HeaderShell from "@/components/HeaderShell";
import NavLinks from "@/components/NavLinks";
import MenuCuenta from "@/components/MenuCuenta";

export default async function Header() {
  const user = await getSessionUser();
  const pendientes = user ? await noLeidos() : 0;

  const avatarUrl = user?.avatarFileId
    ? `/api/fotos/${user.avatarFileId}`
    : "/images/user-placeholder.webp";
  const nombre = user ? user.nombre || user.username : "";
  const destinoPublicar = !user
    ? "/registro"
    : user.rol !== "owner"
      ? "/propietario"
      : "/propietario/publicar";

  return (
    <HeaderShell>
      <a className="header-skip" href="#contenido">Saltar al contenido</a>
      <div className="header-content">
        <Link className="header-logo" href="/">
          <img src="/images/logo.svg" alt="" width={34} height={34} />
          <span>Oikestia</span>
        </Link>

        <NavLinks />

        <div className="header-actions">
          {user ? (
            <>
              <Link className="header-btn header-btn-publicar header-publicar" href={destinoPublicar}>
                <Icon name="i-plus" />
                <span className="header-publicar-texto">Publicar propiedad</span>
              </Link>
              <Link
                href="/mensajes"
                className="header-icon-btn"
                aria-label={pendientes > 0 ? `Mensajes, ${pendientes} sin leer` : "Mensajes"}
              >
                <Icon name="i-message" />
                {pendientes > 0 && (
                  <span className="header-badge" aria-hidden="true">
                    {pendientes > 99 ? "99+" : pendientes}
                  </span>
                )}
              </Link>
              <MenuCuenta nombre={nombre} rol={user.rol} avatarUrl={avatarUrl} />
            </>
          ) : (
            <>
              <Link className="header-btn header-btn-secundario" href="/login">
                Iniciar sesión
              </Link>
              <Link className="header-btn header-btn-publicar" href="/registro">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </HeaderShell>
  );
}
