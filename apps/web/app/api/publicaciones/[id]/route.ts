import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getCollections, ensureIndexes } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { listingSchema, reglasSchema } from "@/lib/validators";
import { slugUnico, slugify, type ListingDoc, type ListingFoto } from "@/lib/listings";
import { geocodificarDireccion } from "@/lib/geocode";
import { subirArchivo, borrarArchivos, maxImagenesPorPublicacion, maxUploadBytes } from "@/lib/storage";
import { cuerpoEnLimites } from "@/lib/guardas";

const ESTADOS = ["borrador", "publicada", "pausada", "vendida", "rentada"] as const;

/** Publicación del propietario para precargar el asistente de edición. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
  }

  await ensureIndexes();
  const { listings } = await getCollections();
  const doc = (await listings.findOne({ _id: new ObjectId(id) })) as ListingDoc | null;
  if (!doc) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
  if (String(doc.owner) !== user.id) {
    return NextResponse.json({ ok: false, error: "No es tu publicación" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    publicado: {
      id: String(doc._id),
      slug: doc.slug,
      titulo: doc.titulo,
      operacion: doc.operacion,
      tipoPropiedad: doc.tipoPropiedad,
      precio: doc.precio,
      descripcion: doc.descripcion,
      direccion: doc.direccion,
      ubicacion: doc.ubicacion ?? null,
      caracteristicas: doc.caracteristicas ?? {},
      amenidades: doc.amenidades ?? [],
      amenidadesLibres: doc.amenidadesLibres ?? [],
      reglas: doc.reglas ?? null,
      estado: doc.estado,
      fotos: (doc.fotos ?? []).map((f) => ({ fileId: f.fileId ?? null, url: f.url, alt: f.alt })),
    },
  });
}

/** Cambia el estado de la publicación del propietario en sesión. */
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
  }

  const { id, estado } = await req.json().catch(() => ({}));
  if (!id || !ObjectId.isValid(id) || !ESTADOS.includes(estado)) {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    const { listings } = await getCollections();
    const _id = new ObjectId(id);

    const doc = (await listings.findOne({ _id })) as ListingDoc | null;
    if (!doc) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    if (String(doc.owner) !== user.id) {
      return NextResponse.json({ ok: false, error: "No es tu publicación" }, { status: 403 });
    }

    const cambios: Record<string, unknown> = { estado, actualizado: new Date() };
    if (estado === "publicada" && !doc.publicadoEn) cambios.publicadoEn = new Date();

    await listings.updateOne({ _id }, { $set: cambios });
    return NextResponse.json({ ok: true, estado });
  } catch (e) {
    console.error("publicaciones PATCH", e);
    return NextResponse.json({ ok: false, error: "No se pudo actualizar" }, { status: 500 });
  }
}

