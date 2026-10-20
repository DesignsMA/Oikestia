import type { Metadata } from "next";
import Link from "next/link";
import "@/app/styles/legal.css";

export const metadata: Metadata = {
  title: "Guía de precios",
  description:
    "Cómo fijar el precio de tu propiedad en México: factores clave, rangos orientativos por zona y errores comunes al publicar.",
};

/** Guía orientativa para propietarios que quieren fijar un precio competitivo. */
export default function GuiaDePreciosPage() {
  return (
    <article className="contenido">
      <header className="contenido-cabecera">
        <span className="contenido-eyebrow">Propietarios</span>
        <h1>Guía de precios</h1>
        <p className="contenido-intro">
          Fijar el precio correcto es la decisión más importante al publicar. Esta guía te
          explica qué factores considerar y cómo posicionarte frente al mercado.
        </p>
      </header>

      <section className="contenido-bloque">
        <h2>Factores que definen el precio</h2>
        <ul>
          <li>
            <strong>Ubicación:</strong> colonia, cercanía a servicios, transporte, escuelas y
            seguridad.
          </li>
          <li>
            <strong>Tamaño y distribución:</strong> metros de construcción y de terreno,
            recámaras, baños y espacios comunes.
          </li>
          <li>
            <strong>Estado del inmueble:</strong> antigüedad, mantenimiento, acabados y
            remodelaciones recientes.
          </li>
          <li>
            <strong>Amenidades:</strong> estacionamiento, jardín, áreas verdes, alberca,
            seguridad o vista.
          </li>
          <li>
            <strong>Mercado:</strong> oferta y demanda de propiedades comparables en la misma
            zona.
          </li>
        </ul>
      </section>

      <section className="contenido-bloque">
        <h2>Cómo estimar tu precio</h2>
        <ol>
          <li>
            <strong>Reúne comparables:</strong> busca propiedades parecidas ya publicadas en tu
            zona y anota su precio por metro cuadrado.
          </li>
          <li>
            <strong>Ajusta por diferencias:</strong> si tu propiedad tiene mejor estado,
            ubicación o amenidades, ajusta al alza; si le faltan o requieren inversión, ajusta a
            la baja.
          </li>
          <li>
            <strong>Define un rango:</strong> publica con un precio de salida cercano al tope del
            rango y deja margen para negociar.
          </li>
          <li>
            <strong>Mide y ajusta:</strong> revisa cuántos interesados recibes. Si en las
            primeras semanas no hay contactos, el precio puede estar por encima del mercado.
          </li>
        </ol>
      </section>

      <section className="contenido-bloque">
        <h2>Factores que acercan o alejan interesados</h2>
        <table className="contenido-tabla">
          <thead>
            <tr>
              <th>Factor</th>
              <th>Efecto sobre el precio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ubicación consolidada y bien conectada</td>
              <td>Incrementa el valor</td>
            </tr>
            <tr>
              <td>Estacionamiento cubierto</td>
              <td>Incrementa el valor</td>
            </tr>
            <tr>
              <td>Espacios renovados recientemente</td>
              <td>Incrementa el valor</td>
            </tr>
            <tr>
              <td>Requerir inversión o remodelación</td>
              <td>Reduce el valor</td>
            </tr>
            <tr>
              <td>Servicios incompletos en la zona</td>
              <td>Reduce el valor</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="contenido-bloque">
        <h2>Errores comunes</h2>
        <ul>
          <li>Basarte solo en lo que «se dice» en la zona sin revisar comparables reales.</li>
          <li>Publicar sin fotos de calidad o con poca información de características.</li>
          <li>No especificar reglas y condiciones (depósito, requisitos, uso permitido).</li>
          <li>Dejar el anuncio sin responder a los interesados.</li>
        </ul>
      </section>

      <div className="contenido-aviso">
        Esta guía es orientativa y no constituye un avalúo profesional. Para una valuación
        formal, consulta a un perito valuador certificado.
      </div>

      <section className="contenido-bloque">
        <h2>Publica tu propiedad con confianza</h2>
        <p>Verifica tu identidad y publica con toda la información que los interesados buscan.</p>
        <Link href="/registro" className="contenido-cta">
          Empezar a publicar
        </Link>
      </section>
    </article>
  );
}
