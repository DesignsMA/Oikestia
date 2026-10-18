"use client";

import { useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  slug: string;
  titulo: string;
  estado: string;
  precio: string;
  operacion: string;
  foto: string;
  actualizado: string;
};

const ETIQUETAS_ESTADO: Record<string, string> = {
  publicada: "Publicada",
  pausada: "Pausada",
  borrador: "Borrador",
  vendida: "Vendida",
  rentada: "Rentada",
};

/** Lista de publicaciones propias con pausar/reanudar y eliminar. */
export default function PanelPublicaciones({ items, puedePausar }: { items: Item[]; puedePausar: boolean }) {
  const [lista, setLista] = useState(items);
  const [cargando, setCargando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function cambiarEstado(id: string, estado: string) {
    setCargando(id);
    setMensaje(null);
    try {
      const r = await fetch(`/api/publicaciones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMensaje(data.error ?? "No se pudo actualizar");
        return;
      }
      setLista((prev) => prev.map((it) => (it.id === id ? { ...it, estado } : it)));
    } catch {
      setMensaje("Sin conexión con el servidor");
    } finally {
      setCargando(null);
    }
  }

  async function eliminar(id: string, titulo: string) {
    if (!confirm(`¿Eliminar «${titulo}»? Esta acción borra la publicación y sus fotos.`)) return;
    setCargando(id);
    setMensaje(null);
    try {
      const r = await fetch(`/api/publicaciones/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMensaje(data.error ?? "No se pudo eliminar");
        return;
      }
      setLista((prev) => prev.filter((it) => it.id !== id));
    } catch {
      setMensaje("Sin conexión con el servidor");
    } finally {
      setCargando(null);
    }
  }

  if (lista.length === 0) {
    return (
      <div className="panel-vacio">
        <p>Aún no tienes publicaciones.</p>
        <Link href="/propietario/publicar" className="publish-btn">
          Crear mi primera publicación
        </Link>
      </div>
    );
  }

  return (
    <>
      {mensaje && (
        <p className="contact-aviso contact-error" role="alert">
          {mensaje}
        </p>
      )}
      <ul className="panel-lista">
        {lista.map((it) => (
          <li className="panel-item" key={it.id}>
            <img src={it.foto} alt={it.titulo} className="panel-item-foto" />
            <div className="panel-item-datos">
              <Link href={`/publicaciones/${it.slug}`} className="panel-item-titulo link">
                {it.titulo}
              </Link>
              <p className="panel-item-meta">
                <span className={`panel-badge panel-badge-${it.estado}`}>
                  {ETIQUETAS_ESTADO[it.estado] ?? it.estado}
                </span>
                <span>
                  {it.precio} · {it.operacion === "venta" ? "Venta" : "Renta"}
                </span>
              </p>
            </div>
            <div className="panel-item-acciones">
              {puedePausar && it.estado === "publicada" && (
                <button
                  type="button"
                  className="panel-btn"
                  disabled={cargando === it.id}
                  onClick={() => cambiarEstado(it.id, "pausada")}
                >
                  Pausar
                </button>
              )}
              {it.estado === "pausada" && (
                <button
                  type="button"
                  className="panel-btn"
                  disabled={cargando === it.id}
                  onClick={() => cambiarEstado(it.id, "publicada")}
                >
                  Reanudar
                </button>
              )}
              <button
                type="button"
                className="panel-btn panel-btn-peligro"
                disabled={cargando === it.id}
                onClick={() => eliminar(it.id, it.titulo)}
              >
                {cargando === it.id ? "…" : "Eliminar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
