"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  nombre: string;
  rol: string;
  avatarUrl: string;
};

export default function MenuCuenta({ nombre, rol, avatarUrl }: Props) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  useEffect(() => {
    if (!abierto) return;

    const alClicFuera = (evento: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alPulsarTecla);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alPulsarTecla);
    };
  }, [abierto]);

  const esOwner = rol === "owner";

  return (
    <div className="header-cuenta" ref={contenedor}>
      <button
        type="button"
        className="header-avatar-btn"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Menú de ${nombre}`}
        onClick={() => setAbierto((v) => !v)}
      >
        <img src={avatarUrl} alt="" width={40} height={40} />
      </button>

      {abierto && (
        <div className="menu-cuenta" role="menu">
          <div className="menu-cuenta-head">
            <strong>{nombre}</strong>
            <span>{esOwner ? "Propietario" : "Usuario"}</span>
          </div>
          <Link href="/cuenta" role="menuitem">Mi cuenta</Link>
          <Link href="/mensajes" role="menuitem">Mensajes</Link>
          {esOwner && (
            <Link href="/propietario" role="menuitem">Mis publicaciones</Link>
          )}
          {esOwner && (
            <a href="/api/dashboard" role="menuitem">Estadísticas</a>
          )}
          <hr className="menu-cuenta-sep" />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="menu-cuenta-salir" role="menuitem">
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
