"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AMENIDADES, AMENIDADES_ETIQUETAS, OPERACIONES, TIPOS_PROPIEDAD } from "@/lib/validators";

const PASOS = ["Datos", "Ubicación", "Detalle", "Fotos", "Revisar"] as const;

const ETIQUETA_TIPO: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  terreno: "Terreno",
  "local-comercial": "Local comercial",
};

const MAX_FOTOS = Number(process.env.NEXT_PUBLIC_MAX_FOTOS ?? 20);
const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_MB ?? 8);

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
  recamaras: string;
  banos: string;
  cocheras: string;
  construccionM2: string;
  terrenoM2: string;
};

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
  recamaras: "",
  banos: "",
  cocheras: "",
  construccionM2: "",
  terrenoM2: "",
};

function validaPaso(paso: number, c: Campos, amenidades: string[], fotos: File[]): string | null {
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
    case 3:
      if (fotos.length === 0) return "Sube al menos una foto.";
      if (fotos.length > MAX_FOTOS) return `Máximo ${MAX_FOTOS} fotos.`;
      if (fotos.some((f) => f.size > MAX_MB * 1024 * 1024)) return `Cada foto debe pesar menos de ${MAX_MB} MB.`;
      if (amenidades.length === 0) return "Elige al menos una amenidad.";
      return null;
    default:
      return null;
  }
}

/** Asistente de publicación en 5 pasos con previsualización de fotos. */
export default function AsistentePublicacion() {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [campos, setCampos] = useState<Campos>(VACIO);
  const [amenidades, setAmenidades] = useState<string[]>([]);
  const [fotos, setFotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const fotosRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => fotos.map((f) => ({ f, url: URL.createObjectURL(f) })), [fotos]);

  function set(campo: keyof Campos, valor: string) {
    setCampos((prev) => ({ ...prev, [campo]: valor }));
  }

  function toggleAmenidad(clave: string) {
    setAmenidades((prev) => (prev.includes(clave) ? prev.filter((a) => a !== clave) : [...prev, clave]));
  }

  function agregarFotos(files: FileList | null) {
    if (!files) return;
    setFotos((prev) => [...prev, ...Array.from(files)].slice(0, MAX_FOTOS));
    if (fotosRef.current) fotosRef.current.value = "";
  }

  function quitarFoto(idx: number) {
    setFotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function siguiente() {
    const err = validaPaso(paso, campos, amenidades, fotos);
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
      const err = validaPaso(i, campos, amenidades, fotos);
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
              <input id="p-cp" className="verif-input" inputMode="numeric" value={campos.cp} onChange={(e) => set("cp", e.target.value)} placeholder="72480" maxLength={5} />
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

          <div className="asistente-cantidades">
            <div>
              <label className="verif-label" htmlFor="p-rec">Recámaras</label>
              <input id="p-rec" className="verif-input" type="number" min={0} max={50} value={campos.recamaras} onChange={(e) => set("recamaras", e.target.value)} />
            </div>
            <div>
              <label className="verif-label" htmlFor="p-ban">Baños</label>
              <input id="p-ban" className="verif-input" type="number" min={0} max={50} value={campos.banos} onChange={(e) => set("banos", e.target.value)} />
            </div>
            <div>
              <label className="verif-label" htmlFor="p-coch">Cocheras</label>
              <input id="p-coch" className="verif-input" type="number" min={0} max={50} value={campos.cocheras} onChange={(e) => set("cocheras", e.target.value)} />
            </div>
            <div>
              <label className="verif-label" htmlFor="p-cons">m² construcción</label>
              <input id="p-cons" className="verif-input" type="number" min={1} value={campos.construccionM2} onChange={(e) => set("construccionM2", e.target.value)} />
            </div>
            <div>
              <label className="verif-label" htmlFor="p-ter">m² terreno</label>
              <input id="p-ter" className="verif-input" type="number" min={1} value={campos.terrenoM2} onChange={(e) => set("terrenoM2", e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {paso === 3 && (
        <div className="asistente-cuerpo">
          <fieldset className="asistente-opciones">
            <legend className="verif-label">Amenidades ({amenidades.length} elegidas)</legend>
            <div className="intereses-opciones">
              {(Object.keys(AMENIDADES) as (keyof typeof AMENIDADES)[]).map((clave) => (
                <label
                  key={clave}
                  className={amenidades.includes(clave) ? "intereses-chip intereses-chip-activo" : "intereses-chip"}
                >
                  <input
                    type="checkbox"
                    checked={amenidades.includes(clave)}
                    onChange={() => toggleAmenidad(clave)}
                  />
                  <span>{AMENIDADES_ETIQUETAS[clave]}</span>
                </label>
              ))}
            </div>
          </fieldset>

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

      {paso === 4 && (
        <div className="asistente-cuerpo">
          <h3 className="panel-subtitulo">Revisa tu publicación</h3>
          <dl className="asistente-resumen">
            <div><dt>Título</dt><dd>{campos.titulo}</dd></div>
            <div><dt>Operación</dt><dd>{campos.operacion === "venta" ? "Venta" : "Renta"} · {ETIQUETA_TIPO[campos.tipoPropiedad]}</dd></div>
            <div><dt>Precio</dt><dd>${Number(campos.precio).toLocaleString("es-MX")} MXN</dd></div>
            <div><dt>Dirección</dt><dd>{campos.calle}, {campos.colonia}, {campos.ciudad}, {campos.estado}, C.P. {campos.cp}</dd></div>
            {campos.recamaras && <div><dt>Recámaras</dt><dd>{campos.recamaras}</dd></div>}
            {campos.banos && <div><dt>Baños</dt><dd>{campos.banos}</dd></div>}
            {campos.cocheras && <div><dt>Cocheras</dt><dd>{campos.cocheras}</dd></div>}
            {campos.construccionM2 && <div><dt>Construcción</dt><dd>{campos.construccionM2} m²</dd></div>}
            {campos.terrenoM2 && <div><dt>Terreno</dt><dd>{campos.terrenoM2} m²</dd></div>}
            <div><dt>Amenidades</dt><dd>{amenidades.map((a) => AMENIDADES_ETIQUETAS[a as keyof typeof AMENIDADES]).join(", ") || "—"}</dd></div>
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
