import type { Metadata } from "next";
import Link from "next/link";
import "@/app/styles/legal.css";

export const metadata: Metadata = {
  title: "Sobre nosotros",
  description:
    "Oikestia es la plataforma inmobiliaria mexicana para encontrar, comparar y publicar propiedades con propietarios verificados.",
};

/** Página institucional: qué es Oikestia y cómo funciona. */
export default function SobreNosotrosPage() {
  return (
    <article className="contenido">
      <header className="contenido-cabecera">
        <span className="contenido-eyebrow">Oikestia</span>
        <h1>Sobre nosotros</h1>
        <p className="contenido-intro">
          Encontrar, comparar y publicar propiedades en un solo lugar — con la confianza de
          saber quién está detrás de cada anuncio.
        </p>
      </header>

      <section className="contenido-bloque">
        <h2>Nuestra misión</h2>
        <p>
          Oikestia nace para simplificar la experiencia inmobiliaria en México. Reunimos en una
          sola plataforma la búsqueda de propiedades, la comparación de opciones y la publicación
          directa por parte de propietarios, sin intermediarios innecesarios.
        </p>
        <p>
          Creemos que la transparencia genera confianza: por eso cada propietario que publica en
          Oikestia pasa por un proceso de verificación de identidad antes de que su anuncio se
          muestre al público.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>Cómo funciona</h2>
        <ul>
          <li>
            <strong>Para quien busca:</strong> explora casas, departamentos, terrenos y locales
            comerciales, filtra por operación, tipo, precio, recámaras y amenidades, y guarda tus
            favoritos para compararlos.
          </li>
          <li>
            <strong>Para quien publica:</strong> crea una cuenta de propietario, verifica tu
            identidad con tu INE y publica tu propiedad con fotos, características y reglas
            claras.
          </li>
          <li>
            <strong>Contacto directo:</strong> la comunicación entre interesados y propietarios
            ocurre dentro de la plataforma, de forma segura.
          </li>
        </ul>
      </section>

      <section className="contenido-bloque">
        <h2>Nuestros valores</h2>
        <div className="contenido-grid">
          <div className="contenido-card">
            <h3>Confianza</h3>
            <p>Propietarios verificados y anuncios claros, sin sorpresas.</p>
          </div>
          <div className="contenido-card">
            <h3>Transparencia</h3>
            <p>Información completa: precio, características, reglas y condiciones.</p>
          </div>
          <div className="contenido-card">
            <h3>Cercanía</h3>
            <p>Pensada para el mercado mexicano y sus necesidades reales.</p>
          </div>
        </div>
      </section>

      <section className="contenido-bloque">
        <h2>¿Quieres publicar tu propiedad?</h2>
        <p>
          Crea tu cuenta de propietario y empieza a publicar en minutos. Nuestro proceso de
          verificación protege tanto a quien publica como a quien busca.
        </p>
        <Link href="/registro" className="contenido-cta">
          Publicar una propiedad
        </Link>
      </section>
    </article>
  );
}
