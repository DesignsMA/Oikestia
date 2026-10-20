import type { Metadata } from "next";
import Link from "next/link";
import "@/app/styles/legal.css";

export const metadata: Metadata = {
  title: "Contacta a Soporte",
  description:
    "Canales de contacto de Oikestia para dudas, soporte técnico y reportes de anuncios.",
};

/** Página de contacto y soporte. */
export default function ContactoPage() {
  return (
    <article className="contenido">
      <header className="contenido-cabecera">
        <span className="contenido-eyebrow">Ayuda</span>
        <h1>Contacta a Soporte</h1>
        <p className="contenido-intro">
          Estamos para ayudarte con tu cuenta, tus publicaciones o cualquier duda sobre la
          plataforma.
        </p>
      </header>

      <section className="contenido-bloque">
        <h2>Escríbenos</h2>
        <p>
          Envíanos un correo y te responderemos a la brevedad:
        </p>
        <p>
          <a className="link" href="mailto:soporte@oikestia.mx">
            soporte@oikestia.mx
          </a>
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>¿En qué te podemos ayudar?</h2>
        <ul>
          <li>
            <strong>Cuenta y acceso:</strong> problemas para iniciar sesión, registro o
            verificación de identidad.
          </li>
          <li>
            <strong>Publicaciones:</strong> dudas sobre cómo publicar, editar, pausar o eliminar
            una propiedad.
          </li>
          <li>
            <strong>Reportes:</strong> anuncios con información incorrecta, duplicados o
            sospechosos de fraude.
          </li>
          <li>
            <strong>Privacidad y datos:</strong> solicitudes relacionadas con tus datos
            personales.
          </li>
        </ul>
      </section>

      <section className="contenido-bloque">
        <h2>Para propietarios</h2>
        <p>
          Si necesitas ayuda con tu panel, revisa primero tus publicaciones y el estado de
          verificación desde tu cuenta.
        </p>
        <Link href="/propietario" className="contenido-cta">
          Ir a mi panel
        </Link>
      </section>
    </article>
  );
}
