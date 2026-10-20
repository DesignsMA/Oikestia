import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AsistentePublicacion from "@/components/AsistentePublicacion";
import "@/app/styles/homepage.css";
import "@/app/styles/intereses.css";
import "@/app/styles/panel.css";

export const metadata: Metadata = {
  title: "Nueva publicación",
  description: "Asistente de publicación de propiedades en Oikestia.",
};

export const dynamic = "force-dynamic";

/** Asistente de publicación: 4 pasos + revisión. Solo propietarios. */
export default async function PublicarPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  if (user.rol !== "owner") {
    return (
      <section className="discover-section">
        <h2>Nueva publicación</h2>
        <p>
          Solo las cuentas de propietario pueden publicar. Crea una en{" "}
          <Link href="/registro" className="link">
            registro
          </Link>{" "}
          eligiendo «Propietario».
        </p>
      </section>
    );
  }

  const autoVerify = process.env.DEV_AUTO_VERIFY === "true";
  if (!user.verificado && !autoVerify) {
    return (
      <section className="discover-section">
        <h2>Nueva publicación</h2>
        <p>
          Tu cuenta aún no está verificada. Primero verifícate con tu nombre y tu INE desde{" "}
          <Link href="/cuenta/verificacion" className="link">
            verificación
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section className="discover-section panel-section">
      <div className="panel-head">
        <h2>Nueva publicación</h2>
        <Link href="/propietario" className="publish-btn">
          Volver al panel
        </Link>
      </div>
      <AsistentePublicacion />
    </section>
  );
}
