import React, { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";
import { Venue } from "../../types/api";
import { formatVenueRating } from "../utils/venueEnrichment";

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

type VenueCluster = {
  id: string;
  position: LatLng;
  venues: MarkerVenue[];
};

const DEFAULT_CENTER: [number, number] = [40.7589, -73.9851];
const CLUSTER_ZOOM_THRESHOLD = 15;
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
function buildVenueMarkerIcon(isHovered = false): string {
  const width = isHovered ? 48 : 44;
  const height = isHovered ? 58 : 54;
  const viewBoxWidth = 44;
  const viewBoxHeight = 54;
  const outerStroke = isHovered ? "#f7fbf8" : "#ffffff";
  const outerStrokeWidth = isHovered ? 3 : 2.5;
  const innerRadius = isHovered ? 10.4 : 9.2;
  const innerFill = isHovered ? "#f7fbf8" : "#ffffff";

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">
    <defs>
      <filter id="markerShadow" x="-35%" y="-25%" width="170%" height="160%">
        <feDropShadow dx="0" dy="${isHovered ? 5 : 4}" stdDeviation="${isHovered ? 3.8 : 3}" flood-color="#102638" flood-opacity="${isHovered ? 0.36 : 0.28}"/>
      </filter>
      <linearGradient id="markerFill" x1="10" y1="6" x2="34" y2="43" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${isHovered ? "#38a977" : "#2f8a64"}"/>
        <stop offset="100%" stop-color="#253c50"/>
      </linearGradient>
    </defs>
    <path
      d="M22 3C11.8 3 4 10.7 4 20.4c0 12.8 15.3 28.4 17.1 30.2.5.5 1.3.5 1.8 0C24.7 48.8 40 33.2 40 20.4 40 10.7 32.2 3 22 3Z"
      fill="url(#markerFill)"
      stroke="${outerStroke}"
      stroke-width="${outerStrokeWidth}"
      filter="url(#markerShadow)"
    />
    <circle cx="22" cy="20.5" r="${innerRadius}" fill="${innerFill}" fill-opacity="${isHovered ? 1 : 0.95}"/>
    <circle cx="22" cy="20.5" r="4.2" fill="${isHovered ? "#2f8a64" : "#253c50"}" fill-opacity="0.9"/>
  </svg>
`)}`;
}

const VENUE_MARKER_ICON = buildVenueMarkerIcon();
const VENUE_MARKER_HOVER_ICON = buildVenueMarkerIcon(true);
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

function getClusterCellSize(zoom: number): number {
  if (zoom <= 11) return 0.04;
  if (zoom <= 12) return 0.025;
  if (zoom <= 13) return 0.016;
  return 0.009;
}

function buildClusterIcon(count: number): string {
  const diameter = count >= 100 ? 58 : count >= 10 ? 52 : 46;
  const fontSize = count >= 100 ? 16 : 18;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${diameter}" height="${diameter}" viewBox="0 0 ${diameter} ${diameter}">
      <circle cx="${diameter / 2}" cy="${diameter / 2}" r="${diameter / 2 - 2}" fill="#2f8a64" fill-opacity="0.22" stroke="#2f8a64" stroke-width="3"/>
      <circle cx="${diameter / 2}" cy="${diameter / 2}" r="${diameter / 2 - 10}" fill="#2f8a64" stroke="#ffffff" stroke-width="2"/>
      <text x="50%" y="50%" dy="0.34em" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="#ffffff">${count}</text>
    </svg>
  `)}`;
}

function clusterVenues(venues: MarkerVenue[], zoom: number): VenueCluster[] {
  if (zoom >= CLUSTER_ZOOM_THRESHOLD) {
    return venues.map((venue) => ({
      id: venue.venue_id,
      position: venue.position,
      venues: [venue],
    }));
  }

  const cellSize = getClusterCellSize(zoom);
  const clusterMap = new globalThis.Map<string, MarkerVenue[]>();

  venues.forEach((venue) => {
    const latKey = Math.floor(venue.position.lat / cellSize);
    const lngKey = Math.floor(venue.position.lng / cellSize);
    const key = `${latKey}:${lngKey}`;
    const bucket = clusterMap.get(key) ?? [];
    bucket.push(venue);
    clusterMap.set(key, bucket);
  });

  return Array.from(clusterMap.entries()).map(([key, clusterVenues]) => {
    const lat =
      clusterVenues.reduce((sum, venue) => sum + venue.position.lat, 0) /
      clusterVenues.length;
    const lng =
      clusterVenues.reduce((sum, venue) => sum + venue.position.lng, 0) /
      clusterVenues.length;

    return {
      id: key,
      position: { lat, lng },
      venues: clusterVenues,
    };
  });
}

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
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;
    fitMapToVenues(venues, userLocation, map, zoom);
  }, [map, venues, userLocation, zoom]);

  useEffect(() => {
    if (!map) return;

    setCurrentZoom(map.getZoom() ?? zoom);
    const listener = map.addListener("zoom_changed", () => {
      setCurrentZoom(map.getZoom() ?? zoom);
    });

    return () => listener.remove();
  }, [map, zoom]);

  useEffect(() => {
    if (!selectedVenueId || venues.some((venue) => venue.venue_id === selectedVenueId)) return;
    setSelectedVenueId(null);
  }, [selectedVenueId, venues]);

  useEffect(() => {
    if (!hoveredVenueId || venues.some((venue) => venue.venue_id === hoveredVenueId)) return;
    setHoveredVenueId(null);
  }, [hoveredVenueId, venues]);

  const selectedVenue = venues.find((venue) => venue.venue_id === selectedVenueId) ?? null;
  const venueClusters = useMemo(
    () => clusterVenues(venues, currentZoom),
    [venues, currentZoom]
  );

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

      {venueClusters.map((cluster) => {
        if (cluster.venues.length === 1) {
          const venue = cluster.venues[0];

          return (
            <Marker
              key={venue.venue_id}
              position={venue.position}
              title={venue.name}
              icon={
                hoveredVenueId === venue.venue_id
                  ? VENUE_MARKER_HOVER_ICON
                  : VENUE_MARKER_ICON
              }
              zIndex={hoveredVenueId === venue.venue_id ? 950 : undefined}
              onMouseOver={() => setHoveredVenueId(venue.venue_id)}
              onMouseOut={() => setHoveredVenueId(null)}
              onClick={() => {
                setSelectedVenueId(venue.venue_id);
                map?.panTo(venue.position);
              }}
            />
          );
        }

        return (
          <Marker
            key={cluster.id}
            position={cluster.position}
            title={`${cluster.venues.length} venues in this area`}
            zIndex={900}
            icon={buildClusterIcon(cluster.venues.length)}
            onClick={() => {
              setSelectedVenueId(null);
              map?.panTo(cluster.position);
              map?.setZoom(Math.max((map.getZoom() ?? currentZoom) + 2, CLUSTER_ZOOM_THRESHOLD));
            }}
          />
        );
      })}

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
                Rating: {formatVenueRating(selectedVenue.rating)}
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
              {typeof selectedVenue.hourly_price === "number"
                ? `$${selectedVenue.hourly_price.toFixed(2)}/hr`
                : "Price unavailable"}
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
