import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPorSlugDelOwner } from "@/lib/listings";
import AsistentePublicacion, { type PublicacionInicial } from "@/components/AsistentePublicacion";
import "@/app/styles/homepage.css";
import "@/app/styles/intereses.css";
import "@/app/styles/panel.css";

export const metadata: Metadata = {
  title: "Nueva publicación",
  description: "Asistente de publicación de propiedades en Oikestia.",
};

export const dynamic = "force-dynamic";

/** Serializa la publicación existente para el asistente en modo edición. */
function serializar(
  doc: NonNullable<Awaited<ReturnType<typeof getPorSlugDelOwner>>>
): PublicacionInicial {
  return {
    id: String(doc._id),
    slug: doc.slug,
    titulo: doc.titulo,
    operacion: doc.operacion,
    tipoPropiedad: doc.tipoPropiedad,
    precio: doc.precio,
    descripcion: doc.descripcion,
    direccion: doc.direccion,
    ubicacion: doc.ubicacion ?? null,
    caracteristicas: (doc.caracteristicas ?? {}) as Record<string, unknown>,
    amenidades: doc.amenidades ?? [],
    amenidadesLibres: doc.amenidadesLibres ?? [],
    reglas: doc.reglas ?? null,
    estado: doc.estado,
    fotos: (doc.fotos ?? []).map((f) => ({ fileId: f.fileId ?? null, url: f.url, alt: f.alt })),
  };
}

/** Asistente de publicación: 6 pasos + revisión. Alta o edición. Solo propietarios. */
export default async function PublicarPage({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  if (user.rol !== "owner") {
    return (
      <section className="discover-section">
        <h2>Nueva publicación</h2>
        <p>
          Solo las cuentas de propietario pueden publicar. Crea una en{" "}
          <Link href="/registro" className="link">
            registro
          </Link>{" "}
          eligiendo «Propietario».
        </p>
      </section>
    );
  }

  const autoVerify = process.env.DEV_AUTO_VERIFY === "true";
  if (!user.verificado && !autoVerify) {
    return (
      <section className="discover-section">
        <h2>Nueva publicación</h2>
        <p>
          Tu cuenta aún no está verificada. Primero verifícate con tu nombre y tu INE desde{" "}
          <Link href="/cuenta/verificacion" className="link">
            verificación
          </Link>
          .
        </p>
      </section>
    );
  }

  const { editar } = await searchParams;
  const doc = editar ? await getPorSlugDelOwner(editar, user.id) : null;
  if (editar && !doc) {
    return (
      <section className="discover-section">
        <h2>Editar publicación</h2>
        <p>No encontramos esa publicación en tu cuenta.</p>
        <Link href="/propietario" className="link">
          Volver al panel
        </Link>
      </section>
    );
  }

  return (
    <section className="discover-section panel-section">
      <div className="panel-head">
        <h2>{doc ? "Editar publicación" : "Nueva publicación"}</h2>
        <Link href="/propietario" className="publish-btn">
          Volver al panel
        </Link>
      </div>
      <AsistentePublicacion inicial={doc ? serializar(doc) : undefined} />
    </section>
  );
}
