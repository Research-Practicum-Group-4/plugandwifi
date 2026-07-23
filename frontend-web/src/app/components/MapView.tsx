import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Venue } from "../../types/api";

interface MapViewProps {
  venues: Venue[];
  height?: string;
  center?: [number, number];
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [40.7589, -73.9851];

// Custom pin icon for Leaflet markers
const createCustomIcon = () => {
  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div style="
        background-color: #253c50;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 12px;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        📍
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

export const MapView: React.FC<MapViewProps> = ({
  venues,
  height = "500px",
  center = DEFAULT_CENTER,
  zoom = 13,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [center[0], center[1]],
        zoom,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when venues list changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const validVenues = venues.filter(
      (v) =>
        typeof v.lat === "number" &&
        typeof v.lon === "number" &&
        Number.isFinite(v.lat) &&
        Number.isFinite(v.lon)
    );

    const customIcon = createCustomIcon();

    validVenues.forEach((venue) => {
      const suitability = (venue as any).suitability_score || Math.round(75 + venue.rating * 4);
      const busyness = (venue as any).busyness_label || "Moderate";

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 4px;">
          <h4 style="margin: 0 0 4px 0; font-weight: 700; font-size: 14px; color: #111827;">${venue.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">${venue.cuisine_type || "Workspace"} • ${venue.borough || "Manhattan"}</p>
          
          <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 8px;">
            <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px;">
              Suitability: ${suitability}%
            </span>
            <span style="background: #f3f4f6; color: #374151; font-size: 11px; padding: 2px 6px; border-radius: 4px;">
              Busyness: ${busyness}
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; pt: 6px; margin-top: 6px;">
            <span style="font-size: 14px; font-weight: 700; color: #2f8a64;">$${venue.hourly_price}/hr</span>
            <a href="/venue/${venue.venue_id}" style="font-size: 12px; font-weight: 600; color: #253c50; text-decoration: underline;">
              View Details &rarr;
            </a>
          </div>
        </div>
      `;

      const marker = L.marker([venue.lat, venue.lon], { icon: customIcon }).bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });

    if (validVenues.length > 0) {
      const bounds = L.latLngBounds(validVenues.map((v) => [v.lat, v.lon]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [venues]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: "100%", borderRadius: "8px" }}
      className="overflow-hidden border border-border shadow-sm z-0 relative"
    />
  );
};
