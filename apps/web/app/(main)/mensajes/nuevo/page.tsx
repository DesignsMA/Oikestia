import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getPorSlug, formatearPrecio, direccionCompleta } from "@/lib/listings";
import { conversacionDePublicacion } from "@/lib/mensajes";
import BorradorMensaje from "@/components/BorradorMensaje";
import "@/app/styles/homepage.css";
import "@/app/styles/panel.css";
import "@/app/styles/mensaje-nuevo.css";

export const metadata: Metadata = {
  title: "Nuevo mensaje",
  description: "Envía un mensaje al propietario de una publicación en Oikestia.",
};

export const dynamic = "force-dynamic";

/** Borrador del primer mensaje: tarjeta de la publicación + cuadro de escritura. */
export default async function MensajeNuevoPage({
  searchParams,
}: {
  searchParams: Promise<{ publicacion?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  const { publicacion } = await searchParams;
  if (!publicacion) notFound();

  const listing = await getPorSlug(publicacion);
  if (!listing) notFound();

  if (String(listing.owner) === user.id) redirect(`/publicaciones/${publicacion}`);

  const existente = await conversacionDePublicacion(publicacion);
  if (existente) redirect(`/mensajes?lead=${existente}`);

  const foto = listing.fotos[0];

  return (
    <section className="discover-section panel-section">
      <div className="panel-head">
        <h2>Enviar mensaje</h2>
      </div>
      <p className="panel-subtitulo">
        El propietario verá tu foto y tu nombre, además de los datos que hayas elegido compartir en
        tu cuenta. Se crea la conversación al enviar el primer mensaje.
      </p>

      <div className="borrador">
        <a className="borrador-tarjeta" href={`/publicaciones/${listing.slug}`}>
          {foto && <img src={foto.url} alt={foto.alt} />}
          <div className="borrador-tarjeta-info">
            <strong>{listing.titulo}</strong>
            <span>{formatearPrecio(listing.precio, listing.operacion)}</span>
            <span className="borrador-tarjeta-dir">{direccionCompleta(listing.direccion)}</span>
          </div>
        </a>

        <BorradorMensaje slug={listing.slug} titulo={listing.titulo} />
      </div>
    </section>
  );
}
