import type { Metadata } from "next";
import "@/app/styles/legal.css";

export const metadata: Metadata = {
  title: "Términos de Servicio",
  description:
    "Condiciones de uso de Oikestia: reglas para publicar, contactar y usar la plataforma inmobiliaria.",
};

const ACTUALIZADO = "19 de octubre de 2026";

/** Términos de servicio. */
export default function TerminosPage() {
  return (
    <article className="contenido">
      <header className="contenido-cabecera">
        <span className="contenido-eyebrow">Legal</span>
        <h1>Términos de Servicio</h1>
        <p className="contenido-intro">
          Al usar Oikestia aceptas estas condiciones. Te pedimos leerlas con atención.
        </p>
      </header>

      <section className="contenido-bloque">
        <h2>1. Aceptación</h2>
        <p>
          El uso de Oikestia implica la aceptación de estos términos. Si no estás de acuerdo,
          te pedimos no utilizar la plataforma.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>2. Cuentas de usuario</h2>
        <p>
          Eres responsable de la veracidad de los datos de tu cuenta y de mantener tu contraseña
          segura. Las cuentas de propietario requieren verificación de identidad para publicar.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>3. Publicaciones</h2>
        <ul>
          <li>Debes ser el propietario o contar con autorización para publicar una propiedad.</li>
          <li>La información, fotos y reglas publicadas deben ser veraces y actuales.</li>
          <li>No se permiten anuncios duplicados, engañosos o que promuevan actividades ilegales.</li>
          <li>Oikestia puede pausar o retirar publicaciones que incumplan estos términos.</li>
        </ul>
      </section>

      <section className="contenido-bloque">
        <h2>4. Uso adecuado</h2>
        <p>
          Te comprometes a no usar la plataforma para hostigar a otras personas, enviar spam,
          intentar fraudes, vulnerar la seguridad del sitio o extraer datos de forma automatizada
          no autorizada.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>5. Responsabilidad</h2>
        <p>
          Oikestia es un medio de encuentro entre interesados y propietarios. No participamos en
          las negociaciones ni garantizamos las condiciones de las propiedades. Verifica siempre
          la información antes de concretar cualquier operación.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>6. Propiedad intelectual</h2>
        <p>
          La marca, el diseño y el contenido de Oikestia están protegidos. El contenido que
          publicas sigue siendo tuyo, pero nos otorgas una licencia para mostrarlo dentro de la
          plataforma.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>7. Cambios</h2>
        <p>
          Podemos modificar estos términos para reflejar cambios legales o del servicio. El uso
          continuado implica la aceptación de la versión vigente.
        </p>
      </section>

      <p className="contenido-fecha">Última actualización: {ACTUALIZADO}</p>
    </article>
  );
}
