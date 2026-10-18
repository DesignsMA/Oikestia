"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Icon, LayerGroup, Map } from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import ListingCardCompact, { type CardFeature } from "./ListingCardCompact";

export type ItemBusqueda = {
  slug: string;
  titulo: string;
  precioTexto: string;
  location: string;
  image: string;
  imageAlt: string;
  features: CardFeature[];
  tag?: string;
  /** [lng, lat] solo si la geocodificación existía. */
  coords?: [number, number];
};

type Props = {
  items: ItemBusqueda[];
  inicial?: { lat?: number; lng?: number; radio?: number };
};

const RADIOS = [0, 1, 2, 5, 10, 25, 50];
const ZOOM: Record<number, number> = { 1: 14, 2: 13, 5: 12, 10: 11, 25: 10, 50: 9, 0: 11 };
const PUEBLA: { lat: number; lng: number } = { lat: 19.0414, lng: -98.2063 };

/** Distancia en km (haversine). */
function distKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Buscador en mapa (Fase 5): Leaflet con tiles de OSM, radio de búsqueda,
 * geolocalización del navegador y salto por dirección vía /api/geocode.
 * El filtrado por radio ocurre en el cliente sobre las publicaciones
 * geocodificadas que pasa la página de servidor.
 */
export default function BuscadorMapa({ items, inicial }: Props) {
  const contRef = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<Map | null>(null);
  const capaRef = useRef<LayerGroup | null>(null);
  const iconRef = useRef<Icon | null>(null);
  const limpiarRef = useRef<(() => void) | null>(null);

  const conCoords = useMemo(() => items.filter((i) => i.coords), [items]);
  const sinCoords = items.length - conCoords.length;

  const [centro, setCentro] = useState(() => ({
    lat: typeof inicial?.lat === "number" ? inicial.lat : PUEBLA.lat,
    lng: typeof inicial?.lng === "number" ? inicial.lng : PUEBLA.lng,
  }));
  const [radio, setRadio] = useState(() =>
    inicial?.radio !== undefined && RADIOS.includes(inicial.radio) ? inicial.radio : 0
  );
  const [direccion, setDireccion] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargandoGeo, setCargandoGeo] = useState(false);
  const [ubicacionPropia, setUbicacionPropia] = useState(false);

  const visibles = useMemo(() => {
    if (radio === 0) return items;
    return conCoords.filter((i) => distKm(centro, { lat: i.coords![1], lng: i.coords![0] }) <= radio);
  }, [items, conCoords, centro, radio]);

  /* Inicio único del mapa (Leaflet solo existe en el navegador). */
  useEffect(() => {
    let cancelado = false;
    if (!contRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (cancelado || mapRef.current || !contRef.current) return;

      LRef.current = L;
      iconRef.current = L.icon({
        iconUrl: markerIconUrl.src,
        iconRetinaUrl: markerRetinaUrl.src,
        shadowUrl: markerShadowUrl.src,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const map = L.map(contRef.current, { scrollWheelZoom: true });
      map.setView([centro.lat, centro.lng], ZOOM[radio] ?? 11);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">Colaboradores de OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      capaRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const reloj = window.setTimeout(() => map.invalidateSize(), 300);
      limpiarRef.current = () => window.clearTimeout(reloj);
    });

    return () => {
      cancelado = true;
      limpiarRef.current?.();
      mapRef.current?.remove();
      mapRef.current = null;
      capaRef.current = null;
      iconRef.current = null;
      LRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Centrar según ubicación/radio elegido. */
  useEffect(() => {
    mapRef.current?.setView([centro.lat, centro.lng], ZOOM[radio] ?? 11, { animate: true });
  }, [centro, radio]);

  /* Marcadores de las publicaciones visibles (popups construidos con DOM seguro). */
  useEffect(() => {
    const L = LRef.current;
    const capa = capaRef.current;
    const icono = iconRef.current;
    if (!L || !capa || !icono) return;
    capa.clearLayers();
    for (const it of visibles) {
      if (!it.coords) continue;
      const [lng, lat] = it.coords;
      const div = document.createElement("div");
      const a = document.createElement("a");
      a.href = `/publicaciones/${it.slug}`;
      a.textContent = it.titulo;
      a.style.fontWeight = "600";
      const p = document.createElement("p");
      p.textContent = it.precioTexto;
      p.style.margin = "0.25rem 0 0";
      div.append(a, p);
      L.marker([lat, lng], { icon: icono, alt: it.titulo }).addTo(capa).bindPopup(div);
    }
  }, [visibles]);

  async function irA(e: FormEvent) {
    e.preventDefault();
    const q = direccion.trim();
    if (q.length < 4 || cargandoGeo) return;
    setCargandoGeo(true);
    setAviso("Buscando ubicación…");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await res.json()) as { ok: boolean; coords?: [number, number]; error?: string };
      if (!data.ok || !data.coords) {
        setAviso(data.error ?? "No encontramos esa ubicación");
        return;
      }
      setUbicacionPropia(false);
      setCentro({ lat: data.coords[1], lng: data.coords[0] });
      setRadio((r) => (r === 0 ? 5 : r));
      setAviso(null);
    } catch {
      setAviso("Sin conexión con el servidor");
    } finally {
      setCargandoGeo(false);
    }
  }

  function miUbicacion() {
    if (!("geolocation" in navigator)) {
      setAviso("Tu navegador no soporta la ubicación");
      return;
    }
    setCargandoGeo(true);
    setAviso("Leyendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacionPropia(true);
        setCentro({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRadio((r) => (r === 0 ? 5 : r));
        setAviso(null);
        setCargandoGeo(false);
      },
      (err) => {
        setAviso(err.code === 1 ? "No diste permiso para usar tu ubicación" : "No pudimos leer tu ubicación");
        setCargandoGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  function cambiarRadio(v: number) {
    setRadio(v);
    setUbicacionPropia(false);
    if (v > 0 && radio === 0) setAviso(null);
  }

  return (
    <div className="buscador-layout">
      <aside className="buscador-panel">
        <form className="buscador-buscar" onSubmit={irA}>
          <input
            type="search"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Colonia, ciudad o dirección"
            aria-label="Ir a una ubicación"
            maxLength={120}
          />
          <button type="submit" disabled={cargandoGeo}>
            Ir a
          </button>
        </form>

        <div className="buscador-controles">
          <button type="button" className="buscador-ubicacion" onClick={miUbicacion} disabled={cargandoGeo}>
            Mi ubicación
          </button>
          <label className="buscador-radio">
            Radio
            <select value={radio} onChange={(e) => cambiarRadio(Number(e.target.value))}>
              {RADIOS.map((km) => (
                <option key={km} value={km}>
                  {km === 0 ? "Todas" : `${km} km`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="buscador-estado" aria-live="polite">
          {aviso
            ? aviso
            : radio === 0
              ? `${items.length} ${items.length === 1 ? "propiedad publicada" : "propiedades publicadas"} en el mapa`
              : `${visibles.length} ${visibles.length === 1 ? "propiedad" : "propiedades"} en ${radio} km${ubicacionPropia ? " de tu ubicación" : ""}`}
        </p>

        <div className="buscador-lista">
          {visibles.map((it) => (
            <ListingCardCompact
              key={it.slug}
              href={`/publicaciones/${it.slug}`}
              image={it.image}
              imageAlt={it.imageAlt}
              price={it.precioTexto}
              title={it.titulo}
              location={it.location}
              features={it.features}
              tag={it.tag}
            />
          ))}
        </div>

        {radio !== 0 && visibles.length === 0 && (
          <p className="buscador-vacio">Nada en este radio. Prueba un radio mayor o mueve el mapa.</p>
        )}
        {sinCoords > 0 && radio === 0 && (
          <p className="buscador-aviso">
            {sinCoords} {sinCoords === 1 ? "publicación sin ubicación" : "publicaciones sin ubicación"} no se
            muestran en el mapa.
          </p>
        )}
      </aside>

      <div className="buscador-mapa" aria-label="Mapa de publicaciones">
        <div ref={contRef} className="buscador-mapa-lienzo" />
        <p className="buscador-mapa-pie">
          Mapa © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores
        </p>
      </div>
    </div>
  );
}
