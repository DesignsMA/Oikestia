import Link from "next/link";
import { Icon } from "./IconSprite";

/** Pie de página idéntico al legacy (.homepage-footer). */
export default function Footer() {
  return (
    <footer className="homepage-footer">
      <div className="footer-content">
        <div className="footer-brand">
          <img src="/images/logo.svg" alt="Oikestia Logo" width={100} className="logo" />
          <p>
            Encuentra, compara y publica propiedades en un solo lugar. Cada propietario que publica
            en Oikestia pasa por nuestro proceso de verificación.
          </p>

          <div className="footer-social">
            <Link href="/contacto" aria-label="Facebook">
              <Icon name="i-facebook" />
            </Link>
            <Link href="/contacto" aria-label="Instagram">
              <Icon name="i-instagram" />
            </Link>
            <Link href="/contacto" aria-label="X">
              <Icon name="i-x" />
            </Link>
          </div>
        </div>

        <div className="footer-column">
          <h3>Explorar</h3>
          <Link href="/publicaciones">Publicaciones</Link>
          <Link href="/publicaciones?tipo=casa">Casas</Link>
          <Link href="/publicaciones?tipo=departamento">Departamentos</Link>
          <Link href="/publicaciones?tipo=terreno">Terrenos</Link>
        </div>

        <div className="footer-column">
          <h3>Propietarios</h3>
          <Link href="/registro">Publicar una propiedad</Link>
          <Link href="/propietario">Proceso de verificación</Link>
          <Link href="/guia-de-precios">Guía de precios</Link>
        </div>

        <div className="footer-column">
          <h3>Oikestia</h3>
          <Link href="/sobre-nosotros">Sobre nosotros</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contacto">Contacta a Soporte</Link>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Oikestia. Todos los derechos reservados.</p>

        <nav>
          <Link href="/privacidad">Política de Privacidad</Link>
          <Link href="/terminos">Términos de Servicio</Link>
          <Link href="/cookies">Aviso de Cookies</Link>
        </nav>
      </div>
    </footer>
  );
}
