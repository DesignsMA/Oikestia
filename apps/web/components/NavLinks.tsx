"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/IconSprite";

const ENLACES = [
  { href: "/", texto: "Inicio", exacto: true },
  { href: "/publicaciones", texto: "Publicaciones", exacto: false },
  { href: "/buscar", texto: "Buscar en mapa", exacto: false },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        className="header-menu-toggle"
        aria-expanded={abierto}
        aria-controls="nav-principal"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setAbierto((v) => !v)}
      >
        <Icon name="i-menu" />
      </button>
      <nav
        id="nav-principal"
        className={abierto ? "nav-links nav-links-abierto" : "nav-links"}
        aria-label="Principal"
      >
        {ENLACES.map((enlace) => {
          const activo = enlace.exacto
            ? pathname === enlace.href
            : pathname.startsWith(enlace.href);
          return (
            <Link
              key={enlace.href}
              href={enlace.href}
              className={activo ? "nav-link nav-link-activo" : "nav-link"}
              aria-current={activo ? "page" : undefined}
            >
              {enlace.texto}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
