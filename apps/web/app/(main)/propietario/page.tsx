import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPorOwner, formatearPrecio, type ListingDoc } from "@/lib/listings";
import PanelPublicaciones from "@/components/PanelPublicaciones";
import PanelVerificacion from "@/components/PanelVerificacion";
import "@/app/styles/homepage.css";
import "@/app/styles/intereses.css";
import "@/app/styles/panel.css";

export const metadata: Metadata = {
  title: "Propietarios",
  description: "Publica tu propiedad en Oikestia. Panel de propietarios y verificación.",
};

export const dynamic = "force-dynamic";

function serializar(l: ListingDoc) {
  return {
    id: String(l._id),
    slug: l.slug,
    titulo: l.titulo,
    estado: l.estado,
    precio: formatearPrecio(l.precio, l.operacion),
    operacion: l.operacion,
    foto: l.fotos[0]?.url ?? "/images/property1.webp",
    actualizado: l.actualizado.toISOString(),
  };
}

/** Panel del propietario: estado de verificación y publicaciones propias. */
export default async function PropietarioPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  if (user.rol !== "owner") {
    return (
      <section className="discover-section">
        <h2>Panel de propietarios</h2>
        <p>
          Tu cuenta actual es de usuario. Para publicar propiedades necesitas una cuenta de
          propietario: crea una en{" "}
          <a href="/registro" className="link">
            registro
          </a>{" "}
          eligiendo el perfil «Propietario».
        </p>
      </section>
    );
  }

  const items = await getPorOwner(user.id);
  const autoVerify = process.env.DEV_AUTO_VERIFY === "true";
  const puedePublicar = user.verificado || autoVerify;

  return (
    <section className="discover-section panel-section">
      <div className="panel-head">
        <h2>Panel de propietarios</h2>
        <div className="panel-head-acciones">
          <Link href="/propietario/interesados" className="panel-btn">
            Ver interesados
          </Link>
          <a href="/api/dashboard" className="panel-btn">
            Ver estadísticas
          </a>
          <Link href="/propietario/publicar" className={`publish-btn ${puedePublicar ? "" : "publish-btn-off"}`}>
            Nueva publicación
          </Link>
        </div>
      </div>

      {!puedePublicar ? (
        <div className="panel-aviso">
          <p>
            <strong>Tu cuenta aún no está verificada.</strong> Sube una foto de tu identificación
            oficial para que podamos revisarla; hasta entonces no puedes publicar.
          </p>
          <PanelVerificacion />
        </div>
      ) : (
        <p className="panel-estado-ok">
          {user.verificado
            ? "Cuenta verificada. Ya puedes publicar y administrar tus propiedades."
            : "Modo desarrollo: la verificación está omitida (DEV_AUTO_VERIFY). Ya puedes publicar."}
        </p>
      )}

      <h3 className="panel-subtitulo">Tus publicaciones ({items.length})</h3>
      <PanelPublicaciones items={items.map(serializar)} puedePausar={puedePublicar} />
    </section>
  );
}
