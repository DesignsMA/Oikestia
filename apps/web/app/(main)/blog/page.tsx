import type { Metadata } from "next";
import Link from "next/link";
import "@/app/styles/legal.css";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Consejos, guías y novedades sobre el mercado inmobiliario en México. Próximamente en Oikestia.",
};

const PROXIMOS = [
  {
    titulo: "Cómo preparar tu casa antes de las visitas",
    resumen:
      "Pequeños arreglos y una buena presentación pueden acelerar la venta o renta de tu propiedad.",
  },
  {
    titulo: "Comprar o rentar: qué conviene según tu caso",
    resumen:
      "Analizamos los escenarios en los que conviene cada opción y los gastos a considerar.",
  },
  {
    titulo: "Documentos que necesitas para vender tu propiedad",
    resumen:
      "Escrituras, predial, certificados y todo lo que conviene tener listo antes de publicar.",
  },
];

/** Blog: contenido informativo para compradores, inquilinos y propietarios. */
export default function BlogPage() {
  return (
    <article className="contenido">
      <header className="contenido-cabecera">
        <span className="contenido-eyebrow">Blog</span>
        <h1>Ideas y consejos inmobiliarios</h1>
        <p className="contenido-intro">
          Un espacio para entender mejor el mercado inmobiliario mexicano y tomar mejores
          decisiones. Estamos preparando nuestro primer contenido.
        </p>
      </header>

      <section className="contenido-bloque">
        <h2>Próximamente</h2>
        <div className="contenido-grid">
          {PROXIMOS.map((a) => (
            <div className="contenido-card" key={a.titulo}>
              <h3>{a.titulo}</h3>
              <p>{a.resumen}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="contenido-aviso">
        ¿Tienes un tema que te gustaría leer? Escríbenos desde la página de contacto y lo
        tomaremos en cuenta.
      </div>

      <section className="contenido-bloque">
        <h2>Mientras tanto</h2>
        <p>Explora propiedades disponibles o empieza a publicar la tuya.</p>
        <Link href="/publicaciones" className="contenido-cta">
          Ver propiedades
        </Link>
      </section>
    </article>
  );
}
