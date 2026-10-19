import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import PanelInteresados from "@/components/PanelInteresados";
import "@/app/styles/homepage.css";
import "@/app/styles/panel.css";
import "@/app/styles/interesados-panel.css";

export const metadata: Metadata = {
  title: "Interesados",
  description: "Interesados que contactaron tus publicaciones en Oikestia.",
};

export const dynamic = "force-dynamic";

/** Interesados del propietario: quién contactó, por qué publicación y estado. */
export default async function InteresadosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  if (user.rol !== "owner") {
    redirect("/propietario");
  }

  return (
    <section className="discover-section panel-section">
      <div className="panel-head">
        <h2>Interesados</h2>
      </div>
      <p className="panel-subtitulo">
        Personas que escribieron o pidieron visita en tus publicaciones.
      </p>
      <PanelInteresados />
    </section>
  );
}
