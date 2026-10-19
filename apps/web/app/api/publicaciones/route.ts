import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, ensureIndexes } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { listingSchema } from "@/lib/validators";
import { slugUnico, slugify, getPublicadas, type ListingDoc } from "@/lib/listings";
import { geocodificarDireccion } from "@/lib/geocode";
import { subirArchivo, maxImagenesPorPublicacion, maxUploadBytes } from "@/lib/storage";
import { consumir, HORA } from "@/lib/rate-limit";
import { cuerpoEnLimites } from "@/lib/guardas";

/** Listado público de publicaciones (JSON). */
export async function GET() {
  try {
    const items = await getPublicadas();
    return NextResponse.json({ ok: true, items: items.map(simplificar) });
  } catch (e) {
    console.error("publicaciones GET", e);
    return NextResponse.json({ ok: false, error: "No se pudo cargar el catálogo" }, { status: 500 });
  }
}

function simplificar(l: ListingDoc) {
  return {
    slug: l.slug,
    titulo: l.titulo,
    operacion: l.operacion,
    tipoPropiedad: l.tipoPropiedad,
    precio: l.precio,
    moneda: l.moneda,
    direccion: l.direccion,
    caracteristicas: l.caracteristicas,
    amenidades: l.amenidades,
    fotos: l.fotos,
    estado: l.estado,
    actualizado: l.actualizado,
  };
}

/**
 * Crea una publicación (multipart: campos planos + archivos repetidos en
 * "fotos"). Solo propietarios verificados (o con DEV_AUTO_VERIFY en dev).
 * El asistente de /propietario/publicar la envía con fetch y recibe JSON.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión para publicar" }, { status: 401 });
  }
  if (user.rol !== "owner") {
    return NextResponse.json(
      { ok: false, error: "Solo las cuentas de propietario pueden publicar" },
      { status: 403 }
    );
  }
  if (!cuerpoEnLimites(req, maxImagenesPorPublicacion() * maxUploadBytes() + 1024 * 1024)) {
    return NextResponse.json({ ok: false, error: "Las imágenes superan el tamaño total permitido" }, { status: 413 });
  }
  const porUsuario = await consumir(`publicacion:${user.id}`, 20, HORA);
  if (!porUsuario.permitido) {
    return NextResponse.json(
      { ok: false, error: "Demasiadas publicaciones. Inténtalo más tarde." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  // Verificación: en dev DEV_AUTO_VERIFY=true se omite el bloqueo.
  const autoVerify = process.env.DEV_AUTO_VERIFY === "true";
  if (!user.verificado && !autoVerify) {
    return NextResponse.json(
      { ok: false, error: "Tu cuenta aún no está verificada. Sube tu documento de identidad en el panel.", requiereVerificacion: true },
      { status: 403 }
    );
  }

  const fotos = form.getAll("fotos").filter((f): f is File => f instanceof File);
  if (fotos.length === 0) {
    return NextResponse.json({ ok: false, error: "Sube al menos una foto", campo: "fotos" }, { status: 400 });
  }
  if (fotos.length > maxImagenesPorPublicacion()) {
    return NextResponse.json(
      { ok: false, error: `Máximo ${maxImagenesPorPublicacion()} fotos por publicación`, campo: "fotos" },
      { status: 400 }
    );
  }

  const raw: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string" && k !== "amenidades") raw[k] = v;
  }
  // Los campos repetidos (amenidades) se recogen con getAll.
  const parsed = listingSchema.safeParse({
    ...raw,
    amenidades: form.getAll("amenidades").filter((v): v is string => typeof v === "string"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue.message, campo: issue.path.join(".") },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    await ensureIndexes();
    const { listings } = await getCollections();

    const slug = await slugUnico(slugify(data.titulo));
    const subidas = [];
    for (const [i, file] of fotos.entries()) {
      const up = await subirArchivo(file, "fotos", { slug, orden: i, owner: user.id });
      subidas.push({
        fileId: up.fileId,
        url: `/api/fotos/${up.fileId}`,
        alt: `${data.titulo} — foto ${i + 1}`,
      });
    }

    const ahora = new Date();
    const doc = {
      slug,
      titulo: data.titulo,
      operacion: data.operacion,
      tipoPropiedad: data.tipoPropiedad,
      precio: data.precio,
      moneda: "MXN" as const,
      descripcion: data.descripcion,
      direccion: {
        calle: data.calle,
        colonia: data.colonia,
        ciudad: data.ciudad,
        estado: data.estado,
        cp: data.cp,
      },
      caracteristicas: {
        recamaras: data.recamaras,
        banos: data.banos,
        cocheras: data.cocheras,
        construccionM2: data.construccionM2,
        terrenoM2: data.terrenoM2,
      },
      amenidades: data.amenidades,
      fotos: subidas,
      owner: ObjectId.createFromHexString(user.id),
      estado: "publicada" as const,
      creado: ahora,
      actualizado: ahora,
      publicadoEn: ahora,
    };

    const res = await listings.insertOne(doc as unknown as ListingDoc);

    // Geocodificación en segundo plano (cascada de ~3 intentos a 1 req/s):
    // la respuesta no espera el mapa y, si Nominatim no encuentra la
    // dirección, la ficha muestra solo el texto.
    void geocodificarDireccion(doc.direccion)
      .then(async (coords) => {
        if (coords) {
          await listings.updateOne({ _id: res.insertedId }, { $set: { ubicacion: { type: "Point", coords } } });
        }
      })
      .catch((e) => console.warn("geocode store", e));

    return NextResponse.json({ ok: true, slug }, { status: 201 });
  } catch (e) {
    console.error("publicaciones POST", e);
    return NextResponse.json(
      { ok: false, error: "No se pudo crear la publicación. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
