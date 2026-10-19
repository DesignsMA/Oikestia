"use client";

import { useState } from "react";
import { Icon } from "./IconSprite";
import Galeria from "./Galeria";

type Foto = { url: string; alt: string };

type Props = { fotos: Foto[]; titulo: string };

/** Rejilla de 3 fotos + overlay para abrir el carrusel completo. */
export default function GaleriaFicha({ fotos, titulo }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [inicial, setInicial] = useState(0);

  if (fotos.length === 0) return null;

  function abrir(i: number) {
    setInicial(i);
    setAbierto(true);
  }

  const visibles = fotos.slice(0, 3);

  return (
    <>
      <div className="listing-gallery">
        {visibles.map((img, i) => (
          <div className="gallery-item" key={`${img.url}-${i}`}>
            <button
              type="button"
              className="gallery-item-btn"
              onClick={() => abrir(i)}
              aria-label={`Ampliar foto ${i + 1}`}
            >
              <img src={img.url} alt={img.alt} className="listing-image" />
            </button>
            {i === 2 && fotos.length > 3 ? (
              <div className="gallery-item-overlay">
                <Icon name="i-gallery" />
                <button
                  type="button"
                  className="overlay-link link"
                  onClick={() => abrir(2)}
                >
                  Ver todas las fotos ({fotos.length}).
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <Galeria
        fotos={fotos}
        titulo={titulo}
        inicial={inicial}
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
      />
    </>
  );
}
