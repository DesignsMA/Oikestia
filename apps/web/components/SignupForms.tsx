"use client";

import { useState } from "react";

/** Formularios de registro (usuario / propietario) con cambio de rol. */
export default function SignupForms() {
  const [role, setRole] = useState<"user" | "owner">("user");
  const isUser = role === "user";

  return (
    <>
      <div className="signup-switch-role">
        <button
          type="button"
          className={`signup-switch-role-btn ${isUser ? "signup-switch-role-active" : "signup-switch-role-inactive"}`}
          onClick={() => setRole("user")}
        >
          Soy un usuario
        </button>
        <button
          type="button"
          className={`signup-switch-role-btn ${isUser ? "signup-switch-role-inactive" : "signup-switch-role-active"}`}
          onClick={() => setRole("owner")}
        >
          Soy un propietario
        </button>
      </div>

      {isUser ? (
        <form action="/api/auth/registro" method="post" className="signup-form-user">
          <fieldset className="signup-fieldset">
            <label htmlFor="user-username">Nombre de usuario</label>
            <div className="signup-name">
              <input
                type="text"
                id="user-username"
                name="username"
                placeholder="nombre_usuario"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="username"
              />
            </div>

            <label htmlFor="user-email">Email</label>
            <div className="signup-email">
              <input type="email" id="user-email" name="email" placeholder="nombre@gmail.com" required autoComplete="email" />
            </div>

            <label htmlFor="user-tel">Teléfono de contacto (opcional)</label>
            <div className="signup-name">
              <input
                type="tel"
                id="user-tel"
                name="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+52 123 456 7890"
                pattern="^\+?[0-9\s()\-]{8,20}$"
                minLength={8}
                maxLength={20}
              />
            </div>

            <label htmlFor="user-password">Contraseña</label>
            <div className="signup-password">
              <input
                type="password"
                id="user-password"
                name="password"
                required
                minLength={10}
                autoComplete="new-password"
                aria-describedby="password-hint"
              />
            </div>
            <p id="password-hint" className="signup-hint">
              Mínimo 10 caracteres.
            </p>

            <label htmlFor="user-confirm-password">Confirmar contraseña</label>
            <div className="signup-password">
              <input
                type="password"
                id="user-confirm-password"
                name="confirm-password"
                placeholder="Confirmar contraseña"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </div>
          </fieldset>
          <input type="submit" value="Registrarse como usuario" />
        </form>
      ) : (
        <form action="/api/auth/registro" method="post" className="signup-form-owner">
          <div className="signup-verification-info">
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
              className="icon icon-tabler icons-tabler-outline icon-tabler-id"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 7a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3l0 -10" />
              <path d="M7 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
              <path d="M15 8l2 0" />
              <path d="M15 12l2 0" />
              <path d="M7 16l10 0" />
            </svg>
            <div>
              <h4>Proceso de verificación</h4>
              <p>
                Para registrarte como propietario, es necesario que completes un proceso de
                verificación de identidad. Esto nos ayuda a garantizar la seguridad y confiabilidad
                de nuestra plataforma.
              </p>
            </div>
          </div>
          <fieldset className="signup-fieldset">
            <label htmlFor="owner-fullname">Nombre completo</label>
            <div className="signup-name">
              <input
                type="text"
                id="owner-fullname"
                name="fullname"
                placeholder="Nombre completo según documento oficial"
                required
                autoComplete="name"
              />
            </div>

            <label htmlFor="owner-username">Nombre de usuario</label>
            <div className="signup-name">
              <input
                type="text"
                id="owner-username"
                name="username"
                placeholder="nombre_usuario"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="username"
              />
            </div>

            <label htmlFor="owner-email">Email</label>
            <div className="signup-email">
              <input type="email" id="owner-email" name="email" placeholder="nombre@gmail.com" required autoComplete="email" />
            </div>

            <label htmlFor="owner-tel">Teléfono de contacto</label>
            <div className="signup-name">
              <input
                type="tel"
                id="owner-tel"
                name="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+52 123 456 7890"
                pattern="^\+?[0-9\s()\-]{8,20}$"
                minLength={8}
                maxLength={20}
                required
              />
            </div>

            <label htmlFor="owner-password">Contraseña</label>
            <div className="signup-password">
              <input
                type="password"
                id="owner-password"
                name="password"
                required
                minLength={10}
                autoComplete="new-password"
                aria-describedby="owner-password-hint"
              />
            </div>
            <p id="owner-password-hint" className="signup-hint">
              Mínimo 10 caracteres.
            </p>

            <label htmlFor="owner-confirm-password">Confirmar contraseña</label>
            <div className="signup-password">
              <input
                type="password"
                id="owner-confirm-password"
                name="confirm-password"
                placeholder="Confirmar contraseña"
                required
                minLength={10}
                autoComplete="new-password"
              />
            </div>
          </fieldset>
          <input type="submit" value="Comenzar verificación" />
        </form>
      )}
    </>
  );
}
