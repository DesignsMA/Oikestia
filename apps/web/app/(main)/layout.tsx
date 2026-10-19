import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "@/app/styles/footer.css";

/** Layout de páginas con encabezado y pie (las de acceso usan layout propio). */
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main id="contenido" className="site-main">{children}</main>
      <Footer />
    </>
  );
}
