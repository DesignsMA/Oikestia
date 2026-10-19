import type { Metadata } from "next";
import { Suspense } from "react";
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

/** Mensajes: hilos por publicación para propietarios e interesados. */
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
      <Suspense fallback={<p className="hilo-vacio">Cargando conversaciones…</p>}>
        <PanelMensajes />
      </Suspense>
    </section>
  );
}
