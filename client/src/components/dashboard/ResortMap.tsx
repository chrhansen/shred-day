import { useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MappedResort = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  daysSkied: number;
};

type ResortMapProps = {
  resorts: MappedResort[];
};

export function ResortMap({ resorts }: ResortMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const resortsWithCoords = useMemo(
    () =>
      resorts.filter(
        (r) =>
          typeof r.latitude === "number" &&
          typeof r.longitude === "number" &&
          !Number.isNaN(r.latitude) &&
          !Number.isNaN(r.longitude)
      ) as Array<{
        name: string;
        latitude: number;
        longitude: number;
        daysSkied: number;
      }>,
    [resorts]
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initialCenter: L.LatLngExpression =
      resortsWithCoords.length > 0
        ? [
            resortsWithCoords.reduce((sum, r) => sum + r.latitude, 0) /
              resortsWithCoords.length,
            resortsWithCoords.reduce((sum, r) => sum + r.longitude, 0) /
              resortsWithCoords.length,
          ]
        : [46.8, 8.2];

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(initialCenter, 5);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, [resortsWithCoords]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const createMarkerIcon = (days: number) => {
      const size = Math.min(24 + days * 2, 40);
      return L.divIcon({
        className: "custom-marker",
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: 600;
        ">${days}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    };

    resortsWithCoords.forEach((resort) => {
      const marker = L.marker([resort.latitude, resort.longitude], {
        icon: createMarkerIcon(resort.daysSkied),
      }).addTo(markersLayer);

      marker.bindPopup(`
        <div style="text-align: center; padding: 4px;">
          <strong>${resort.name}</strong><br/>
          <span style="color: #64748b;">${resort.daysSkied} day${
            resort.daysSkied !== 1 ? "s" : ""
          }</span>
        </div>
      `);
    });

    if (resortsWithCoords.length > 0) {
      if (resortsWithCoords.length === 1) {
        const only = resortsWithCoords[0];
        map.setView([only.latitude, only.longitude], 6);
      } else {
        const bounds = L.latLngBounds(
          resortsWithCoords.map((r) => [r.latitude, r.longitude])
        );
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    } else {
      map.setView([46.8, 8.2], 2);
    }
  }, [resortsWithCoords]);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-slate-50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-indigo-500" />
          Where You've Been
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-0 pb-0">
        <div ref={mapRef} className="h-[200px] w-full rounded-b-lg" />
      </CardContent>
    </Card>
  );
}
