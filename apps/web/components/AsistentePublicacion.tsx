"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AMENIDADES,
  AMENIDADES_ETIQUETAS,
  OPERACIONES,
  TIPOS_PROPIEDAD,
  CARACTERISTICAS_POR_TIPO,
  CAMPOS_CARACTERISTICA_ETIQUETAS,
  PERFILES_OCUPANTES,
  PERFILES_OCUPANTES_ETIQUETAS,
} from "@/lib/validators";
import MapaPin from "./MapaPin";

const PASOS = ["Datos", "Ubicación", "Detalle", "Reglas", "Fotos", "Revisar"] as const;

const ETIQUETA_TIPO: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  "local-comercial": "Local comercial",
};

const MAX_FOTOS = Number(process.env.NEXT_PUBLIC_MAX_FOTOS ?? 20);
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_MB ?? 8);

/** Campos numéricos del inmueble. */
type CampoNum =
  | "terrenoM2"
  | "construccionM2"
  | "interioresM2"
  | "metrosM2"
  | "recamaras"
  | "banos"
  | "cajones"
  | "pisos"
  | "piso";

type Campos = {
  titulo: string;
  operacion: string;
  tipoPropiedad: string;
  precio: string;
  calle: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  descripcion: string;
  depositoMeses: string;
  reglasNotas: string;
} & Record<CampoNum, string>;

const VACIO: Campos = {
  titulo: "",
  operacion: "venta",
  tipoPropiedad: "casa",
  precio: "",
  calle: "",
  colonia: "",
  ciudad: "",
  estado: "",
  cp: "",
  descripcion: "",
  depositoMeses: "",
  reglasNotas: "",
  terrenoM2: "",
  construccionM2: "",
  interioresM2: "",
  metrosM2: "",
  recamaras: "",
  banos: "",
  cajones: "",
  pisos: "",
  piso: "",
};

/** Campos numéricos que se muestran según el tipo de propiedad. */
function camposNumDe(tipo: string): CampoNum[] {
  const aplican = (CARACTERISTICAS_POR_TIPO as Record<string, readonly string[]>)[tipo] ?? [];
  return aplican.filter((c): c is CampoNum => c in CAMPOS_CARACTERISTICA_ETIQUETAS && c !== "espaciosAdicionales");
}

function validaPaso(paso: number, c: Campos, fotos: File[]): string | null {
  switch (paso) {
    case 0:
      if (c.titulo.trim().length < 8) return "Escribe un título de al menos 8 caracteres.";
      if (!Number(c.precio) || Number(c.precio) <= 0) return "Escribe un precio válido en MXN.";
      return null;
    case 1:
      if (c.calle.trim().length < 3) return "Escribe la calle y número.";
      if (c.colonia.trim().length < 2) return "Escribe la colonia.";
      if (c.ciudad.trim().length < 2) return "Escribe la ciudad.";
      if (c.estado.trim().length < 2) return "Escribe el estado.";
      if (!/^\d{5}$/.test(c.cp)) return "El código postal son 5 dígitos.";
      return null;
    case 2:
      if (c.descripcion.trim().length < 50) return "Describe la propiedad con al menos 50 caracteres.";
      return null;
    case 4:
      if (fotos.length === 0) return "Sube al menos una foto.";
      if (fotos.length > MAX_FOTOS) return `Máximo ${MAX_FOTOS} fotos.`;
      if (fotos.some((f) => f.size > MAX_MB * 1024 * 1024)) return `Cada foto debe pesar menos de ${MAX_MB} MB.`;
      return null;
    default:
      return null;
  }
}

