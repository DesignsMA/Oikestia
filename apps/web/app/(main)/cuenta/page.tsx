import Link from "next/link";
import { redirect } from "next/navigation";
import "@/app/styles/cuenta.css";
import { getSessionUser } from "@/lib/auth";
import { ultimaVerificacion } from "@/lib/verificaciones";

const MENSAJES_ERROR: Record<string, string> = {
  "3": "Revisa el nombre: máximo 60 caracteres.",
  "413": "La imagen supera el tamaño máximo permitido.",
  "429": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  archivo: "Usa una imagen JPG, PNG, WEBP, AVIF o GIF de menos de 10 MB.",
  "5": "No se pudo guardar. Intenta de nuevo.",
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  const { ok, error } = await searchParams;
  const avatarUrl = user.avatarFileId
    ? `/api/fotos/${user.avatarFileId}`
    : "/images/user-placeholder.webp";
  const mensajeError = error ? MENSAJES_ERROR[error] ?? MENSAJES_ERROR["5"] : null;

  const autoVerify = process.env.DEV_AUTO_VERIFY === "true";
  const verificacion = await ultimaVerificacion(user.id, user.verificado);
  const estadoVerif =
    verificacion.estado === "verificado"
      ? "Verificada"
      : verificacion.estado === "pendiente"
        ? "En revisión"
        : verificacion.estado === "rechazado"
          ? "Rechazada"
          : "Sin iniciar";
  const esOwner = user.rol === "owner";
  // Un usuario normal puede habilitar permisos de propietario verificándose.
  const puedeVerificarse = !user.verificado && (!esOwner || !autoVerify);

  return (
    <section className="cuenta">
      <h1>Mi cuenta</h1>

      {ok && (
        <p className="cuenta-aviso cuenta-aviso-ok" role="status">Cambios guardados.</p>
      )}
      {mensajeError && (
        <p className="cuenta-aviso cuenta-aviso-error" role="alert">{mensajeError}</p>
      )}

      <div className="cuenta-bloque">
        <h2>Foto de perfil</h2>
        <div className="cuenta-avatar">
          <img src={avatarUrl} alt="Tu foto de perfil" width={96} height={96} />
          <form action="/api/cuenta/avatar" method="post" encType="multipart/form-data">
            <label className="cuenta-archivo">
              <input
                type="file"
                name="avatar"
                accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
                required
              />
              <span>Elegir imagen</span>
            </label>
            <button type="submit" className="cuenta-guardar">Guardar foto</button>
          </form>
        </div>
        <p className="cuenta-ayuda">JPG, PNG, WEBP, AVIF o GIF. Máximo 10 MB.</p>
      </div>

      <div className="cuenta-bloque">
        <h2>Nombre visible</h2>
        <p className="cuenta-ayuda">
          Es el nombre que verán los propietarios cuando les escribas. Si lo dejas
          vacío se usará tu usuario ({user.username}).
        </p>
        <form action="/api/cuenta" method="post" className="cuenta-form">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            maxLength={60}
            defaultValue={user.nombre ?? ""}
            placeholder={user.username}
          />
          <button type="submit" className="cuenta-guardar">Guardar nombre</button>
        </form>
      </div>

      <div className="cuenta-bloque">
        <h2>Datos de contacto</h2>
        <p className="cuenta-ayuda">
          Tú decides qué compartir con el propietario cuando lo contactes.
        </p>
        <Link className="cuenta-enlace" href="/cuenta/contacto">
          Qué comparto al contactar
        </Link>
      </div>

      <div className="cuenta-bloque">
        <h2>Favoritos</h2>
        <p className="cuenta-ayuda">
          Tus propiedades guardadas. También se usan para personalizar las recomendaciones.
        </p>
        <Link className="cuenta-enlace" href="/cuenta/favoritos">
          Ver mis favoritos
        </Link>
      </div>

      <div className="cuenta-bloque">
        <h2>{esOwner ? "Verificación" : "Cuenta de propietario"}</h2>

        {esOwner ? (
          <p className="cuenta-ayuda">
            Estado actual: <strong>{estadoVerif}</strong>.
            {autoVerify && " (modo desarrollo: verificada automáticamente)."}
          </p>
        ) : (
          <p className="cuenta-ayuda">
            Para publicar propiedades necesitas habilitar los permisos de propietario.
            Verifícate con tu nombre completo y tu INE; no necesitas crear otra cuenta.
          </p>
        )}

        {puedeVerificarse ? (
          <>
            <p className="cuenta-ayuda">
              {esOwner
                ? "Sube una foto de tu identificación oficial para poder publicar propiedades."
                : "Al verificarte, tu cuenta adquiere permisos de propietario."}
            </p>
            <Link className="cuenta-enlace" href="/cuenta/verificacion">
              {esOwner ? "Iniciar verificación" : "Habilitar cuenta de propietario"}
            </Link>
          </>
        ) : (
          !esOwner && (
            <p className="cuenta-ayuda">
              Tu cuenta ya tiene permisos de propietario.
            </p>
          )
        )}
      </div>

      <div className="cuenta-bloque">
        <h2>Cuenta</h2>
        <dl className="cuenta-datos">
          <div>
            <dt>Usuario</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{user.rol === "owner" ? "Propietario" : "Usuario"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
