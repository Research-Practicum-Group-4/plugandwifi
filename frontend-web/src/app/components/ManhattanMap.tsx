import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { MapPin, Star } from "lucide-react";
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
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(venues[0]?.id ?? null);

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? venues[0] ?? null,
    [selectedVenueId, venues]
  );

  if (venues.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"
        style={{ height }}
      >
        No venues available.
      </div>
    );
  }

  return (
    <div
      className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[260px_1fr]"
      style={{ minHeight: height }}
    >
      <aside className="border-b border-border bg-muted/30 p-4 md:border-b-0 md:border-r">
        <p className="mb-3 text-sm font-medium text-muted-foreground">Venue locations</p>
        <div className="space-y-2">
          {venues.map((venue) => (
            <button
              key={venue.id}
              type="button"
              className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                venue.id === selectedVenue?.id
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-border bg-background hover:bg-accent"
              }`}
              onClick={() => setSelectedVenueId(venue.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{venue.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {venue.lat.toFixed(4)}, {venue.lng.toFixed(4)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="size-3.5 fill-yellow-400 stroke-yellow-400" />
                  <span>{venue.rating.toFixed(1)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="relative flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(47,138,100,0.18),_transparent_42%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] p-6">
        <div className="absolute inset-0 opacity-40">
          <div className="h-full w-full bg-[linear-gradient(to_right,rgba(37,60,80,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,60,80,0.08)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {venues.map((venue) => {
          const left = `${((venue.lng + 74.02) / 0.06) * 100}%`;
          const top = `${((40.81 - venue.lat) / 0.09) * 100}%`;

          return (
            <button
              key={venue.id}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left, top }}
              onClick={() => setSelectedVenueId(venue.id)}
            >
              <span
                className={`flex size-8 items-center justify-center rounded-full border-2 text-white shadow-md transition-transform ${
                  venue.id === selectedVenue?.id
                    ? "scale-110 border-emerald-700 bg-emerald-600"
                    : "border-slate-700 bg-slate-800"
                }`}
              >
                <MapPin className="size-4" />
              </span>
            </button>
          );
        })}

        {selectedVenue && (
          <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background/95 p-5 shadow-xl backdrop-blur">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold">{selectedVenue.name}</h4>
                <p className="text-sm text-muted-foreground">Approximate Manhattan location view</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                <span>{selectedVenue.rating.toFixed(1)}</span>
              </div>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              ${selectedVenue.price}/hour
            </p>

            <Button
              className="w-full"
              style={{ backgroundColor: "#2f8a64" }}
              onClick={() => navigate(`/venue/${selectedVenue.id}`)}
            >
              Book a Space
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
