import Link from "next/link";
import { redirect } from "next/navigation";
import "@/app/styles/cuenta.css";
import { getSessionUser } from "@/lib/auth";
import VerificacionIne from "@/components/VerificacionIne";

/** Verificación de identidad (nombre + INE): habilita permisos de propietario. */
export default async function CuentaVerificacionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  const esOwner = user.rol === "owner";

  return (
    <section className="cuenta">
      <h1>{esOwner ? "Verificación de identidad" : "Habilitar cuenta de propietario"}</h1>

      <div className="cuenta-bloque">
        <h2>Tu nombre y tu INE</h2>
        <p className="cuenta-ayuda">
          {esOwner
            ? "Sube una foto de tu identificación oficial para poder publicar propiedades. Tu documento se guarda de forma cifrada."
            : "Al verificarte, tu cuenta actual adquiere permisos de propietario para publicar propiedades. Tu documento se guarda de forma cifrada."}
        </p>
        <VerificacionIne yaVerificado={user.verificado} />
      </div>

      <div className="cuenta-bloque">
        <Link className="cuenta-enlace" href="/cuenta">Volver a mi cuenta</Link>
      </div>
    </section>
  );
}
