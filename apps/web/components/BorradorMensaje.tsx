"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = { slug: string; titulo: string };

/** Cuadro de escritura del primer mensaje; al enviar redirige a la conversación. */
export default function BorradorMensaje({ slug, titulo }: Props) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (t.length < 10 || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/mensajes/nuevo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing: slug, message: t }),
      });
      const data = (await res.json()) as { ok: boolean; leadId?: string; error?: string };
      if (!res.ok || !data.ok || !data.leadId) {
        setError(data.error ?? "No se pudo enviar el mensaje");
        return;
      }
      router.push(`/mensajes?lead=${data.leadId}`);
    } catch {
      setError("Sin conexión con el servidor");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="borrador-form" onSubmit={enviar}>
      <label htmlFor="primer-mensaje">Tu mensaje a {titulo}</label>
      <textarea
        id="primer-mensaje"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Hola, me interesa esta propiedad y quisiera más información…"
        maxLength={2000}
        rows={5}
        required
      />
      {error && <p className="hilo-error">{error}</p>}
      <button type="submit" disabled={enviando || texto.trim().length < 10}>
        {enviando ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
