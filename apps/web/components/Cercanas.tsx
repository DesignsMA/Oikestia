"use client";

import { useEffect, useState } from "react";

type AmenidadCercana = {
  categoria: string;
  etiqueta: string;
  nombre: string;
  distancia: number;
};

type Props = { slug: string };

/** Amenidades cercanas cargadas en el cliente (Overpass tarda; no bloquea la ficha). */
export default function Cercanas({ slug }: Props) {
  const [items, setItems] = useState<AmenidadCercana[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/cercanas?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: { ok: boolean; items?: AmenidadCercana[] }) => {
        if (vivo && d.ok && d.items) setItems(d.items);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [slug]);

  if (!items || items.length === 0) return null;

  const porCategoria = items.reduce<Record<string, AmenidadCercana[]>>((acc, a) => {
    (acc[a.categoria] ??= []).push(a);
    return acc;
  }, {});

  return (
    <>
      <h2>Qué hay cerca</h2>
      <div className="listing-cercanas">
        {Object.entries(porCategoria).map(([cat, lista]) => (
          <div className="cercanas-grupo" key={cat}>
            <h3 className="cercanas-titulo">{lista[0].etiqueta}</h3>
            <ul className="cercanas-lista">
              {lista.map((a) => (
                <li key={`${a.nombre}-${a.distancia}`}>
                  <span className="cercanas-nombre">{a.nombre}</span>
                  <span className="cercanas-distancia">{a.distancia.toFixed(1)} km</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="cercanas-nota">Distancias en línea recta a partir de datos de OpenStreetMap.</p>
    </>
  );
}
