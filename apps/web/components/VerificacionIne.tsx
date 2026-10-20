"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./IconSprite";

/**
 * Verificación de identidad: nombre completo + INE. Al enviar se habilitan los
 * permisos de propietario en la misma cuenta (rol owner + verificado).
 */
export default function VerificacionIne({ yaVerificado }: { yaVerificado: boolean }) {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">(
    yaVerificado ? "ok" : "idle"
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  function elegir(file: File | null) {
    setArchivo(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  async function enviar() {
    if (fullname.trim().length < 5) {
      setEstado("error");
      setMensaje("Escribe tu nombre completo como aparece en tu INE.");
      return;
    }
    if (!archivo) {
      setEstado("error");
      setMensaje("Adjunta la foto de tu INE para continuar.");
      return;
    }
    setEstado("enviando");
    setMensaje(null);
    try {
      const fd = new FormData();
      fd.set("fullname", fullname.trim());
      fd.set("tipoDocumento", "ine");
      fd.set("documento", archivo);
      const r = await fetch("/api/verificacion", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setEstado("error");
        setMensaje(data.error ?? "No se pudo enviar el documento.");
        return;
      }
      setEstado("ok");
      setMensaje(data.mensaje ?? "Cuenta verificada. Ya puedes publicar propiedades.");
      router.refresh();
    } catch {
      setEstado("error");
      setMensaje("Sin conexión con el servidor.");
    }
  }

  return (
    <div className="verif-ine">
      <div className="verif-ine-nota">
        <Icon name="i-shield" />
        <p>
          Completa tu nombre y sube una foto de tu INE. Al verificarte, tu cuenta
          adquiere permisos de propietario para publicar propiedades.
        </p>
      </div>

      {estado === "ok" ? (
        <div className="verif-ine-ok" role="status">
          <Icon name="i-verified" />
          <p>{mensaje}</p>
        </div>
      ) : (
        <>
          <label className="verif-ine-campo" htmlFor="ine-fullname">
            Nombre completo (como aparece en tu INE)
            <input
              id="ine-fullname"
              type="text"
              value={fullname}
              maxLength={120}
              autoComplete="name"
              placeholder="Nombre completo según documento oficial"
              onChange={(e) => setFullname(e.target.value)}
            />
          </label>

          <label className="verif-ine-drop" htmlFor="ine-file">
            {preview ? (
              <img src={preview} alt="Vista previa de tu INE" />
            ) : (
              <>
                <Icon name="i-gallery" />
                <span>Elegir foto de tu INE</span>
                <small>JPG, PNG o WEBP, máximo 8 MB.</small>
              </>
            )}
            <input
              id="ine-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => elegir(e.target.files?.[0] ?? null)}
            />
          </label>

          {mensaje && estado === "error" && (
            <p className="contact-aviso contact-error" role="alert">{mensaje}</p>
          )}
        </>
      )}

      <div className="verif-ine-acciones">
        <button
          type="button"
          className="panel-btn panel-btn-primario"
          onClick={enviar}
          disabled={estado === "enviando" || estado === "ok"}
        >
          {estado === "enviando" ? "Enviando…" : estado === "ok" ? "Verificada" : "Enviar y verificar"}
        </button>
        <button type="button" className="panel-btn" onClick={() => router.push("/cuenta")}>
          {estado === "ok" ? "Continuar" : "Volver"}
        </button>
      </div>
    </div>
  );
}
