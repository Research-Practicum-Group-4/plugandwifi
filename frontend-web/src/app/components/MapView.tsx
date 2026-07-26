import React, { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import { Venue } from "../../types/api";

interface MapViewProps {
  venues: Venue[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  userLocation?: [number, number] | null;
}

type LatLng = {
  lat: number;
  lng: number;
};

type MarkerVenue = Venue & {
  position: LatLng;
};

const DEFAULT_CENTER: [number, number] = [40.7589, -73.9851];
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const USER_LOCATION_ICON = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
    <defs>
      <radialGradient id="outerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.42" />
        <stop offset="65%" stop-color="#3b82f6" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#bfdbfe" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.35" />
      </radialGradient>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#1d4ed8" flood-opacity="0.35"/>
      </filter>
    </defs>
    <circle cx="36" cy="36" r="30" fill="url(#outerGlow)" />
    <circle cx="36" cy="36" r="19" fill="url(#innerGlow)" />
    <circle cx="36" cy="36" r="10.5" fill="#ffffff" filter="url(#shadow)" />
    <circle cx="36" cy="36" r="7.5" fill="#1d4ed8" />
    <circle cx="36" cy="36" r="4.5" fill="#3b82f6" />
  </svg>
`)}`;

function fitMapToVenues(
  venues: MarkerVenue[],
  userLocation: LatLng | null,
  map: {
    panTo: (position: LatLng) => void;
    setCenter: (position: LatLng) => void;
    setZoom: (value: number) => void;
    fitBounds: (bounds: unknown, padding?: number) => void;
  },
  zoom: number
) {
  const positions = [
    ...venues.map((venue) => venue.position),
    ...(userLocation ? [userLocation] : []),
  ];

  if (positions.length === 0) return;

  if (positions.length === 1) {
    map.setCenter(positions[0]);
    map.setZoom(zoom);
    return;
  }

  const bounds = {
    north: Math.max(...positions.map((position) => position.lat)),
    south: Math.min(...positions.map((position) => position.lat)),
    east: Math.max(...positions.map((position) => position.lng)),
    west: Math.min(...positions.map((position) => position.lng)),
  };

  map.fitBounds(bounds, 50);
}

function MapMarkers({
  venues,
  zoom,
  userLocation,
}: {
  venues: MarkerVenue[];
  zoom: number;
  userLocation: LatLng | null;
}) {
  const map = useMap();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;
    fitMapToVenues(venues, userLocation, map, zoom);
  }, [map, venues, userLocation, zoom]);

  useEffect(() => {
    if (!selectedVenueId || venues.some((venue) => venue.venue_id === selectedVenueId)) return;
    setSelectedVenueId(null);
  }, [selectedVenueId, venues]);

  const selectedVenue = venues.find((venue) => venue.venue_id === selectedVenueId) ?? null;

  return (
    <>
      {userLocation && (
        <Marker
          position={userLocation}
          title="Your location"
          zIndex={1000}
          icon={USER_LOCATION_ICON}
        />
      )}

      {venues.map((venue) => (
        <Marker
          key={venue.venue_id}
          position={venue.position}
          title={venue.name}
          onClick={() => {
            setSelectedVenueId(venue.venue_id);
            map?.panTo(venue.position);
          }}
        />
      ))}

      {selectedVenue && (
        <InfoWindow
          position={selectedVenue.position}
          onCloseClick={() => setSelectedVenueId(null)}
          shouldFocus={false}
        >
          <div
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              padding: "4px",
              minWidth: "170px",
            }}
          >
            <h4
              style={{
                margin: "0 0 4px 0",
                fontSize: "13px",
                fontWeight: 600,
                color: "#253c50",
              }}
            >
              {selectedVenue.name}
            </h4>
            <p
              style={{
                margin: "0 0 4px 0",
                fontSize: "11px",
                color: "#eab308",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontWeight: 600 }}>
                Rating: {selectedVenue.rating.toFixed(1)}
              </span>
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                fontWeight: 600,
                color: "#2f8a64",
              }}
            >
              ${(selectedVenue.hourly_price ?? 0).toFixed(2)}/hr
            </p>
            <a
              href={`/venue/${selectedVenue.venue_id}`}
              style={{
                display: "inline-block",
                marginTop: "6px",
                fontSize: "11px",
                color: "#253c50",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              View Details
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export const MapView: React.FC<MapViewProps> = ({
  venues,
  height = "500px",
  center = DEFAULT_CENTER,
  zoom = 13,
  userLocation = null,
}) => {
  const validVenues = useMemo<MarkerVenue[]>(
    () =>
      venues
        .filter(
          (venue) =>
            typeof venue.lat === "number" &&
            typeof venue.lon === "number" &&
            Number.isFinite(venue.lat) &&
            Number.isFinite(venue.lon)
        )
        .map((venue) => ({
          ...venue,
          position: { lat: venue.lat, lng: venue.lon },
        })),
    [venues]
  );

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div
        style={{ height, width: "100%", borderRadius: "8px" }}
        className="flex items-center justify-center border border-border bg-muted px-4 text-center text-sm text-muted-foreground shadow-sm"
      >
        Google Maps API key is missing. Set `VITE_GOOGLE_MAPS_API_KEY` to render the map.
      </div>
    );
  }

  return (
    <div
      style={{ height, width: "100%", borderRadius: "8px" }}
      className="overflow-hidden border border-border bg-muted shadow-sm"
    >
      <APIProvider apiKey={GOOGLE_MAPS_KEY}>
        <Map
          defaultCenter={{ lat: center[0], lng: center[1] }}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          clickableIcons={false}
          style={{ width: "100%", height: "100%" }}
        >
          <MapMarkers
            venues={validVenues}
            zoom={zoom}
            userLocation={
              userLocation
                ? { lat: userLocation[0], lng: userLocation[1] }
                : null
            }
          />
        </Map>
      </APIProvider>
    </div>
  );
};
