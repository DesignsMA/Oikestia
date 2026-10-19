"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./IconSprite";

type Props = {
  slug: string;
  /** Estado inicial recibido del servidor (sesión iniciada). */
  inicial: boolean;
  /** Si no hay sesión, el botón lleva a login. */
  logueado: boolean;
  rutaLogin?: string;
};

/** Corazón de favoritos: alterna vía API y refresca para recalcular recomendaciones. */
export default function BotonFavorito({ slug, inicial, logueado, rutaLogin }: Props) {
  const router = useRouter();
  const [fav, setFav] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);

  async function alternar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!logueado) {
      router.push(rutaLogin ?? "/login");
      return;
    }
    if (ocupado) return;
    setOcupado(true);
    const siguiente = !fav;
    setFav(siguiente);
    try {
      const res = await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = (await res.json()) as { ok: boolean; favorito?: boolean };
      if (!res.ok || !data.ok) {
        setFav(!siguiente);
        return;
      }
      setFav(!!data.favorito);
      router.refresh();
    } catch {
      setFav(!siguiente);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      className={fav ? "card-fav card-fav-activo" : "card-fav"}
      aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
      aria-pressed={fav}
      onClick={alternar}
      disabled={ocupado}
    >
      <Icon name="i-heart" />
    </button>
  );
}