/** Asistente de publicación con campos por tipo, reglas y previsualización de fotos. */
export default function AsistentePublicacion() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [amenidades, setAmenidades] = useState<string[]>([]);
  const [amenidadesLibres, setAmenidadesLibres] = useState<string[]>([]);
  const [nuevaAmenidad, setNuevaAmenidad] = useState("");
  const [espacios, setEspacios] = useState<string[]>([]);
  const [nuevoEspacio, setNuevoEspacio] = useState("");
  const [reglas, setReglas] = useState({
    amueblado: false,
    aceptaMascotas: false,
    fumaPermitido: false,
    incluyeServicios: [] as string[],
    requisitosOcupantes: [] as string[],
  });
  const [fotos, setFotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodificando, setGeocodificando] = useState(false);
  const [avisoMapa, setAvisoMapa] = useState<string | null>(null);
  const fotosRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => fotos.map((f) => ({ f, url: URL.createObjectURL(f) })), [fotos]);
  useEffect(() => {
    return () => previews.forEach((p) => URL.revokeObjectURL(p.url));
  }, [previews]);

  const camposNum = camposNumDe(campos.tipoPropiedad);

  function set(campo: keyof Campos, valor: string) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  function toggleAmenidad(clave: string) {
    setAmenidades((prev) => (prev.includes(clave) ? prev.filter((a) => a !== clave) : [...prev, clave]));
  }

  function agregarLibre(
    valor: string,
    lista: string[],
    setLista: (v: string[]) => void,
    limpiar: () => void
  ) {
    const v = valor.trim();
    if (v.length < 2 || lista.some((x) => x.toLowerCase() === v.toLowerCase())) {
      limpiar();
      return;
    }
    setLista([...lista, v]);
    limpiar();
  }

  function toggleServicio(s: string) {
    setReglas((prev) => ({
      ...prev,
      incluyeServicios: prev.incluyeServicios.includes(s)
        ? prev.incluyeServicios.filter((x) => x !== s)
        : [...prev.incluyeServicios, s],
    }));
  }

  function toggleRequisito(r: string) {
    setReglas((prev) => ({
      ...prev,
      requisitosOcupantes: prev.requisitosOcupantes.includes(r)
        ? prev.requisitosOcupantes.filter((x) => x !== r)
        : [...prev.requisitosOcupantes, r],
    }));
  }

  function agregarFotos(files: FileList | null) {
    if (!files) return;
    setFotos((prev) => [...prev, ...Array.from(files)].slice(0, MAX_FOTOS));
    if (fotosRef.current) fotosRef.current.value = "";
  }

  function quitarFoto(idx: number) {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function ubicarEnMapa() {
    if (geocodificando) return;
    const partes = [campos.calle, campos.colonia, campos.ciudad, campos.estado].filter((p) => p.trim());
    if (partes.length < 1) {
      setAvisoMapa("Escribe al menos la calle o la colonia para ubicarla en el mapa.");
      return;
    }
    setGeocodificando(true);
    setAvisoMapa("Buscando la ubicación…");
    try {
      const q = `${partes.join(", ")}, México`;
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { ok: boolean; coords?: [number, number]; error?: string };
      if (!data.ok || !data.coords) {
        setAvisoMapa(data.error ?? "No encontramos esa dirección. Mueve el pin manualmente.");
        if (!coords) setCoords({ lat: 19.0414, lng: -98.2063 });
        return;
      }
      setCoords({ lat: data.coords[1], lng: data.coords[0] });
      setAvisoMapa(null);
    } catch {
      setAvisoMapa("Sin conexión con el servidor.");
    } finally {
      setGeocodificando(false);
    }
  }

  function siguiente() {
    const err = validaPaso(paso, campos, fotos);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  function atras() {
    setError(null);
    setPaso((p) => Math.max(p - 1, 0));
  }

  async function publicar() {
    for (let i = 0; i < PASOS.length - 1; i++) {
      const err = validaPaso(i, campos, fotos);
      if (err) {
        setPaso(i);
        setError(err);
        return;
      }
    }
    setEnviando(true);
    setError(null);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(campos)) {
        if (v !== "") fd.set(k, v);
      }
      for (const a of amenidades) fd.append("amenidades", a);
      for (const a of amenidadesLibres) fd.append("amenidadesLibres", a);
      for (const e of espacios) fd.append("espaciosAdicionales", e);
      fd.set("amueblado", String(reglas.amueblado));
      fd.set("aceptaMascotas", String(reglas.aceptaMascotas));
      fd.set("fumaPermitido", String(reglas.fumaPermitido));
      for (const s of reglas.incluyeServicios) fd.append("incluyeServicios", s);
      for (const r of reglas.requisitosOcupantes) fd.append("requisitosOcupantes", r);
      if (coords) {
        fd.set("lat", String(coords.lat));
        fd.set("lng", String(coords.lng));
      }
      for (const f of fotos) fd.append("fotos", f);

      const r = await fetch("/api/publicaciones", { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setError(data.error ?? "No se pudo crear la publicación.");
        setEnviando(false);
        return;
      }
      router.push(`/publicaciones/${data.slug}`);
    } catch {
      setError("Sin conexión con el servidor.");
      setEnviando(false);
    }
  }

  const etiquetaOperacion = campos.operacion === "venta" ? "Venta" : "Renta";

  return (
    <div className="asistente">
      <ol className="asistente-pasos">
        {PASOS.map((nombre, i) => (
          <li
            key={nombre}
            className={
              i === paso ? "asistente-paso asistente-paso-activo" : i < paso ? "asistente-paso asistente-paso-ok" : "asistente-paso"
            }
          >
            <span className="asistente-paso-num">{i < paso ? "✓" : i + 1}</span> {nombre}
          </li>
        ))}
      </ol>

      {error && (
        <p className="contact-aviso contact-error" role="alert">
          {error}
        </p>
      )}

      {paso === 0 && (
        <div className="asistente-cuerpo">
          <label className="verif-label" htmlFor="p-titulo">Título de la publicación</label>
          <input
            id="p-titulo"
            className="verif-input"
            value={campos.titulo}
            onChange={(e) => set("titulo", e.target.value)}
            placeholder="Casa con vista al lago en Cholula"
            maxLength={120}
          />

          <div className="asistente-doble">
            <fieldset className="asistente-opciones">
              <legend className="verif-label">Operación</legend>
              {OPERACIONES.map((op) => (
                <label key={op} className={campos.operacion === op ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
                  <input
                    type="radio"
                    name="operacion"
                    value={op}
                    checked={campos.operacion === op}
                    onChange={() => set("operacion", op)}
                  />
                  <span>{op === "venta" ? "Venta" : "Renta"}</span>
                </label>
              ))}
            </fieldset>

            <label className="verif-label" htmlFor="p-precio">Precio (MXN)</label>
            <input
              id="p-precio"
              className="verif-input"
              type="number"
              min={1}
              value={campos.precio}
              onChange={(e) => set("precio", e.target.value)}
              placeholder="1250000"
            />
          </div>

          <fieldset className="asistente-opciones">
            <legend className="verif-label">Tipo de propiedad</legend>
            {TIPOS_PROPIEDAD.map((t) => (
              <label key={t} className={campos.tipoPropiedad === t ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
                <input
                  type="radio"
                  name="tipoPropiedad"
                  value={t}
                  checked={campos.tipoPropiedad === t}
                  onChange={() => set("tipoPropiedad", t)}
                />
                <span>{ETIQUETA_TIPO[t]}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}

      {paso === 1 && (
        <div className="asistente-cuerpo">
          <label className="verif-label" htmlFor="p-calle">Calle y número</label>
          <input id="p-calle" className="verif-input" value={campos.calle} onChange={(e) => set("calle", e.target.value)} placeholder="Paseo de los Libres 214" maxLength={120} />

          <div className="asistente-doble">
            <div>
              <label className="verif-label" htmlFor="p-colonia">Colonia</label>
              <input id="p-colonia" className="verif-input" value={campos.colonia} onChange={(e) => set("colonia", e.target.value)} placeholder="Lomas de Angelópolis" maxLength={80} />
            </div>
            <div>
              <label className="verif-label" htmlFor="p-cp">Código postal</label>
              <input id="p-cp" className="verif-input" inputMode="numeric" value={campos.cp} onChange={(e) => set("cp", e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="72480" maxLength={5} />
            </div>
          </div>

          <div className="asistente-doble">
            <div>
              <label className="verif-label" htmlFor="p-ciudad">Ciudad</label>
              <input id="p-ciudad" className="verif-input" value={campos.ciudad} onChange={(e) => set("ciudad", e.target.value)} placeholder="Puebla" maxLength={80} />
            </div>
            <div>
              <label className="verif-label" htmlFor="p-estado">Estado</label>
              <input id="p-estado" className="verif-input" value={campos.estado} onChange={(e) => set("estado", e.target.value)} placeholder="Puebla" maxLength={60} />
            </div>
          </div>

          <div className="asistente-mapa">
            <div className="asistente-mapa-cabeza">
              <span className="verif-label" style={{ margin: 0 }}>Ubicación en el mapa</span>
              <button type="button" className="panel-btn" onClick={ubicarEnMapa} disabled={geocodificando}>
                {geocodificando ? "Buscando…" : coords ? "Volver a ubicar" : "Ubicar en el mapa"}
              </button>
            </div>
            {avisoMapa && <p className="asistente-mapa-aviso">{avisoMapa}</p>}
            {coords && (
              <>
                <MapaPin lat={coords.lat} lng={coords.lng} onMover={(lat, lng) => setCoords({ lat, lng })} />
                <p className="asistente-mapa-pie">
                  Arrastra el pin o toca el mapa para ajustar la ubicación exacta.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="asistente-cuerpo">
          <label className="verif-label" htmlFor="p-desc">Descripción</label>
          <textarea
            id="p-desc"
            className="verif-input verif-textarea"
            value={campos.descripcion}
            onChange={(e) => set("descripcion", e.target.value)}
            placeholder={"Describe la propiedad: materiales, orientación, extras...\n\nSepara los párrafos con una línea en blanco."}
            rows={7}
            maxLength={4000}
          />

          <fieldset className="asistente-opciones">
            <legend className="verif-label">
              Características para {ETIQUETA_TIPO[campos.tipoPropiedad]?.toLowerCase() ?? "la propiedad"}
            </legend>
            <div className="asistente-cantidades">
              {camposNum.map((campo) => (
                <div key={campo}>
                  <label className="verif-label" htmlFor={`p-${campo}`}>
                    {CAMPOS_CARACTERISTICA_ETIQUETAS[campo]}
                  </label>
                  <input
                    id={`p-${campo}`}
                    className="verif-input"
                    type="number"
                    min={0}
                    value={campos[campo]}
                    onChange={(e) => set(campo as keyof Campos, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {(campos.tipoPropiedad === "casa" || campos.tipoPropiedad === "departamento") && (
              <div className="asistente-lista-libre">
                <label className="verif-label" htmlFor="p-espacio">Espacios adicionales (balcón, patio, bodega…)</label>
                <div className="asistente-lista-libre-fila">
                  <input
                    id="p-espacio"
                    className="verif-input"
                    value={nuevoEspacio}
                    onChange={(e) => setNuevoEspacio(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        agregarLibre(nuevoEspacio, espacios, setEspacios, () => setNuevoEspacio(""));
                      }
                    }}
                    placeholder="Bodega"
                    maxLength={60}
                  />
                  <button
                    type="button"
                    className="panel-btn"
                    onClick={() => agregarLibre(nuevoEspacio, espacios, setEspacios, () => setNuevoEspacio(""))}
                  >
                    Agregar
                  </button>
                </div>
                {espacios.length > 0 && (
                  <ul className="asistente-tags">
                    {espacios.map((e) => (
                      <li key={e}>
                        {e}
                        <button type="button" onClick={() => setEspacios((prev) => prev.filter((x) => x !== e))} aria-label={`Quitar ${e}`}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </fieldset>
        </div>
      )}

      {paso === 3 && (
        <div className="asistente-cuerpo">
          <p className="panel-texto">
            Reglas y condiciones de la propiedad. Son habituales en renta y ayudan a encontrar
            inquilinos adecuados.
          </p>

          <fieldset className="asistente-opciones">
            <legend className="verif-label">Condiciones</legend>
            <label className={reglas.amueblado ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
              <input type="checkbox" checked={reglas.amueblado} onChange={() => setReglas((p) => ({ ...p, amueblado: !p.amueblado }))} />
              <span>Amueblado</span>
            </label>
            <label className={reglas.aceptaMascotas ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
              <input type="checkbox" checked={reglas.aceptaMascotas} onChange={() => setReglas((p) => ({ ...p, aceptaMascotas: !p.aceptaMascotas }))} />
              <span>Acepta mascotas</span>
            </label>
            <label className={reglas.fumaPermitido ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
              <input type="checkbox" checked={reglas.fumaPermitido} onChange={() => setReglas((p) => ({ ...p, fumaPermitido: !p.fumaPermitido }))} />
              <span>Se permite fumar</span>
            </label>
          </fieldset>

          {campos.operacion === "renta" && (
            <>
              <label className="verif-label" htmlFor="p-deposito">Depósito (meses)</label>
              <input
                id="p-deposito"
                className="verif-input"
                type="number"
                min={0}
                max={12}
                value={campos.depositoMeses}
                onChange={(e) => set("depositoMeses", e.target.value)}
                placeholder="2"
              />

              <fieldset className="asistente-opciones">
                <legend className="verif-label">Servicios incluidos</legend>
                {["agua", "luz", "gas", "internet", "mantenimiento"].map((s) => (
                  <label key={s} className={reglas.incluyeServicios.includes(s) ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
                    <input type="checkbox" checked={reglas.incluyeServicios.includes(s)} onChange={() => toggleServicio(s)} />
                    <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  </label>
                ))}
              </fieldset>

              <fieldset className="asistente-opciones">
                <legend className="verif-label">Perfil de ocupantes (requisitos)</legend>
                {PERFILES_OCUPANTES.map((r) => (
                  <label key={r} className={reglas.requisitosOcupantes.includes(r) ? "intereses-chip intereses-chip-activo" : "intereses-chip"}>
                    <input type="checkbox" checked={reglas.requisitosOcupantes.includes(r)} onChange={() => toggleRequisito(r)} />
                    <span>{PERFILES_OCUPANTES_ETIQUETAS[r]}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          <label className="verif-label" htmlFor="p-reglas-notas">Notas sobre las condiciones (opcional)</label>
          <textarea
            id="p-reglas-notas"
            className="verif-input verif-textarea"
            value={campos.reglasNotas}
            onChange={(e) => set("reglasNotas", e.target.value)}
            placeholder="Contrato mínimo de 12 meses, se solicita comprobante de ingresos…"
            rows={3}
            maxLength={600}
          />
        </div>
      )}

      {paso === 4 && (
        <div className="asistente-cuerpo">
          <fieldset className="asistente-opciones">
            <legend className="verif-label">Amenidades generales ({amenidades.length} elegidas, opcional)</legend>
            <div className="intereses-opciones">
              {(Object.keys(AMENIDADES) as (keyof typeof AMENIDADES)[]).map((clave) => (
                <label
                  key={clave}
                  className={amenidades.includes(clave) ? "intereses-chip intereses-chip-activo" : "intereses-chip"}
                >
                  <input type="checkbox" checked={amenidades.includes(clave)} onChange={() => toggleAmenidad(clave)} />
                  <span>{AMENIDADES_ETIQUETAS[clave]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="asistente-lista-libre">
            <label className="verif-label" htmlFor="p-amenidad-libre">
              Otras amenidades (cualquier texto: aparece al buscar)
            </label>
            <div className="asistente-lista-libre-fila">
              <input
                id="p-amenidad-libre"
                className="verif-input"
                value={nuevaAmenidad}
                onChange={(e) => setNuevaAmenidad(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarLibre(nuevaAmenidad, amenidadesLibres, setAmenidadesLibres, () => setNuevaAmenidad(""));
                  }
                }}
                placeholder="Paneles solares, cisterna, elevador…"
                maxLength={60}
              />
              <button
                type="button"
                className="panel-btn"
                onClick={() => agregarLibre(nuevaAmenidad, amenidadesLibres, setAmenidadesLibres, () => setNuevaAmenidad(""))}
              >
                Agregar
              </button>
            </div>
            {amenidadesLibres.length > 0 && (
              <ul className="asistente-tags">
                {amenidadesLibres.map((a) => (
                  <li key={a}>
                    {a}
                    <button type="button" onClick={() => setAmenidadesLibres((prev) => prev.filter((x) => x !== a))} aria-label={`Quitar ${a}`}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <label className="verif-label" htmlFor="p-fotos">
            Fotos ({fotos.length}/{MAX_FOTOS}, máximo {MAX_MB} MB c/u)
          </label>
          <input
            id="p-fotos"
            ref={fotosRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={(e) => agregarFotos(e.target.files)}
          />

          {previews.length > 0 && (
            <ul className="asistente-previews">
              {previews.map((p, i) => (
                <li key={p.url}>
                  <img src={p.url} alt={`Foto ${i + 1}`} />
                  <button type="button" className="panel-btn panel-btn-peligro" onClick={() => quitarFoto(i)}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {paso === 5 && (
        <div className="asistente-cuerpo">
          <h3 className="panel-subtitulo">Revisa tu publicación</h3>
          <dl className="asistente-resumen">
            <div><dt>Título</dt><dd>{campos.titulo}</dd></div>
            <div><dt>Operación</dt><dd>{etiquetaOperacion} · {ETIQUETA_TIPO[campos.tipoPropiedad]}</dd></div>
            <div><dt>Precio</dt><dd>${Number(campos.precio).toLocaleString("es-MX")} MXN</dd></div>
            <div><dt>Dirección</dt><dd>{campos.calle}, {campos.colonia}, {campos.ciudad}, {campos.estado}, C.P. {campos.cp}</dd></div>
            {camposNum.map((campo) =>
              campos[campo] ? (
                <div key={campo}>
                  <dt>{CAMPOS_CARACTERISTICA_ETIQUETAS[campo]}</dt>
                  <dd>{campos[campo]}</dd>
                </div>
              ) : null
            )}
            {espacios.length > 0 && <div><dt>Espacios adicionales</dt><dd>{espacios.join(", ")}</dd></div>}
            <div><dt>Amenidades</dt><dd>{amenidades.map((a) => AMENIDADES_ETIQUETAS[a as keyof typeof AMENIDADES]).join(", ") || "—"}</dd></div>
            {amenidadesLibres.length > 0 && <div><dt>Otras amenidades</dt><dd>{amenidadesLibres.join(", ")}</dd></div>}
            {campos.operacion === "renta" && (
              <div>
                <dt>Condiciones</dt>
                <dd>
                  {[
                    reglas.amueblado ? "Amueblado" : null,
                    reglas.aceptaMascotas ? "Acepta mascotas" : "Sin mascotas",
                    reglas.fumaPermitido ? "Se permite fumar" : "No fumar",
                    campos.depositoMeses ? `Depósito ${campos.depositoMeses} mes(es)` : null,
                    reglas.incluyeServicios.length ? `Incluye: ${reglas.incluyeServicios.join(", ")}` : null,
                    reglas.requisitosOcupantes.length
                      ? `Dirigido a: ${reglas.requisitosOcupantes
                          .map((r) => PERFILES_OCUPANTES_ETIQUETAS[r as keyof typeof PERFILES_OCUPANTES_ETIQUETAS] ?? r)
                          .join(", ")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </dd>
              </div>
            )}
            <div><dt>Fotos</dt><dd>{fotos.length}</dd></div>
            <div><dt>Descripción</dt><dd className="asistente-resumen-desc">{campos.descripcion}</dd></div>
          </dl>
        </div>
      )}

      <div className="asistente-acciones">
        {paso > 0 ? (
          <button type="button" className="panel-btn" onClick={atras} disabled={enviando}>
            Atrás
          </button>
        ) : (
          <span />
        )}
        {paso < PASOS.length - 1 ? (
          <button type="button" className="panel-btn panel-btn-primario" onClick={siguiente}>
            Continuar
          </button>
        ) : (
          <button type="button" className="panel-btn panel-btn-primario" onClick={publicar} disabled={enviando}>
            {enviando ? "Publicando…" : "Publicar propiedad"}
          </button>
        )}
      </div>
    </div>
  );
}
