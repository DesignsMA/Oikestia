import type { Metadata } from "next";
import SignupForms from "@/components/SignupForms";
import "@/app/styles/signup.css";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Crea una cuenta en Oikestia para acceder a todas las funcionalidades y encontrar tu hogar ideal.",
};

export default function SignupPage() {
  return (
    <main>
    <section className="signup-section">
      {/* Imagen introductoria de la plataforma */}
      <div className="signup-bg">
        <img src="/images/signup-bg.webp" alt="Interior moderno con vista al horizonte de una ciudad." />
        <div className="signup-bg-overlay">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-tabler icons-tabler-outline icon-tabler-geometry"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M7 21l4 -12m2 0l1.48 4.439m.949 2.847l1.571 4.714" />
            <path d="M10 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
            <path d="M4 12c1.526 2.955 4.588 5 8 5c3.41 0 6.473 -2.048 8 -5" />
            <path d="M12 5v-2" />
          </svg>
          <h1>Eleva tu perspectiva</h1>
          <p>Descubre tu hogar ideal y únete a nuestra comunidad de propietarios y compradores.</p>
        </div>
      </div>

      {/* Selección de perfil y formularios de registro */}
      <section className="signup-form-section">
        <h1 className="signup-form-title">Crear una cuenta</h1>
        <p>Selecciona el tipo de perfil que mejor te describe para continuar con el registro, podrás cambiarlo en cualquier momento.</p>

        <SignupForms />

        <div className="signup-login">
          <p>¿Ya tienes cuenta?</p> <a href="/login">Inicia sesión</a>
        </div>
      </section>
    </section>
    </main>
  );
}
