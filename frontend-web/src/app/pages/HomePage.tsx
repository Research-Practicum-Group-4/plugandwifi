import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Search,
  LayoutGrid,
  Map,
  Wifi,
  Phone,
  Star,
  Accessibility,
  ChevronDown,
  Zap,
  Navigation,
  Volume,
  Loader2,
  MapPin,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { api } from "../../services/api";
import { MapView } from "../components/MapView";
import { ManhattanMap } from "../components/ManhattanMap";
import { manhattanVenues } from "../data/manhattanVenues";
import { enrichVenue, EnrichedVenue, venueImage, busynessDisplay } from "../utils/venueEnrichment";

const PAGE_SIZE = 6;

const EDI_BADGE_STYLES: Record<string, React.CSSProperties> = {
  "WBE-Certified":    { background: "repeating-linear-gradient(90deg, transparent, transparent 25%, #9333ea 25%, #9333ea 50%, transparent 50%, transparent 75%, #9333ea 75%, #9333ea 100%)" },
  "MBE-Certified":    { background: "repeating-linear-gradient(90deg, transparent, transparent 33%, #78350f 33%, #78350f 66%, #000000 66%, #000000 100%)" },
  "LGBT+ Friendly":   { background: "linear-gradient(90deg, #e40303 0%, #e40303 16.67%, #ff8c00 16.67%, #ff8c00 33.33%, #ffed00 33.33%, #ffed00 50%, #008026 50%, #008026 66.67%, #24408e 66.67%, #24408e 83.33%, #732982 83.33%, #732982 100%)" },
  "B-Corp Certified": { backgroundColor: "#2d6a4f" },
  "VBE-Certified":    { backgroundColor: "#1d4ed8" },
};

function getSuitabilityColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s <= 50) return `rgb(200, ${Math.round((s / 50) * 180)}, 0)`;
  return `rgb(${Math.round(40 + ((100 - s) / 50) * 160)}, 180, 0)`;
}


