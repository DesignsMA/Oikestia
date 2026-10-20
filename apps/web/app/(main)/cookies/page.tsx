import type { Metadata } from "next";
import "@/app/styles/legal.css";

export const metadata: Metadata = {
  title: "Aviso de Cookies",
  description:
    "Qué son las cookies, cuáles usa Oikestia y cómo puedes gestionarlas desde tu navegador.",
};

const ACTUALIZADO = "19 de octubre de 2026";

/** Aviso de cookies. */
export default function CookiesPage() {
  return (
    <article className="contenido">
      <header className="contenido-cabecera">
        <span className="contenido-eyebrow">Legal</span>
        <h1>Aviso de Cookies</h1>
        <p className="contenido-intro">
          Usamos cookies para que la plataforma funcione correctamente y para entender cómo se
          usa. Aquí te explicamos cómo.
        </p>
      </header>

      <section className="contenido-bloque">
        <h2>¿Qué son las cookies?</h2>
        <p>
          Las cookies son pequeños archivos que se guardan en tu dispositivo. Permiten que el
          sitio recuerde información entre visitas, como tu sesión iniciada o tus preferencias.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>Tipos de cookies que usamos</h2>
        <ul>
          <li>
            <strong>Esenciales:</strong> mantienen tu sesión iniciada y permiten funciones básicas
            como iniciar sesión, publicar o guardar favoritos. Sin ellas el sitio no funciona.
          </li>
          <li>
            <strong>De preferencias:</strong> recuerdan ajustes como el idioma o la vista que
            elegiste.
          </li>
          <li>
            <strong>De medición:</strong> nos ayudan a entender, de forma agregada y anónima, cómo
            se usan las publicaciones para mejorarlas.
          </li>
        </ul>
      </section>

      <section className="contenido-bloque">
        <h2>Cookies de terceros</h2>
        <p>
          Algunas funciones pueden apoyarse en servicios externos que establecen sus propias
          cookies. Estas se rigen por las políticas de dichos proveedores.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>Cómo gestionarlas</h2>
        <p>
          Puedes bloquear o eliminar cookies desde la configuración de tu navegador. Ten en cuenta
          que desactivar las cookies esenciales puede impedir que inicies sesión o uses funciones
          clave de Oikestia.
        </p>
      </section>

      <p className="contenido-fecha">Última actualización: {ACTUALIZADO}</p>
    </article>
  );
}
