"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { HiloUI, MensajeUI } from "@/lib/mensajes";

type HiloDetalle = {
  lead: {
    id: string;
    listingSlug: string;
    listingTitulo: string;
    tipo: string;
    estado: string;
    contraparte: string;
  };
  mensajes: MensajeUI[];
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Panel de conversaciones (Fase 6): lista de hilos + hilo abierto.
 * La lista se refresca cada 5 s y el hilo abierto cada 4 s (polling
 * simple, sin WebSockets); los envíos fuerzan la recarga inmediata.
 */
export default function PanelMensajes() {
  const [hilos, setHilos] = useState<HiloUI[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [hilo, setHilo] = useState<HiloDetalle | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Lista de hilos (polling 5 s). */
  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const res = await fetch("/api/leads");
        const data = (await res.json()) as { ok: boolean; hilos?: HiloUI[]; error?: string };
        if (!vivo) return;
        if (data.ok && data.hilos) {
          setHilos(data.hilos);
          setErrorLista(null);
        } else {
          setErrorLista(data.error ?? "No se pudieron cargar tus mensajes");
        }
      } catch {
        if (vivo) setErrorLista("Sin conexión con el servidor");
      }
    }
    cargar();
    const reloj = window.setInterval(cargar, 5000);
    return () => {
      vivo = false;
      window.clearInterval(reloj);
    };
  }, []);

  /* Hilo abierto (polling 4 s). */
  useEffect(() => {
    if (!abierto) {
      setHilo(null);
      return;
    }
    let vivo = true;
    async function cargar() {
      try {
        const res = await fetch(`/api/mensajes?lead=${encodeURIComponent(abierto!)}`);
        const data = (await res.json()) as { ok: boolean; hilo?: HiloDetalle };
        if (vivo && data.ok && data.hilo) setHilo(data.hilo);
      } catch {
        /* se reintenta en el siguiente tick */
      }
    }
    cargar();
    const reloj = window.setInterval(cargar, 4000);
    return () => {
      vivo = false;
      window.clearInterval(reloj);
    };
  }, [abierto]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || !abierto || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: abierto, texto: t }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo enviar el mensaje");
        return;
      }
      setTexto("");
      const recarga = await fetch(`/api/mensajes?lead=${encodeURIComponent(abierto)}`);
      const detalle = (await recarga.json()) as { ok: boolean; hilo?: HiloDetalle };
      if (detalle.ok && detalle.hilo) setHilo(detalle.hilo);
    } catch {
      setError("Sin conexión con el servidor");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="panel-mensajes">
      <div className="hilos-lista">
        <p className="hilos-titulo">Conversaciones</p>

        {errorLista && <p className="hilo-error">{errorLista}</p>}
        {!hilos && !errorLista && <p className="hilo-vacio">Cargando…</p>}
        {hilos && hilos.length === 0 && (
          <div className="panel-vacio">
            <p>Aún no tienes conversaciones. Contacta a un propietario desde una publicación.</p>
          </div>
        )}

        {hilos?.map((h) => (
          <button
            key={h.id}
            type="button"
            className={abierto === h.id ? "hilo-btn hilo-btn-activo" : "hilo-btn"}
            onClick={() => setAbierto(h.id)}
          >
            <span className="hilo-btn-titulo">
              {h.listingTitulo}
              {h.ultimoMio === false && <span className="hilo-nuevo">Nuevo</span>}
            </span>
            <span className="hilo-btn-meta">
              {h.contraparte} · {h.tipo === "visita" ? "Visita" : "Mensaje"}
              {h.estado === "respondido" ? " · respondido" : ""}
            </span>
            <span className="hilo-btn-ultimo">{h.ultimoTexto ?? "—"}</span>
            <span className="hilo-btn-fecha">{fecha(h.ultimoCreado ?? h.creado)}</span>
          </button>
        ))}
      </div>

      <div className="hilo-panel">
        {!abierto && <p className="hilo-vacio">Elige una conversación para leer y responder.</p>}
        {abierto && !hilo && <p className="hilo-vacio">Cargando conversación…</p>}

        {abierto && hilo && (
          <>
            <header className="hilo-head">
              <Link href={`/publicaciones/${hilo.lead.listingSlug}`} className="hilo-head-titulo">
                {hilo.lead.listingTitulo}
              </Link>
              <p className="hilo-head-meta">
                Con {hilo.lead.contraparte} · {hilo.lead.tipo === "visita" ? "Solicitud de visita" : "Mensaje"} ·{" "}
                <span className={hilo.lead.estado === "respondido" ? "panel-badge panel-badge-publicada" : "panel-badge panel-badge-pausada"}>
                  {hilo.lead.estado === "respondido" ? "respondido" : "pendiente"}
                </span>
              </p>
            </header>

            <div className="hilo-mensajes">
              {hilo.mensajes.map((m) => (
                <div key={m.id} className={m.mio ? "hilo-msg hilo-msg-mio" : "hilo-msg"}>
                  <p className="hilo-msg-texto">{m.texto}</p>
                  <p className="hilo-msg-meta">
                    {m.emisor} · {fecha(m.creado)}
                  </p>
                </div>
              ))}
            </div>

            <form className="hilo-responder" onSubmit={enviar}>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Escribe tu respuesta…"
                maxLength={2000}
                rows={3}
                required
                aria-label="Mensaje"
              />
              <button type="submit" disabled={enviando || !texto.trim()}>
                {enviando ? "Enviando…" : "Enviar"}
              </button>
            </form>
            {error && <p className="hilo-error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
