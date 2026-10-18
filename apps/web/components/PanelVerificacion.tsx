"use client";

import { useState } from "react";

/** Formulario de verificación de identidad (documento a GridFS). */
export default function PanelVerificacion() {
  const [tipoDocumento, setTipoDocumento] = useState("ine");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) {
      setEstado("error");
      setMensaje("Adjunta la foto de tu documento.");
      return;
    }
    setEstado("enviando");
    setMensaje(null);
    try {
      const fd = new FormData();
      fd.set("tipoDocumento", tipoDocumento);
      fd.set("documento", archivo);
      const r = await fetch("/api/verificacion", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setEstado("error");
        setMensaje(data.error ?? "No se pudo enviar el documento.");
        return;
      }
      setEstado("ok");
      setMensaje(data.mensaje ?? "Documento recibido.");
      if (data.estado === "verificado") {
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setEstado("error");
      setMensaje("Sin conexión con el servidor.");
    }
  }

  if (estado === "ok") {
    return (
      <p className="contact-aviso contact-ok" role="status">
        {mensaje}
      </p>
    );
  }

  return (
    <form className="panel-verificacion" onSubmit={enviar}>
      <label className="verif-label" htmlFor="verif-tipo">
        Tipo de documento
      </label>
      <select
        id="verif-tipo"
        className="verif-select"
        value={tipoDocumento}
        onChange={(e) => setTipoDocumento(e.target.value)}
      >
        <option value="ine">INE / INE-electrónica</option>
        <option value="pasaporte">Pasaporte</option>
        <option value="cedula">Cédula profesional</option>
      </select>

      <label className="verif-label" htmlFor="verif-archivo">
        Foto del documento (JPG, PNG o WEBP, máximo 8 MB)
      </label>
      <input
        id="verif-archivo"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
      />

      {mensaje && estado === "error" && (
        <p className="contact-aviso contact-error" role="alert">
          {mensaje}
        </p>
      )}

      <button type="submit" className="panel-btn panel-btn-primario" disabled={estado === "enviando"}>
        {estado === "enviando" ? "Enviando…" : "Enviar documento"}
      </button>
    </form>
  );
}
