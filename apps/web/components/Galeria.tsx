"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./IconSprite";

type Foto = { url: string; alt: string };

type Props = {
  fotos: Foto[];
  titulo: string;
  /** Índice con el que abrir (por defecto 0). */
  inicial?: number;
  abierto: boolean;
  onCerrar: () => void;
};

/** Carrusel a pantalla completa con navegación por botones y teclado. */
export default function Galeria({ fotos, titulo, inicial = 0, abierto, onCerrar }: Props) {
  const [idx, setIdx] = useState(inicial);

  useEffect(() => {
    if (abierto) setIdx(Math.min(Math.max(inicial, 0), Math.max(fotos.length - 1, 0)));
  }, [abierto, inicial, fotos.length]);

  const anterior = useCallback(() => {
    setIdx((i) => (i - 1 + fotos.length) % fotos.length);
  }, [fotos.length]);

  const siguiente = useCallback(() => {
    setIdx((i) => (i + 1) % fotos.length);
  }, [fotos.length]);

  useEffect(() => {
    if (!abierto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowLeft") anterior();
      else if (e.key === "ArrowRight") siguiente();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [abierto, anterior, siguiente, onCerrar]);

  if (!abierto || fotos.length === 0) return null;

  const foto = fotos[idx];

  return (
    <div
      className="galeria-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Fotos de ${titulo}`}
      onClick={onCerrar}
    >
      <button type="button" className="galeria-cerrar" onClick={onCerrar} aria-label="Cerrar galería">
        <Icon name="i-x" />
      </button>

      {fotos.length > 1 && (
        <button
          type="button"
          className="galeria-flecha galeria-flecha-izq"
          onClick={(e) => {
            e.stopPropagation();
            anterior();
          }}
          aria-label="Foto anterior"
        >
          ‹
        </button>
      )}

      <figure className="galeria-figura" onClick={(e) => e.stopPropagation()}>
        <img src={foto.url} alt={foto.alt || `${titulo} — foto ${idx + 1}`} />
        <figcaption className="galeria-pie">
          {titulo} · {idx + 1} / {fotos.length}
        </figcaption>
      </figure>

      {fotos.length > 1 && (
        <button
          type="button"
          className="galeria-flecha galeria-flecha-der"
          onClick={(e) => {
            e.stopPropagation();
            siguiente();
          }}
          aria-label="Foto siguiente"
        >
          ›
        </button>
      )}
    </div>
  );
}
