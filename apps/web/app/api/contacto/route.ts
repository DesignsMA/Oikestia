import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, ensureIndexes } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { contactoSchema } from "@/lib/validators";
import { getSessionUser } from "@/lib/auth";
import { consumir, HORA } from "@/lib/rate-limit";
import { cuerpoEnLimites, destino, ipDe } from "@/lib/guardas";

/** Lead desde la ficha (form plain): redirige con ?enviado=1 o ?error=. */
export async function POST(req: NextRequest) {
  if (!cuerpoEnLimites(req, 64 * 1024)) {
    return NextResponse.redirect(destino(req, "/publicaciones?error=1"), 303);
  }
  const porIp = await consumir(`contacto:${ipDe(req)}`, 10, HORA);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.redirect(destino(req, "/publicaciones?error=1"), 303);
  }

  const raw = {
    listing: form.get("listing")?.toString() ?? "",
    fullname: form.get("fullname")?.toString() ?? "",
    email: form.get("email")?.toString() ?? "",
    message: form.get("message")?.toString() ?? "",
    tipo: form.get("tipo")?.toString() ?? "mensaje",
  };

  if (!porIp.permitido) {
    const ruta = raw.listing ? `/publicaciones/${raw.listing}` : "/publicaciones";
    const aviso = encodeURIComponent("Demasiados mensajes enviados. Inténtalo más tarde.");
    return NextResponse.redirect(destino(req, `${ruta}?error=${aviso}`), 303);
  }

  const parsed = contactoSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0].message);
    return NextResponse.redirect(destino(req, `/publicaciones/${raw.listing}?error=${msg}`), 303);
  }

  try {
    await ensureIndexes();
    const { listings, leads, messages } = await getCollections();

    const listing = await listings.findOne(
      { slug: parsed.data.listing },
      { projection: { _id: 1, titulo: 1 } }
    );
    if (!listing) {
      return NextResponse.redirect(destino(req, "/publicaciones?error=1"), 303);
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

    // El mensaje inicial siembra el hilo de la conversación.
    await messages.insertOne({
      leadId: res.insertedId,
      emisorId: session ? new ObjectId(session.id) : null,
      emisorNombre: fullname,
      texto: parsed.data.message.trim(),
      creado: ahora,
    });

    const ok = encodeURIComponent("Mensaje enviado. El propietario te contactará pronto.");
    return NextResponse.redirect(
      destino(req, `/publicaciones/${parsed.data.listing}?enviado=${ok}`),
      303
    );
  } catch (e) {
    console.error("contacto", e);
    return NextResponse.redirect(destino(req, `/publicaciones/${raw.listing}?error=1`), 303);
  }
}