type GeoState = "idle" | "requesting" | "granted" | "denied";

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [showOwnedByFilters, setShowOwnedByFilters] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // Geolocation state machine
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // API venue state
  const [venues, setVenues] = useState<EnrichedVenue[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Fallback show-more state (used when API fails)
  const [fallbackVisible, setFallbackVisible] = useState(PAGE_SIZE);

  const locationSuggestions = [
    "Midtown Manhattan",
    "Times Square",
    "Bryant Park",
    "Grand Central",
    "Chelsea",
    "Soho",
    "Union Square",
    "Flatiron District",
  ].filter((loc) => loc.toLowerCase().includes(searchQuery.toLowerCase()));

  const fetchVenues = useCallback(async (coords?: { lat: number; lon: number }) => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await api.getVenues({
        page: 1,
        limit: 200,
        ...(coords ? { lat: coords.lat, lon: coords.lon, radius: 5 } : {}),
      });
      const sorted = [...data.items].sort((a, b) => b.rating - a.rating);
      setVenues(sorted.map(enrichVenue));
      setVisibleCount(PAGE_SIZE);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Request browser geolocation on mount; fetch venues once we know coords (or skip)
  useEffect(() => {
    if (!navigator.geolocation) {
      fetchVenues();
      return;
    }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        setGeoState("granted");
        fetchVenues(coords);
      },
      () => {
        setGeoState("denied");
        fetchVenues(); // fall back — unfiltered venue list
      },
      { timeout: 8000 }
    );
  }, [fetchVenues]);

  const usingFallback = loadError || (!loading && venues.length === 0 && geoState !== "requesting");
  const visibleVenues = usingFallback ? [] : venues.slice(0, visibleCount);
  const hasMore = !usingFallback && visibleCount < venues.length;
  const isLoadingOrGeo = loading || geoState === "requesting";

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="mb-4">Because all you need is a Plug & Wifi</h1>
        <p className="text-muted-foreground mb-8">
          Book quality workspace with WiFi and power outlets in hotel lobbies, cafes, and lounges
        </p>

        {/* Geo denied nudge */}
        {geoState === "denied" && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <MapPin className="size-4" />
            <span>Enable location for nearby results — showing all venues for now</span>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              placeholder="Search by city or venue..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowLocationSuggestions(e.target.value.length > 0);
              }}
              onFocus={() => setShowLocationSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
              className="pl-10 h-12"
            />
            {showLocationSuggestions && locationSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
                {locationSuggestions.map((location, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchQuery(location);
                      setShowLocationSuggestions(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Navigation className="size-4 text-muted-foreground" />
                    <span>{location}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="lg" className="h-12 px-6">
                {date ? format(date, "MMM dd") : "Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={setDate} />
            </PopoverContent>
          </Popover>
          <Button
            size="lg"
            className="h-12 px-8 cursor-pointer"
            style={{ backgroundColor: "#2f8a64" }}
            onClick={() => {
              const params = new URLSearchParams();
              if (searchQuery) params.set("query", searchQuery);
              if (date) params.set("date", format(date, "yyyy-MM-dd"));
              navigate(`/search?${params.toString()}`);
            }}
          >
            Search
          </Button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm">
            <Wifi className="size-4 mr-2" />
            WiFi Available
          </Button>
          <Button variant="outline" size="sm">
            <Phone className="size-4 mr-2" />
            Calls Allowed
          </Button>
          <Button variant="outline" size="sm">
            <Star className="size-4 mr-2" />
            4+ Stars
          </Button>
          <Button variant="outline" size="sm">
            <Accessibility className="size-4 mr-2" />
            Accessibility Friendly
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOwnedByFilters(!showOwnedByFilters)}
          >
            You'll love these...
            <ChevronDown
              className={`size-4 ml-2 transition-transform ${showOwnedByFilters ? "rotate-180" : ""}`}
            />
          </Button>
          {showOwnedByFilters && (
            <>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span className="absolute inset-0 opacity-20" style={EDI_BADGE_STYLES["WBE-Certified"]} />
                <span className="relative z-10">WBE-Certified</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span className="absolute inset-0 opacity-20" style={EDI_BADGE_STYLES["MBE-Certified"]} />
                <span className="relative z-10">MBE-Certified</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span className="absolute inset-0 opacity-25" style={EDI_BADGE_STYLES["LGBT+ Friendly"]} />
                <span className="relative z-10">LGBT+ Friendly</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span className="absolute inset-0 opacity-15 rounded" style={EDI_BADGE_STYLES["B-Corp Certified"]} />
                <span className="relative z-10">B-Corp Certified</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span className="absolute inset-0 opacity-15 rounded" style={EDI_BADGE_STYLES["VBE-Certified"]} />
                <span className="relative z-10">VBE-Certified</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-8">
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "grid" | "map")}
          className="w-auto"
        >
          <TabsList className="grid w-[300px] grid-cols-2">
            <TabsTrigger value="grid" className="flex items-center gap-2">
              <LayoutGrid className="size-4" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="size-4" />
              Map
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Venue listing */}
      <div className="mb-12">
        <h2 className="mb-6">
          {geoState === "granted" && userCoords ? "Available Near You" : "Available Workspaces"}
        </h2>

        {/* Loading / geo requesting */}
        {isLoadingOrGeo && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>
              {geoState === "requesting" ? "Getting your location…" : "Loading workspaces…"}
            </span>
          </div>
        )}

        {/* Error state */}
        {!isLoadingOrGeo && loadError && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">Couldn't load venues right now.</p>
            <Button variant="outline" onClick={() => fetchVenues(userCoords ?? undefined)}>
              Retry
            </Button>
          </div>
        )}

        {/* Grid — API venues */}
        {!isLoadingOrGeo && !usingFallback && viewMode === "grid" && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {visibleVenues.map((venue) => {
                const busyness = busynessDisplay(venue.venue_id, venue.busyness_score);
                const suitability = venue.suitability_score != null
                  ? Math.round(venue.suitability_score)
                  : Math.round(venue.rating * 20);
                return (
                  <Card key={venue.venue_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      <VenuePhoto venue={venue} />
                    </div>
                    <CardContent className="pt-4 space-y-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${busyness.color}`}>
                        {busyness.label}
                      </span>

                      <div className="flex items-start justify-between">
                        <h4 className="flex-1 pr-2">{venue.name}</h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                          <span>{venue.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Suitability for you</span>
                        <span
                          className="font-semibold"
                          style={{ color: getSuitabilityColor(suitability) }}
                        >
                          {suitability}/100
                        </span>
                      </div>

                      <p className="text-muted-foreground text-sm">
                        {venue.cuisine_type} • {venue.distance_km.toFixed(1)}km away
                      </p>

                      <div className="flex items-center gap-3 text-muted-foreground">
                        {venue.has_wifi && <Wifi className="size-4" title="WiFi Available" />}
                        <Zap className="size-4" title="Power Outlets" />
                        {venue.noise_level === "quiet" && (
                          <Volume className="size-4" title="Quiet Environment" />
                        )}
                        <div className="flex items-center gap-1 text-sm ml-auto">
                          <Navigation className="size-4" />
                          {venue.distance_km.toFixed(1)}km
                        </div>
                      </div>

                      {/* EDI certification badges */}
                      {venue.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {venue.certifications.map((cert) => (
                            <span
                              key={cert}
                              className="relative inline-block text-xs font-medium px-2 py-0.5 rounded border border-border overflow-hidden"
                            >
                              <span className="absolute inset-0 opacity-15" style={EDI_BADGE_STYLES[cert]} />
                              <span className="relative z-10">{cert}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <p style={{ color: "#2f8a64" }}>${venue.enrichedPrice}/hour</p>
                        <Button
                          size="sm"
                          style={{ backgroundColor: "#253c50" }}
                          onClick={() => navigate(`/venue/${venue.venue_id}`)}
                        >
                          Book a Space
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Show More Venues ({venues.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}

        {/* Map — API venues (pass full sorted list, not just the visible slice) */}
        {!isLoadingOrGeo && !usingFallback && viewMode === "map" && (
          <Card className="h-[600px] overflow-hidden border border-border shadow-sm">
            <MapView venues={venues} height="600px" />
          </Card>
        )}

        {/* Fallback grid — API failed or returned empty */}
        {!isLoadingOrGeo && usingFallback && viewMode === "grid" && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {manhattanVenues.slice(0, fallbackVisible).map((venue) => {
                const busyness = busynessDisplay(String(venue.id));
                return (
                  <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative overflow-hidden">
                      <img src={venue.image} alt={venue.name} className="w-full h-full object-cover" />
                    </div>
                    <CardContent className="pt-4 space-y-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${busyness.color}`}>
                        {busyness.label}
                      </span>
                      <div className="flex items-start justify-between">
                        <h4>{venue.name}</h4>
                        <div className="flex items-center gap-1">
                          <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                          <span>{venue.rating}</span>
                        </div>
                      </div>
                      {venue.suitabilityScore !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Suitability for you</span>
                          <span
                            className="font-semibold"
                            style={{ color: getSuitabilityColor(venue.suitabilityScore) }}
                          >
                            {venue.suitabilityScore}/100
                          </span>
                        </div>
                      )}
                          <p className="text-muted-foreground text-sm">
                            {venue.cuisine_type} • {venue.distance_km}km away
                          </p>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {venue.has_wifi && (
                              <div className="flex items-center gap-1" title="WiFi Available">
                                <Wifi className="size-4" />
                              </div>
                            )}
                            <div className="flex items-center gap-1" title="Power Outlets">
                              <Zap className="size-4" />
                            </div>
                            {venue.calls_allowed && (
                              <div className="flex items-center gap-1" title="Calls Allowed">
                                <Volume className="size-4" />
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-sm">
                              <Navigation className="size-4" />
                              {venue.distance_km}km
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p style={{ color: "#2f8a64" }}>${venue.hourly_price}/hour</p>
                            <Button
                              size="sm"
                              style={{ backgroundColor: "#253c50" }}
                              onClick={() => navigate(`/venue/${venue.venue_id}`)}
                            >
                              Book a Space
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
            </div>
            {fallbackVisible < manhattanVenues.length && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    setFallbackVisible((v) => Math.min(v + PAGE_SIZE, manhattanVenues.length))
                  }
                >
                  Show More Venues ({manhattanVenues.length - fallbackVisible} remaining)
                </Button>
              </div>
            )}
          </>
        )}

        {/* Fallback map */}
        {!isLoadingOrGeo && usingFallback && viewMode === "map" && (
          <ManhattanMap venues={manhattanVenues} height="600px" />
        )}
      </div>
    </div>
  );
}

function VenuePhoto({ venue }: { venue: EnrichedVenue }) {
  return (
    <img
      src={venueImage(venue.venue_id, venue.cuisine_type)}
      alt={venue.name}
      className="w-full h-full object-cover"
    />
  );
}
