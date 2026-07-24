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

function fitMapToVenues(
  venues: MarkerVenue[],
  map: {
    panTo: (position: LatLng) => void;
    setCenter: (position: LatLng) => void;
    setZoom: (value: number) => void;
    fitBounds: (bounds: unknown, padding?: number) => void;
  },
  zoom: number
) {
  if (venues.length === 0) return;

  if (venues.length === 1) {
    map.setCenter(venues[0].position);
    map.setZoom(zoom);
    return;
  }

  const bounds = {
    north: Math.max(...venues.map((venue) => venue.position.lat)),
    south: Math.min(...venues.map((venue) => venue.position.lat)),
    east: Math.max(...venues.map((venue) => venue.position.lng)),
    west: Math.min(...venues.map((venue) => venue.position.lng)),
  };

  map.fitBounds(bounds, 50);
}

function MapMarkers({ venues, zoom }: { venues: MarkerVenue[]; zoom: number }) {
  const map = useMap();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;
    fitMapToVenues(venues, map, zoom);
  }, [map, venues, zoom]);

  useEffect(() => {
    if (!selectedVenueId || venues.some((venue) => venue.venue_id === selectedVenueId)) return;
    setSelectedVenueId(null);
  }, [selectedVenueId, venues]);

  const selectedVenue = venues.find((venue) => venue.venue_id === selectedVenueId) ?? null;

  return (
    <>
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
              ${selectedVenue.hourly_price.toFixed(2)}/hr
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
          <MapMarkers venues={validVenues} zoom={zoom} />
        </Map>
      </APIProvider>
    </div>
  );
};
