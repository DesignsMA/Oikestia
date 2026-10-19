import type { Metadata } from "next";
import type { ReactNode } from "react";
import IconSprite from "@/components/IconSprite";
import "@/app/styles/tokens.css";
import "@/app/styles/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_PUBLIC_URL ?? "http://localhost:3000"),
  title: {
    default: "Oikestia",
    template: "%s | Oikestia",
  },
  description:
    "Plataforma inmobiliaria para encontrar, comprar, rentar y publicar propiedades en un solo lugar.",
  icons: {
    icon: "/images/logo.svg",
  },
  openGraph: {
    type: "website",
    title: "Oikestia",
    description:
      "Plataforma inmobiliaria para encontrar, comprar, rentar y publicar propiedades en un solo lugar.",
    images: ["/images/logo.svg"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#e96701" />
        <link rel="stylesheet" href="/normalize.css" />
      </head>
      <body>
        <IconSprite />
        {children}
      </body>
    </html>
  );
}
