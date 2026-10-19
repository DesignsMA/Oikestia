"use client";

import { useEffect, useState } from "react";
import type { InteresadoUI } from "@/lib/mensajes";

type Perfil = {
  nombre: string;
  avatarUrl: string;
  email: string;
  telefono: string | null;
};

const ESTADOS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  descartado: "Descartado",
  respondido: "Respondido",
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Lista de interesados con perfil bajo demanda (solo si existe el lead). */
export default function PanelInteresados() {
  const [items, setItems] = useState<InteresadoUI[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "mensaje" | "visita">("todos");
  const [perfil, setPerfil] = useState<{ userId: string; datos: Perfil | "cargando" | "error" } | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const res = await fetch("/api/interesados");
        const data = (await res.json()) as { ok: boolean; interesados?: InteresadoUI[]; error?: string };
        if (!vivo) return;
        if (data.ok && data.interesados) {
          setItems(data.interesados);
          setError(null);
        } else {
          setError(data.error ?? "No se pudieron cargar los interesados");
        }
      } catch {
        if (vivo) setError("Sin conexión con el servidor");
      }
    }
    cargar();
    const reloj = window.setInterval(cargar, 10000);
    return () => {
      vivo = false;
      window.clearInterval(reloj);
    };
  }, []);

  async function verPerfil(userId: string) {
    setPerfil({ userId, datos: "cargando" });
    try {
      const res = await fetch(`/api/interesados/perfil?user=${encodeURIComponent(userId)}`);
      const data = (await res.json()) as { ok: boolean; perfil?: Perfil };
      if (data.ok && data.perfil) setPerfil({ userId, datos: data.perfil });
      else setPerfil({ userId, datos: "error" });
    } catch {
      setPerfil({ userId, datos: "error" });
    }
  }

  const visibles = items?.filter((i) => filtro === "todos" || i.tipo === filtro) ?? null;

  return (
    <div className="interesados-panel">
      <div className="interesados-filtros">
        {(["todos", "mensaje", "visita"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className={filtro === f ? "interesados-chip interesados-chip-activo" : "interesados-chip"}
            onClick={() => setFiltro(f)}
          >
            {f === "todos" ? "Todos" : f === "mensaje" ? "Mensajes" : "Visitas"}
          </button>
        ))}
      </div>

      {error && <p className="hilo-error">{error}</p>}
      {!visibles && !error && <p className="hilo-vacio">Cargando…</p>}
      {visibles && visibles.length === 0 && (
        <div className="panel-vacio">
          <p>Aún no tienes interesados. Cuando alguien te escriba, aparecerá aquí.</p>
        </div>
      )}

      <ul className="interesados-lista">
        {visibles?.map((i) => (
          <li className="interesado" key={i.leadId}>
            <img className="interesado-avatar" src={i.avatarUrl} alt="" />
            <div className="interesado-info">
              <strong>{i.nombre}</strong>
              <a className="interesado-pub" href={`/publicaciones/${i.listingSlug}`}>
                {i.listingTitulo}
              </a>
              <span className="interesado-meta">
                {i.tipo === "visita" ? "Solicitud de visita" : "Mensaje"} · {fecha(i.fecha)} ·{" "}
                {ESTADOS[i.estado] ?? i.estado}
              </span>
              {i.ultimoTexto && <span className="interesado-ultimo">{i.ultimoTexto}</span>}
            </div>
            <div className="interesado-acciones">
              <button
                type="button"
                className="interesado-btn"
                onClick={() => (i.userId ? verPerfil(i.userId) : undefined)}
                disabled={!i.userId}
              >
                Ver perfil
              </button>
              <a className="interesado-btn interesado-btn-primario" href={`/mensajes?lead=${i.leadId}`}>
                Abrir chat
              </a>
            </div>

            {perfil?.userId === i.userId && perfil.datos !== "cargando" && (
              <div className="interesado-perfil">
                {perfil.datos === "error" ? (
                  <p>No disponible.</p>
                ) : (
                  <>
                    <img src={perfil.datos.avatarUrl} alt="" />
                    <div>
                      <strong>{perfil.datos.nombre}</strong>
                      {perfil.datos.email && <p>{perfil.datos.email}</p>}
                      {perfil.datos.telefono && <p>{perfil.datos.telefono}</p>}
                      {!perfil.datos.email && !perfil.datos.telefono && (
                        <p>No comparte datos de contacto.</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
