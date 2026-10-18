import type { Metadata } from "next";
import { getInterestCatalog } from "@/lib/intereses";
import InteresesForm from "@/components/InteresesForm";
import "@/app/styles/signup.css";
import "@/app/styles/intereses.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tus intereses",
  description: "Elige al menos 3 intereses para personalizar las recomendaciones de Oikestia.",
};

export default async function InteresesPage() {
  const catalogo = await getInterestCatalog();

  return (
    <main>
      <section className="signup-section">
        <div className="signup-bg">
          <img src="/images/signup-bg.webp" alt="Interior moderno con vista al horizonte de una ciudad." />
          <div className="signup-bg-overlay">
            <h1>Afina tu búsqueda</h1>
            <p>Con tus intereses te mostramos primero las publicaciones que sí te interesan.</p>
          </div>
        </div>

        <section className="signup-form-section">
          <h1 className="signup-form-title">¿Qué buscas?</h1>
          <p className="intereses-intro">
            Selecciona al menos 3 opciones. Podrás cambiarlas después desde tu cuenta.
          </p>

          <InteresesForm catalogo={catalogo} />

          <div className="signup-login">
            <p>¿Prefieres seguir explorando?</p> <a href="/">Ir al inicio</a>
          </div>
        </section>
      </section>
    </main>
  );
}
