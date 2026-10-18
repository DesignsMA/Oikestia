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
            <a href="" aria-label="Facebook">
              <Icon name="i-facebook" />
            </a>
            <a href="" aria-label="Instagram">
              <Icon name="i-instagram" />
            </a>
            <a href="" aria-label="X">
              <Icon name="i-x" />
            </a>
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
          <a href="">Guía de precios</a>
        </div>

        <div className="footer-column">
          <h3>Oikestia</h3>
          <a href="">Sobre nosotros</a>
          <a href="">Blog</a>
          <a href="">Contacta a Soporte</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 Oikestia. Todos los derechos reservados.</p>

        <nav>
          <a href="">Política de Privacidad</a>
          <a href="">Términos de Servicio</a>
          <a href="">Aviso de Cookies</a>
        </nav>
      </div>
    </footer>
  );
}
