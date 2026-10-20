import type { Metadata } from "next";
import "@/app/styles/legal.css";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Cómo Oikestia recopila, usa y protege tus datos personales, y los derechos que tienes sobre ellos.",
};

const ACTUALIZADO = "19 de octubre de 2026";

/** Política de privacidad. */
export default function PrivacidadPage() {
  return (
    <article className="contenido">
      <header className="contenido-cabecera">
        <span className="contenido-eyebrow">Legal</span>
        <h1>Política de Privacidad</h1>
        <p className="contenido-intro">
          Tu privacidad es importante. Aquí explicamos qué datos recopilamos, para qué los usamos
          y cómo los protegemos.
        </p>
      </header>

      <section className="contenido-bloque">
        <h2>1. Datos que recopilamos</h2>
        <ul>
          <li>
            <strong>Datos de cuenta:</strong> nombre de usuario, correo electrónico y, si lo
            proporcionas, teléfono y redes sociales.
          </li>
          <li>
            <strong>Datos de verificación:</strong> nombre e identificación oficial (INE) de los
            propietarios, almacenados de forma cifrada.
          </li>
          <li>
            <strong>Datos de las publicaciones:</strong> información de las propiedades, fotos y
            reglas que decides publicar.
          </li>
          <li>
            <strong>Datos de uso:</strong> métricas agregadas y anónimas de interacción con las
            publicaciones.
          </li>
        </ul>
      </section>

      <section className="contenido-bloque">
        <h2>2. Cómo usamos tus datos</h2>
        <p>
          Utilizamos tus datos para operar la plataforma: mostrarte propiedades, permitir el
          contacto entre interesados y propietarios, verificar identidades, prevenir fraudes y
          mejorar el servicio.
        </p>
        <p>
          Las métricas de interacción se agregan de forma anónima: no asociamos el uso de las
          publicaciones con tu identidad.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>3. Con quién compartimos información</h2>
        <p>
          Compartimos tu foto y tu nombre con la persona con quien contactas, y los datos
          adicionales (correo, teléfono o redes) solo si activas esa opción. No vendemos tus
          datos personales a terceros.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>4. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas para proteger tu información, incluyendo el cifrado de datos
          sensibles como la identificación oficial. Ningún sistema es completamente infalible, por
          lo que te pedimos usar contraseñas seguras.
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>5. Tus derechos</h2>
        <p>
          Puedes acceder, corregir o eliminar tu información, así como solicitar la baja de tu
          cuenta. Para ejercer estos derechos, escríbenos a{" "}
          <a className="link" href="mailto:soporte@oikestia.mx">
            soporte@oikestia.mx
          </a>
          .
        </p>
      </section>

      <section className="contenido-bloque">
        <h2>6. Cambios a esta política</h2>
        <p>
          Podemos actualizar esta política para reflejar cambios en nuestras prácticas. Cuando lo
          hagamos, actualizaremos la fecha de esta página.
        </p>
      </section>

      <p className="contenido-fecha">Última actualización: {ACTUALIZADO}</p>
    </article>
  );
}
