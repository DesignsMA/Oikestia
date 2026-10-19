"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { FiltrosPublicacion } from "@/lib/listings";
import { AMENIDADES_ETIQUETAS, OPERACIONES, TIPOS_PROPIEDAD, type AmenityKey } from "@/lib/validators";

const ETIQUETA_TIPO: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  "local-comercial": "Local comercial",
};

const RANGOS: { clave: string; etiqueta: string }[] = [
  { clave: "0-1m", etiqueta: "Hasta $1M" },
  { clave: "1m-3m", etiqueta: "$1M – $3M" },
  { clave: "3m-6m", etiqueta: "$3M – $6M" },
  { clave: "6m+", etiqueta: "$6M+" },
];

const AMENIDADES_CLAVES = Object.keys(AMENIDADES_ETIQUETAS) as AmenityKey[];

type Props = { filtros: FiltrosPublicacion; hayFiltros: boolean };

/** Filtros del buscador: navegan por query manteniendo lat/lng/radio del mapa. */
export default function FiltrosBuscar({ filtros, hayFiltros }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  /* Estado optimista: la URL manda, pero el chip responde al instante al clic. */
  const [tiposUI, setTiposUI] = useState<string[]>([]);
  const [operacionUI, setOperacionUI] = useState<string | null>(null);
  const [precioUI, setPrecioUI] = useState<string>("");
  const [amenidadesUI, setAmenidadesUI] = useState<string[]>([]);

  useEffect(() => {
    setTiposUI(search.getAll("tipo"));
    setOperacionUI(search.get("operacion"));
    setPrecioUI(search.get("precio") ?? "");
    setAmenidadesUI(search.getAll("amenidades"));
  }, [search]);

  const navegar = useCallback(
    (mutar: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(search.toString());
      mutar(p);
      const qs = p.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, search]
  );

  const tiposActivos = tiposUI.length ? tiposUI : filtros.tipos ?? (filtros.tipo ? [filtros.tipo] : []);

  function alternarMismoParam(p: URLSearchParams, clave: string, valor: string, activo: boolean) {
    const actuales = p.getAll(clave);
    p.delete(clave);
    const quedan = activo ? actuales.filter((v) => v !== valor) : [...actuales.filter((v) => v !== valor), valor];
    for (const v of quedan) p.append(clave, v);
  }

  const hayPrecio = filtros.precioMin !== undefined || filtros.precioMax !== undefined;
  const precioClave = (() => {
    if (precioUI) return precioUI;
    if (!hayPrecio) return "";
    for (const r of RANGOS) {
      const [min, max] =
        r.clave === "0-1m"
          ? [undefined, 1_000_000]
          : r.clave === "1m-3m"
            ? [1_000_000, 3_000_000]
            : r.clave === "3m-6m"
              ? [3_000_000, 6_000_000]
              : [6_000_000, undefined];
      if (min === filtros.precioMin && max === filtros.precioMax) return r.clave;
    }
    return "";
  })();

  function alternarTipo(t: string) {
    const activo = tiposActivos.includes(t);
    setTiposUI(activo ? tiposActivos.filter((v) => v !== t) : [...tiposActivos, t]);
    navegar((p) => {
      alternarMismoParam(p, "tipo", t, activo);
      p.delete("page");
    });
  }

  function elegirOperacion(op: string) {
    const activo = operacionUI === op;
    setOperacionUI(activo ? null : op);
    navegar((p) => {
      if (activo) p.delete("operacion");
      else p.set("operacion", op);
    });
  }

  function elegirPrecio(clave: string) {
    const activo = precioClave === clave;
    setPrecioUI(activo ? "" : clave);
    navegar((p) => {
      p.delete("precioMin");
      p.delete("precioMax");
      if (activo) p.delete("precio");
      else p.set("precio", clave);
    });
  }

  function alternarAmenidad(a: string) {
    const activo = amenidadesUI.includes(a);
    setAmenidadesUI(activo ? amenidadesUI.filter((v) => v !== a) : [...amenidadesUI, a]);
    navegar((p) => {
      alternarMismoParam(p, "amenidades", a, activo);
    });
  }

  return (
    <div className="filtros-buscar" role="group" aria-label="Filtros de búsqueda">
      <div className="filtros-grupo">
        <span className="filtros-titulo">Tipo</span>
        {TIPOS_PROPIEDAD.map((t) => {
          const activo = tiposActivos.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={activo}
              className={activo ? "filtros-chip filtros-chip-activo" : "filtros-chip"}
              onClick={() => alternarTipo(t)}
            >
              {ETIQUETA_TIPO[t]}
            </button>
          );
        })}
      </div>

      <div className="filtros-grupo">
        <span className="filtros-titulo">Operación</span>
        {OPERACIONES.map((op) => {
          const activo = operacionUI === op;
          return (
            <button
              key={op}
              type="button"
              aria-pressed={activo}
              className={activo ? "filtros-chip filtros-chip-activo" : "filtros-chip"}
              onClick={() => elegirOperacion(op)}
            >
              {op === "venta" ? "Venta" : "Renta"}
            </button>
          );
        })}
      </div>

      <div className="filtros-grupo">
        <span className="filtros-titulo">Precio</span>
        {RANGOS.map((r) => {
          const activo = precioClave === r.clave;
          return (
            <button
              key={r.clave}
              type="button"
              aria-pressed={activo}
              className={activo ? "filtros-chip filtros-chip-activo" : "filtros-chip"}
              onClick={() => elegirPrecio(r.clave)}
            >
              {r.etiqueta}
            </button>
          );
        })}
      </div>

      <div className="filtros-grupo">
        <span className="filtros-titulo">Amenidades</span>
        {AMENIDADES_CLAVES.map((a) => {
          const activo = amenidadesUI.includes(a);
          return (
            <button
              key={a}
              type="button"
              aria-pressed={activo}
              className={activo ? "filtros-chip filtros-chip-activo" : "filtros-chip"}
              onClick={() => alternarAmenidad(a)}
            >
              {AMENIDADES_ETIQUETAS[a]}
            </button>
          );
        })}
      </div>

      {hayFiltros && (
        <button
          type="button"
          className="filtros-limpiar"
          onClick={() => {
            setTiposUI([]);
            setOperacionUI(null);
            setPrecioUI("");
            setAmenidadesUI([]);
            navegar((p) => {
              for (const k of ["q", "tipo", "operacion", "precio", "precioMin", "precioMax", "recamaras", "amenidades", "orden"]) {
                p.delete(k);
              }
            });
          }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
