"use client";

import { useEffect, useRef, useState } from "react";
import type { DireccionParcial } from "@/lib/geoapify";

export type Elegida = { texto: string; lat: number; lng: number; direccion: DireccionParcial };

type Props = {
  /** Sesga las sugerencias hacia donde está el pin (opcional). */
  cerca?: { lat: number; lng: number } | null;
  onElegir: (e: Elegida) => void;
};

const ESPERA_MS = 400;

/** Campo "Buscar dirección" con sugerencias (Geoapify vía /api/geocode/sugerencias). */
export default function SugerenciasDireccion({ cerca, onElegir }: Props) {
  const [texto, setTexto] = useState("");
  const [opciones, setOpciones] = useState<Elegida[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(0);
  const relojRef = useRef<number | null>(null);
  const seqRef = useRef(0);
  const cercaRef = useRef(cerca);
  cercaRef.current = cerca;

  /* Debounce de400ms: una sola petición por pausa de tecleo, descartando obsoletas. */
  useEffect(() => {
    const q = texto.trim();
    if (q.length < 3) {
      setOpciones([]);
      setCargando(false);
      return;
    }
    setCargando(true);
    if (relojRef.current) window.clearTimeout(relojRef.current);
    relojRef.current = window.setTimeout(async () => {
      const seq = ++seqRef.current;
      try {
        const params = new URLSearchParams({ q });
        const c = cercaRef.current;
        if (c) {
          params.set("lat", String(c.lat));
          params.set("lng", String(c.lng));
        }
        const res = await fetch(`/api/geocode/sugerencias?${params}`);
        const data = (await res.json()) as { ok: boolean; opciones?: Elegida[] };
        if (seq !== seqRef.current) return;
        setOpciones(data.ok && Array.isArray(data.opciones) ? data.opciones : []);
        setActivo(0);
        setAbierto(true);
        setCargando(false);
      } catch {
        if (seq !== seqRef.current) return;
        setOpciones([]);
        setCargando(false);
      }
    }, ESPERA_MS);

    return () => {
      if (relojRef.current) window.clearTimeout(relojRef.current);
    };
  }, [texto]);

  function elegir(o: Elegida) {
    onElegir(o);
    setTexto("");
    setOpciones([]);
    setAbierto(false);
  }

  function manejarTeclas(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setAbierto(false);
      return;
    }
    if (!abierto || opciones.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, opciones.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = opciones[activo];
      if (o) elegir(o);
    }
  }

  return (
    <div className="sug-dir">
      <label className="verif-label" htmlFor="sug-dir-input">
        Buscar dirección
      </label>
      <input
        id="sug-dir-input"
        className="verif-input"
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => {
          if (opciones.length > 0) setAbierto(true);
        }}
        onBlur={() => setAbierto(false)}
        onKeyDown={manejarTeclas}
        placeholder="Código postal, colonia o calle (ej. 72480)"
        autoComplete="off"
        maxLength={120}
        role="combobox"
        aria-expanded={abierto}
        aria-controls="sug-dir-lista"
        aria-autocomplete="list"
      />
      {cargando && (
        <p className="sug-dir-nota" aria-live="polite">
          Buscando sugerencias…
        </p>
      )}
      {abierto && opciones.length > 0 && (
        <ul className="sug-dir-lista" id="sug-dir-lista" role="listbox">
          {opciones.map((o, i) => (
            <li key={`${o.lat},${o.lng},${o.texto}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === activo}
                className="sug-dir-opcion"
                onMouseDown={(e) => {
                  // mousedown antes del blur del input: la selección llega primero.
                  e.preventDefault();
                  elegir(o);
                }}
                onMouseEnter={() => setActivo(i)}
              >
                {o.texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
