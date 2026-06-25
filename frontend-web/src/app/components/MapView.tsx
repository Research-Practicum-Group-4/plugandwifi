import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Venue } from "../../types/api";

// Fix default marker icon asset paths for Vite bundler
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Reset default icon configuration in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapViewProps {
  venues: Venue[];
  height?: string;
  center?: [number, number];
  zoom?: number;
}

export const MapView: React.FC<MapViewProps> = ({
  venues,
  height = "500px",
  center = [40.7589, -73.9851], // Default center on Manhattan
  zoom = 13,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current).setView(center, zoom);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Clean up map instance on component unmount
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Synchronize Markers with Venues Array
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (venues.length === 0) return;

    const bounds: L.LatLngExpression[] = [];

    venues.forEach((venue) => {
      const lat = venue.lat;
      const lon = venue.lon;
      
      // Ensure valid coordinates
      if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) return;

      const markerLatLng: L.LatLngTuple = [lat, lon];
      bounds.push(markerLatLng);

      // Create marker and add to map
      const marker = L.marker(markerLatLng).addTo(map);

      // Custom popup content formatting
      const starRating = "★".repeat(Math.round(venue.rating || 0)) + "☆".repeat(Math.max(0, 5 - Math.round(venue.rating || 0)));
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; min-width: 150px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #253c50;">${venue.name}</h4>
          <p style="margin: 0 0 4px 0; font-size: 11px; color: #eab308; display: flex; align-items: center; gap: 2px;">
            <span style="font-weight: 600;">${venue.rating.toFixed(1)}</span>
            <span>${starRating}</span>
          </p>
          <p style="margin: 0; font-size: 12px; font-weight: 600; color: #2f8a64;">$${venue.hourly_price.toFixed(2)}/hr</p>
          <a href="/venue/${venue.venue_id}" style="display: inline-block; margin-top: 6px; font-size: 11px; color: #253c50; font-weight: 600; text-decoration: underline;">View Details</a>
        </div>
      `;
      marker.bindPopup(popupContent, { closeButton: false });

      // Click event: pan to marker coordinates smoothly
      marker.on("click", (e) => {
        map.setView(e.target.getLatLng(), map.getZoom(), {
          animate: true,
          duration: 0.5,
        });
      });

      markersRef.current.push(marker);
    });

    // 3. Auto-fit bounds if we have pins on the map
    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [venues]);

  return (
    <div 
      ref={mapContainerRef} 
      style={{ height, width: "100%", borderRadius: "8px", zIndex: 1 }} 
      className="border border-border bg-muted overflow-hidden shadow-sm"
    />
  );
};
