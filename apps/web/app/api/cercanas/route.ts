import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCollections } from "@/lib/db";
import { amenidadesCercanas } from "@/lib/overpass";

/** Amenidades cercanas a una publicación (Overpass). Solo publicadas. */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug")?.slice(0, 140);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Falta la publicación" }, { status: 400 });
  }
  try {
    const { listings } = await getCollections();
    const doc = (await listings.findOne(
      { slug, estado: "publicada" },
      { projection: { ubicacion: 1 } }
    )) as { ubicacion?: { coords: [number, number] } } | null;
    if (!doc?.ubicacion?.coords) {
      return NextResponse.json({ ok: true, items: [] });
    }
    const items = await amenidadesCercanas(doc.ubicacion.coords, 1000);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("cercanas", e);
    return NextResponse.json({ ok: true, items: [] });
  }
}
