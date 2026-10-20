"use client";

import { useState } from "react";
import { Icon } from "./IconSprite";

type Props = { slug: string; titulo: string; icono?: boolean };

/** Botón de compartir: usa Web Share API si existe y, en su defecto, copia el enlace. */
export default function BotonCompartir({ slug, titulo, icono = false }: Props) {
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  function registrar() {
    void fetch("/api/compartidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => undefined);
  }

  async function compartir() {
    if (ocupado) return;
    setOcupado(true);
    const url = `${window.location.origin}/publicaciones/${slug}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: titulo, url });
        registrar();
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        registrar();
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      // Cancelar el share no es un error.
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button
      type="button"
      className={icono ? "card-share card-share-icono" : "card-share"}
      aria-label="Compartir publicación"
      onClick={compartir}
      disabled={ocupado}
    >
      <Icon name={copiado ? "i-link" : "i-share"} />
      {!icono && <span>{copiado ? "Enlace copiado" : "Compartir"}</span>}
    </button>
  );
}