/**
 * Actualiza una publicación (multipart): campos, reglas y fotos.
 * - `fotos`: archivos nuevos.
 * - `fotosExistentes`: JSON de fotos conservadas (fileId/url/alt), en orden.
 * Las fotos quitadas se borran de GridFS.
 */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión para editar" }, { status: 401 });
  }
  if (user.rol !== "owner") {
    return NextResponse.json(
      { ok: false, error: "Solo las cuentas de propietario pueden editar" },
      { status: 403 }
    );
  }
  if (!cuerpoEnLimites(req, maxImagenesPorPublicacion() * maxUploadBytes() + 1024 * 1024)) {
    return NextResponse.json({ ok: false, error: "Las imágenes superan el tamaño total permitido" }, { status: 413 });
  }

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido" }, { status: 400 });
  }

  const autoVerify = process.env.DEV_AUTO_VERIFY === "true";
  if (!user.verificado && !autoVerify) {
    return NextResponse.json(
      {
        ok: false,
        error: "Tu cuenta aún no está verificada. Sube tu documento de identidad en el panel.",
        requiereVerificacion: true,
      },
      { status: 403 }
    );
  }

  // Fotos existentes conservadas (enviadas como JSON).
  let fotosPrevias: ListingFoto[] = [];
  try {
    const raw = form.get("fotosExistentes");
    if (typeof raw === "string" && raw) {
      const arr = JSON.parse(raw) as { fileId?: string | null; url: string; alt: string }[];
      fotosPrevias = arr
        .filter((f) => f && typeof f.url === "string")
        .map((f) => ({ fileId: f.fileId ?? undefined, url: f.url, alt: f.alt || "" }));
    }
  } catch {
    /* fotosExistentes inválidas: se ignoran */
  }

  const fotosNuevas = form.getAll("fotos").filter((f): f is File => f instanceof File);
  if (fotosPrevias.length + fotosNuevas.length === 0) {
    return NextResponse.json({ ok: false, error: "Sube al menos una foto", campo: "fotos" }, { status: 400 });
  }
  if (fotosPrevias.length + fotosNuevas.length > maxImagenesPorPublicacion()) {
    return NextResponse.json(
      { ok: false, error: `Máximo ${maxImagenesPorPublicacion()} fotos por publicación`, campo: "fotos" },
      { status: 400 }
    );
  }

  const raw: Record<string, string> = {};
  const multi = ["amenidades", "amenidadesLibres", "espaciosAdicionales", "extras", "incluyeServicios", "requisitosOcupantes"];
  const bools = new Set(["amueblado", "aceptaMascotas", "fumaPermitido"]);
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string" || multi.includes(k) || k === "lat" || k === "lng") continue;
    if (bools.has(k)) {
      raw[k] = v === "true" || v === "on" || v === "1" ? "true" : "false";
      continue;
    }
    raw[k] = v;
  }
  const lista = (k: string) =>
    form.getAll(k).filter((v): v is string => typeof v === "string").map((s) => s.trim()).filter(Boolean);

  const parsed = listingSchema.safeParse({
    ...raw,
    amenidades: lista("amenidades"),
    amenidadesLibres: lista("amenidadesLibres"),
    espaciosAdicionales: lista("espaciosAdicionales"),
    extras: lista("extras"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ ok: false, error: issue.message, campo: issue.path.join(".") }, { status: 400 });
  }
  const data = parsed.data;

  const reglasParsed = reglasSchema.safeParse({
    amueblado: raw.amueblado === "true",
    aceptaMascotas: raw.aceptaMascotas === "true",
    fumaPermitido: raw.fumaPermitido === "true",
    depositoMeses: raw.depositoMeses,
    incluyeServicios: lista("incluyeServicios"),
    requisitosOcupantes: lista("requisitosOcupantes"),
    notas: raw.reglasNotas,
  });
  if (!reglasParsed.success) {
    const issue = reglasParsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue.message, campo: `reglas.${issue.path.join(".")}` },
      { status: 400 }
    );
  }
  const reglas = reglasParsed.data;

  const latNum = Number(form.get("lat"));
  const lngNum = Number(form.get("lng"));
  const coordsManual =
    Number.isFinite(latNum) && Number.isFinite(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180
      ? ([lngNum, latNum] as [number, number])
      : null;

  try {
    await ensureIndexes();
    const { listings } = await getCollections();
    const _id = new ObjectId(id);

    const doc = (await listings.findOne({ _id })) as ListingDoc | null;
    if (!doc) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    if (String(doc.owner) !== user.id) {
      return NextResponse.json({ ok: false, error: "No es tu publicación" }, { status: 403 });
    }

    // Slug: se regenera solo si el título cambió.
    const slugBase = slugify(data.titulo);
    let slug = doc.slug;
    if (slugBase && slugBase !== slugify(doc.titulo)) {
      slug = await slugUnico(slugBase);
    }

    // Sube las fotos nuevas continuando el orden.
    const subidas: ListingFoto[] = [];
    for (const [i, file] of fotosNuevas.entries()) {
      const up = await subirArchivo(file, "fotos", { slug, orden: fotosPrevias.length + i, owner: user.id });
      subidas.push({
        fileId: up.fileId,
        url: `/api/fotos/${up.fileId}`,
        alt: `${data.titulo} — foto ${fotosPrevias.length + i + 1}`,
      });
    }

    // Borra de GridFS las fotos que ya no están (comparando por fileId).
    const idsPrevios = (doc.fotos ?? []).map((f) => f.fileId).filter((v): v is string => Boolean(v));
    const idsConservados = new Set(fotosPrevias.map((f) => f.fileId).filter(Boolean));
    const idsBorrar = idsPrevios.filter((fid) => !idsConservados.has(fid));
    if (idsBorrar.length) await borrarArchivos(idsBorrar, "fotos");

    const fotosFinales: ListingFoto[] = [...fotosPrevias, ...subidas];

    const caracteristicas: Record<string, unknown> = {};
    const asignaNum = (k: string, v: number | undefined) => {
      if (v !== undefined) caracteristicas[k] = v;
    };
    if (data.tipoPropiedad === "terreno") {
      asignaNum("terrenoM2", data.terrenoM2);
    } else if (data.tipoPropiedad === "local-comercial") {
      asignaNum("metrosM2", data.metrosM2);
      asignaNum("banos", data.banos);
      asignaNum("cajones", data.cajones);
      asignaNum("pisos", data.pisos);
      if (data.extras.length) caracteristicas.extras = data.extras;
    } else {
      asignaNum("terrenoM2", data.terrenoM2);
      asignaNum("construccionM2", data.construccionM2);
      asignaNum("interioresM2", data.interioresM2);
      asignaNum("recamaras", data.recamaras);
      asignaNum("banos", data.banos);
      asignaNum("cajones", data.cajones);
      asignaNum("pisos", data.pisos);
      if (data.tipoPropiedad === "departamento") asignaNum("piso", data.piso);
      if (data.espaciosAdicionales.length) caracteristicas.espaciosAdicionales = data.espaciosAdicionales;
    }

    const cambios: Record<string, unknown> = {
      slug,
      titulo: data.titulo,
      operacion: data.operacion,
      tipoPropiedad: data.tipoPropiedad,
      precio: data.precio,
      descripcion: data.descripcion,
      direccion: {
        calle: data.calle,
        colonia: data.colonia,
        ciudad: data.ciudad,
        estado: data.estado,
        cp: data.cp,
      },
      caracteristicas,
      amenidades: data.amenidades,
      amenidadesLibres: data.amenidadesLibres,
      reglas,
      fotos: fotosFinales,
      actualizado: new Date(),
    };
    if (coordsManual) cambios.ubicacion = { type: "Point", coords: coordsManual };

    await listings.updateOne({ _id }, { $set: cambios });

    // Geocodifica (en segundo plano) si no hay pin manual ni coords previas.
    if (!coordsManual && !doc.ubicacion) {
      void geocodificarDireccion(cambios.direccion as ListingDoc["direccion"])
        .then(async (coords) => {
          if (coords) {
            await listings.updateOne({ _id }, { $set: { ubicacion: { type: "Point", coords } } });
          }
        })
        .catch((e) => console.warn("geocode store", e));
    }

    return NextResponse.json({ ok: true, slug });
  } catch (e) {
    console.error("publicaciones PUT", e);
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar la publicación. Intenta de nuevo." },
      { status: 500 }
    );
  }
}

/** Elimina la publicación y sus fotos de GridFS. */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Inicia sesión" }, { status: 401 });
  }

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }

  try {
    await ensureIndexes();
    const { listings } = await getCollections();
    const _id = new ObjectId(id);

    const doc = (await listings.findOne({ _id })) as ListingDoc | null;
    if (!doc) return NextResponse.json({ ok: false, error: "No existe" }, { status: 404 });
    if (String(doc.owner) !== user.id) {
      return NextResponse.json({ ok: false, error: "No es tu publicación" }, { status: 403 });
    }

    await listings.deleteOne({ _id });
    const ids = doc.fotos.map((f) => f.fileId).filter((v): v is string => Boolean(v));
    if (ids.length) await borrarArchivos(ids, "fotos");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("publicaciones DELETE", e);
    return NextResponse.json({ ok: false, error: "No se pudo eliminar" }, { status: 500 });
  }
}
