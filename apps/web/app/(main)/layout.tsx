import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

/**
 * Layout de páginas con encabezado y pie (inicio, publicaciones, detalle).
 * Las páginas de acceso (/login, /registro) usan su propio layout de pantalla completa.
 */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
