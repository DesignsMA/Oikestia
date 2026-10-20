import type { MetadataRoute } from "next";
import { getCollections } from "@/lib/db";

export const dynamic = "force-dynamic";

const BASE = (process.env.APP_PUBLIC_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Sitemap: páginas públicas fijas + fichas de publicaciones publicadas. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/publicaciones`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/sobre-nosotros`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/guia-de-precios`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/blog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/contacto`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/cookies`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const { listings } = await getCollections();
    const docs = await listings
      .find({ estado: "publicada" }, { projection: { slug: 1, actualizado: 1 } })
      .sort({ actualizado: -1 })
      .limit(5000)
      .toArray();
    const fichas: MetadataRoute.Sitemap = docs.map((d) => ({
      url: `${BASE}/publicaciones/${d.slug}`,
      lastModified: d.actualizado ? new Date(d.actualizado) : undefined,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
    return [...estaticas, ...fichas];
  } catch {
    return estaticas;
  }
}
