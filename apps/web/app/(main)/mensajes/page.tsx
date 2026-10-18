import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import PanelMensajes from "@/components/PanelMensajes";
import "@/app/styles/homepage.css";
import "@/app/styles/panel.css";

export const metadata: Metadata = {
  title: "Mensajes",
  description: "Tus conversaciones con propietarios e interesados en Oikestia.",
};

export const dynamic = "force-dynamic";

/**
 * Mensajes (Fase 6): hilos por publicación para propietarios e interesados.
 * El panel hace polling de /api/leads y /api/mensajes.
 */
export default async function MensajesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  return (
    <section className="discover-section panel-section">
      <div className="panel-head">
        <h2>Mensajes</h2>
      </div>
      <p className="panel-subtitulo">
        {user.rol === "owner"
          ? "Conversaciones con interesados en tus publicaciones."
          : "Tus conversaciones con los propietarios que contactaste."}
      </p>
      <PanelMensajes />
    </section>
  );
}
