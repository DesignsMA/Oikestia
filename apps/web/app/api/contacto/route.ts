import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, ensureIndexes } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { contactoSchema } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";

/**
 * Lead desde la ficha de publicación: mensaje o solicitud de visita.
 * Form plain (sin JS): redirige de vuelta con ?enviado=1 o ?error=.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(new URL("/publicaciones?error=1", req.url), 303);
  }

  const raw = {
    listing: form.get("listing")?.toString() ?? "",
    fullname: form.get("fullname")?.toString() ?? "",
    email: form.get("email")?.toString() ?? "",
    message: form.get("message")?.toString() ?? "",
    tipo: form.get("tipo")?.toString() ?? "mensaje",
  };

  const parsed = contactoSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0].message);
    return NextResponse.redirect(new URL(`/publicaciones/${raw.listing}?error=${msg}`, req.url), 303);
  }

  try {
    await ensureIndexes();
    const { listings, leads, messages } = await getCollections();

    const listing = await listings.findOne(
      { slug: parsed.data.listing },
      { projection: { _id: 1, titulo: 1 } }
    );
    if (!listing) {
      return NextResponse.redirect(new URL("/publicaciones?error=1", req.url), 303);
    }

    const session = await getSessionUser();
    const email = parsed.data.email.trim().toLowerCase();
    const fullname = parsed.data.fullname.trim();
    const ahora = new Date();

    const res = await leads.insertOne({
      listingId: listing._id,
      listingSlug: parsed.data.listing,
      listingTitulo: listing.titulo,
      fullname,
      email,
      emailHash: sha256(email),
      message: parsed.data.message.trim(),
      tipo: parsed.data.tipo,
      userId: session ? session.id : null,
      creado: ahora,
      estado: "nuevo",
    });

    // El mensaje inicial siembra el hilo de la conversación (Fase 6).
    await messages.insertOne({
      leadId: res.insertedId,
      emisorId: session ? new ObjectId(session.id) : null,
      emisorNombre: fullname,
      texto: parsed.data.message.trim(),
      creado: ahora,
    });

    const ok = encodeURIComponent("Mensaje enviado. El propietario te contactará pronto.");
    return NextResponse.redirect(
      new URL(`/publicaciones/${parsed.data.listing}?enviado=${ok}`, req.url),
      303
    );
  } catch (e) {
    console.error("contacto", e);
    return NextResponse.redirect(new URL(`/publicaciones/${raw.listing}?error=1`, req.url), 303);
  }
}
