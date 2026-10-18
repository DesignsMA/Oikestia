"use client";

import { useState } from "react";
import type { InterestItem } from "@/lib/intereses";

type Props = { catalogo: Record<string, InterestItem[]> };

const MIN = 3;

/** Selector de intereses: mínimo 3, con contador y validación en cliente. */
export default function InteresesForm({ catalogo }: Props) {
  const [sel, setSel] = useState<Set<string>>(new Set());

  function toggle(clave: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  }

  const puedeEnviar = sel.size >= MIN;

  return (
    <form action="/api/intereses" method="post" className="intereses-form">
      <p className="intereses-counter" aria-live="polite">
        {sel.size} de {MIN} mínimos seleccionados
      </p>

      <div className="intereses-grupos">
        {Object.entries(catalogo).map(([grupo, items]) => (
          <fieldset key={grupo} className="intereses-grupo">
            <legend className="intereses-legend">{grupo}</legend>
            <div className="intereses-opciones">
              {items.map((item) => (
                <label
                  key={item.clave}
                  className={
                    sel.has(item.clave)
                      ? "intereses-chip intereses-chip-activo"
                      : "intereses-chip"
                  }
                >
                  <input
                    type="checkbox"
                    name="intereses"
                    value={item.clave}
                    checked={sel.has(item.clave)}
                    onChange={() => toggle(item.clave)}
                  />
                  <span>{item.etiqueta}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <button type="submit" className="intereses-submit" disabled={!puedeEnviar}>
        Guardar y continuar
      </button>
    </form>
  );
}
