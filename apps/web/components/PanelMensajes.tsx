"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "./IconSprite";
import type { HiloUI, MensajeUI, DatosCompartidos } from "@/lib/mensajes";

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
  contacto: DatosCompartidos | null;
};

function fecha(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Panel de conversaciones: lista de hilos + hilo abierto (polling 5 s / 4 s). */
export default function PanelMensajes() {
  const params = useSearchParams();
  const leadInicial = params.get("lead");
  const [hilos, setHilos] = useState<HiloUI[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [total, setTotal] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(leadInicial);
  const [hilo, setHilo] = useState<HiloDetalle | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarVisita, setMostrarVisita] = useState(false);
  const [fechaVisita, setFechaVisita] = useState("");
  const [enviandoVisita, setEnviandoVisita] = useState(false);
  const [avisoVisita, setAvisoVisita] = useState<string | null>(null);

  /* Lista de hilos (polling 5 s). Refresca la primera página y conserva las
     páginas ya cargadas para no perder el "Cargar más". */
  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const res = await fetch("/api/leads?pagina=0");
        const data = (await res.json()) as {
          ok: boolean;
          hilos?: HiloUI[];
          total?: number;
          hayMas?: boolean;
          error?: string;
        };
        if (!vivo) return;
        if (data.ok && data.hilos) {
          const iniciales = data.hilos;
          setHilos((previos) => {
            if (!previos) return iniciales;
            const ids = new Set(iniciales.map((h) => h.id));
            return [...iniciales, ...previos.filter((h) => !ids.has(h.id))];
          });
          setTotal(data.total ?? iniciales.length);
          setHayMas((actual) => actual || Boolean(data.hayMas));
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

  async function cargarMas() {
    if (cargandoMas || !hayMas) return;
    setCargandoMas(true);
    try {
      const siguiente = pagina + 1;
      const res = await fetch(`/api/leads?pagina=${siguiente}`);
      const data = (await res.json()) as {
        ok: boolean;
        hilos?: HiloUI[];
        total?: number;
        hayMas?: boolean;
      };
      if (data.ok && data.hilos) {
        const nuevos = data.hilos;
        setHilos((previos) => {
          const actuales = previos ?? [];
          const ids = new Set(actuales.map((h) => h.id));
          return [...actuales, ...nuevos.filter((h) => !ids.has(h.id))];
        });
        setPagina(siguiente);
        setTotal(data.total ?? total);
        setHayMas(Boolean(data.hayMas));
      }
    } catch {
      setErrorLista("Sin conexión con el servidor");
    } finally {
      setCargandoMas(false);
    }
  }

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

  async function pedirVisita(e: FormEvent) {
    e.preventDefault();
    if (!abierto || enviandoVisita || fechaVisita.trim().length < 3) return;
    setEnviandoVisita(true);
    setError(null);
    setAvisoVisita(null);
    try {
      const res = await fetch("/api/mensajes/visita", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead: abierto, fecha: fechaVisita.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "No se pudo solicitar la visita");
        return;
      }
      setFechaVisita("");
      setMostrarVisita(false);
      setAvisoVisita("Solicitud de visita enviada.");
      const recarga = await fetch(`/api/mensajes?lead=${encodeURIComponent(abierto)}`);
      const detalle = (await recarga.json()) as { ok: boolean; hilo?: HiloDetalle };
      if (detalle.ok && detalle.hilo) setHilo(detalle.hilo);
    } catch {
      setError("Sin conexión con el servidor");
    } finally {
      setEnviandoVisita(false);
    }
  }

  return (
    <div className="panel-mensajes">
      <div className="hilos-lista" aria-label="Conversaciones">
        <p className="hilos-aviso">Elige una conversación para leer y responder.</p>

        {errorLista && (
          <p className="hilo-error" role="alert">
            {errorLista}
          </p>
        )}
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
            aria-current={abierto === h.id ? "true" : undefined}
            aria-label={`${h.listingTitulo}, con ${h.contraparte}${h.ultimoMio === false ? ", mensaje nuevo" : ""}`}
            onClick={() => setAbierto(h.id)}
          >
            <span className="hilo-btn-foto" aria-hidden="true">
              {h.listingFoto ? (
                <img src={h.listingFoto} alt="" />
              ) : (
                <Icon name="i-message" />
              )}
            </span>
            <span className="hilo-btn-cuerpo">
              <span className="hilo-btn-titulo">
                {h.listingTitulo}
                {h.ultimoMio === false && <span className="hilo-nuevo" aria-hidden="true">Nuevo</span>}
              </span>
              <span className="hilo-btn-meta">
                {h.contraparte} · {h.tipo === "visita" ? "Visita" : "Mensaje"}
                {h.estado === "respondido" ? " · respondido" : ""}
              </span>
              <span className="hilo-btn-ultimo">{h.ultimoTexto ?? "—"}</span>
            </span>
            <span className="hilo-btn-fecha">{fecha(h.ultimoCreado ?? h.creado)}</span>
          </button>
        ))}

        {hilos && hilos.length > 0 && hayMas && (
          <button
            type="button"
            className="hilos-mas"
            onClick={cargarMas}
            disabled={cargandoMas}
          >
            {cargandoMas ? "Cargando…" : `Cargar más (${hilos.length} de ${total})`}
          </button>
        )}
      </div>

      <div className="hilo-panel">
        {!abierto && <p className="hilo-vacio hilo-vacio-grande">Elige una conversación para leer y responder.</p>}
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

            <div className="hilo-mensajes" role="log" aria-live="polite" aria-label="Mensajes de la conversación">
              {hilo.mensajes.length === 0 && <p className="hilo-vacio">Aún no hay mensajes.</p>}
              {hilo.mensajes.map((m) => (
                <div key={m.id} className={m.mio ? "hilo-msg hilo-msg-mio" : "hilo-msg"}>
                  <p className="hilo-msg-texto">{m.texto}</p>
                  <p className="hilo-msg-meta">
                    {m.emisor} · {fecha(m.creado)}
                  </p>
                </div>
              ))}
            </div>

            {hilo.contacto && (
              <div className="hilo-contacto">
                <p className="hilo-contacto-titulo">Datos de contacto compartidos</p>
                <ul>
                  {hilo.contacto.correo && (
                    <li>
                      <a href={`mailto:${hilo.contacto.correo}`}>{hilo.contacto.correo}</a>
                    </li>
                  )}
                  {hilo.contacto.telefono && (
                    <li>
                      <a href={`tel:${hilo.contacto.telefono.replace(/[^\d+]/g, "")}`}>
                        {hilo.contacto.telefono}
                      </a>
                    </li>
                  )}
                  {hilo.contacto.redes.length > 0 && <li>{hilo.contacto.redes.join(" · ")}</li>}
                </ul>
              </div>
            )}

            {avisoVisita && (
              <p className="hilo-aviso" role="status">{avisoVisita}</p>
            )}
            {mostrarVisita ? (
              <form className="hilo-visita" onSubmit={pedirVisita}>
                <label htmlFor="fecha-visita">Fecha y hora propuestas</label>
                <input
                  id="fecha-visita"
                  type="text"
                  value={fechaVisita}
                  onChange={(e) => setFechaVisita(e.target.value)}
                  placeholder="Ej. Sábado 2 de noviembre, 11:00"
                  maxLength={80}
                  required
                />
                <div className="hilo-visita-acciones">
                  <button type="submit" disabled={enviandoVisita || fechaVisita.trim().length < 3}>
                    {enviandoVisita ? "Enviando…" : "Enviar solicitud"}
                  </button>
                  <button type="button" className="hilo-visita-cancelar" onClick={() => setMostrarVisita(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="hilo-visita-btn" onClick={() => setMostrarVisita(true)}>
                Solicitar visita
              </button>
            )}

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
            {error && (
              <p className="hilo-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
