import Link from "next/link";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import "@/app/styles/cuenta.css";
import { getSessionUser } from "@/lib/auth";
import { getCollections } from "@/lib/db";

const MENSAJES_ERROR: Record<string, string> = {
  "3": "Revisa las opciones e inténtalo de nuevo.",
  "429": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
  "5": "No se pudo guardar. Intenta de nuevo.",
};

export default async function CuentaContactoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  const { ok, error } = await searchParams;
  const mensajeError = error ? MENSAJES_ERROR[error] ?? MENSAJES_ERROR["5"] : null;

  const { users } = await getCollections();
  const doc = (await users.findOne(
    { _id: new ObjectId(user.id) },
    { projection: { compartir: 1 } }
  )) as { compartir?: { correo?: boolean; telefono?: boolean; redes?: boolean } } | null;
  const compartir = {
    correo: doc?.compartir?.correo ?? true,
    telefono: doc?.compartir?.telefono ?? false,
    redes: doc?.compartir?.redes ?? false,
  };

  return (
    <section className="cuenta">
      <h1>Datos de contacto</h1>

      {ok && (
        <p className="cuenta-aviso cuenta-aviso-ok" role="status">Preferencias guardadas.</p>
      )}
      {mensajeError && (
        <p className="cuenta-aviso cuenta-aviso-error" role="alert">{mensajeError}</p>
      )}

      <p className="cuenta-ayuda">
        Cuando escribes a un propietario, <strong>siempre</strong> ve tu foto y tu
        nombre. Además, con esta configuración podrá ver:
      </p>

      <form action="/api/cuenta/contacto" method="post" className="cuenta-form">
        <label className="cuenta-opcion">
          <input type="checkbox" name="correo" defaultChecked={compartir.correo} />
          <span>
            <strong>Tu correo</strong>
            <small>Para que puedan responderte fuera de Oikestia.</small>
          </span>
        </label>

        <label className="cuenta-opcion">
          <input type="checkbox" name="telefono" defaultChecked={compartir.telefono} />
          <span>
            <strong>Tu teléfono</strong>
            <small>Solo visible dentro de la conversación.</small>
          </span>
        </label>

        <label className="cuenta-opcion">
          <input type="checkbox" name="redes" defaultChecked={compartir.redes} />
          <span>
            <strong>Tus redes sociales</strong>
            <small>Instagram, Facebook o X que tengas en tu perfil.</small>
          </span>
        </label>

        <div className="cuenta-acciones">
          <button type="submit" className="cuenta-guardar">Guardar preferencias</button>
          <Link className="cuenta-enlace" href="/cuenta">Volver a mi cuenta</Link>
        </div>
      </form>
    </section>
  );
}
