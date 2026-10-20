import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { listarFavoritos } from "@/lib/favoritos";
import { formatearPrecio, caracteristicasDe, type ListingDoc } from "@/lib/listings";
import ListingCardCompact from "@/components/ListingCardCompact";
import "@/app/styles/homepage.css";
import "@/app/styles/card-compact.css";

export const metadata: Metadata = {
  title: "Favoritos",
  description: "Las propiedades que guardaste en Oikestia.",
};

export const dynamic = "force-dynamic";

function featuresDe(l: ListingDoc) {
  return caracteristicasDe(l).map((c) => ({ icon: c.icon, label: c.label ? `${c.value} ${c.label}` : c.value }));
}

/** Favoritos del usuario: propiedades guardadas, más recientes primero. */
export default async function FavoritosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?error=sesion");

  const items = await listarFavoritos();

  return (
    <section className="discover-section">
      <div className="panel-head">
        <h2>Favoritos</h2>
        <Link href="/cuenta" className="panel-btn">
          Volver a mi cuenta
        </Link>
      </div>
      <p className="panel-subtitulo">
        {items.length > 0
          ? `${items.length} ${items.length === 1 ? "propiedad guardada" : "propiedades guardadas"}.`
          : "Aún no has guardado propiedades."}
      </p>

      {items.length === 0 ? (
        <p>
          Explora el{" "}
          <Link href="/publicaciones" className="link">
            catálogo
          </Link>{" "}
          y toca el corazón para guardar tus favoritas.
        </p>
      ) : (
        <div className="discover-listings">
          {items.map((l) => (
            <ListingCardCompact
              key={l.slug}
              href={`/publicaciones/${l.slug}`}
              image={l.fotos[0]?.url ?? "/images/property1.webp"}
              imageAlt={l.fotos[0]?.alt ?? l.titulo}
              price={formatearPrecio(l.precio, l.operacion)}
              title={l.titulo}
              location={`${l.direccion.colonia}, ${l.direccion.ciudad}, ${l.direccion.estado}.`}
              features={featuresDe(l)}
              tag={l.tipoPropiedad === "terreno" ? "Terreno" : undefined}
              slug={l.slug}
              favorito
              logueado
            />
          ))}
        </div>
      )}
    </section>
  );
}
