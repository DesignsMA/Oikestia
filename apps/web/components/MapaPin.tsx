"use client";

import { useEffect, useRef } from "react";
import type { Map, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

type Props = {
  lat: number;
  lng: number;
  onMover: (lat: number, lng: number) => void;
  altura?: number;
};

const PUEBLA = { lat: 19.0414, lng: -98.2063 };

/** Mapa compacto con un pin arrastrable; notifica cada movimiento. */
export default function MapaPin({ lat, lng, onMover, altura = 260 }: Props) {
  const contRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const marcaRef = useRef<Marker | null>(null);
  const moverRef = useRef(onMover);
  moverRef.current = onMover;

  useEffect(() => {
    let cancelado = false;
    if (!contRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (cancelado || mapRef.current || !contRef.current) return;

      const icono = L.icon({
        iconUrl: markerIconUrl.src,
        iconRetinaUrl: markerRetinaUrl.src,
        shadowUrl: markerShadowUrl.src,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const map = L.map(contRef.current, { scrollWheelZoom: true, attributionControl: true });
      map.setView([lat || PUEBLA.lat, lng || PUEBLA.lng], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marca = L.marker([lat || PUEBLA.lat, lng || PUEBLA.lng], {
        icon: icono,
        draggable: true,
        alt: "Ubicación de la propiedad",
      }).addTo(map);
      marca.on("dragend", () => {
        const p = marca.getLatLng();
        moverRef.current(p.lat, p.lng);
      });
      map.on("click", (e) => {
        marca.setLatLng(e.latlng);
        moverRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      marcaRef.current = marca;

      const reloj = window.setTimeout(() => map.invalidateSize(), 300);
      (map as unknown as { __reloj?: number }).__reloj = reloj;
    });

    return () => {
      cancelado = true;
      const reloj = (mapRef.current as unknown as { __reloj?: number } | null)?.__reloj;
      if (reloj) window.clearTimeout(reloj);
      mapRef.current?.remove();
      mapRef.current = null;
      marcaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Sincroniza cambios externos de coordenadas con el pin y el centro. */
  useEffect(() => {
    if (!mapRef.current || !marcaRef.current) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    marcaRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 15), { animate: true });
  }, [lat, lng]);

  return <div ref={contRef} className="mapa-pin-lienzo" style={{ height: altura }} />;
}
