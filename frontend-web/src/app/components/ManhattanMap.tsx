import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";

interface Venue {
  id: number;
  name: string;
  price: number;
  rating: number;
  lat: number;
  lng: number;
}

interface ManhattanMapProps {
  venues: Venue[];
  height?: string;
}

export function ManhattanMap({ venues, height = "600px" }: ManhattanMapProps) {
  const navigate = useNavigate();
  const [selectedVenue, setSelectedVenue] = useState<number | null>(null);

  const center = { lat: 40.7831, lng: -73.9712 };
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height }}>
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-2">Google Maps API key required</p>
          <p className="text-sm text-muted-foreground">
            Set VITE_GOOGLE_MAPS_API_KEY in your environment variables
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        mapId="plug-wifi-map"
        style={{ height, width: "100%", borderRadius: "0.625rem" }}
        gestureHandling="greedy"
        disableDefaultUI={false}
      >
        {venues.map((venue) => (
          <AdvancedMarker
            key={venue.id}
            position={{ lat: venue.lat, lng: venue.lng }}
            onClick={() => setSelectedVenue(venue.id)}
          >
            <Pin
              background="#253c50"
              borderColor="#2f8a64"
              glyphColor="#ffffff"
            />
          </AdvancedMarker>
        ))}

        {selectedVenue && venues.find((v) => v.id === selectedVenue) && (
          <InfoWindow
            position={{
              lat: venues.find((v) => v.id === selectedVenue)!.lat,
              lng: venues.find((v) => v.id === selectedVenue)!.lng,
            }}
            onCloseClick={() => setSelectedVenue(null)}
          >
            <div className="p-2">
              <h4 className="mb-1">{venues.find((v) => v.id === selectedVenue)!.name}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                ${venues.find((v) => v.id === selectedVenue)!.price}/hour • ⭐{" "}
                {venues.find((v) => v.id === selectedVenue)!.rating}
              </p>
              <Button
                size="sm"
                className="w-full"
                style={{ backgroundColor: "#2f8a64" }}
                onClick={() => navigate(`/venue/${selectedVenue}`)}
              >
                Book a Space
              </Button>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
