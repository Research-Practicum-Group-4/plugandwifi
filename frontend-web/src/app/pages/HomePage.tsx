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
  MapPin,
  Wifi,
  Phone,
  Star,
  Accessibility,
  ChevronDown,
  Zap,
  Navigation,
  Volume,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { api } from "../../services/api";
import { MapView } from "../components/MapView";
import { enrichVenue, EnrichedVenue, busynessDisplay } from "../utils/venueEnrichment";

const PAGE_SIZE = 6;
const HOME_VENUES_CACHE_PREFIX = "home-venues-cache:";
const HOME_VENUES_CACHE_TTL_MS = 5 * 60 * 1000;

type HomeVenueFilters = {
  wifi: boolean;
  callsAllowed: boolean;
  fourPlusStars: boolean;
  accessibilityFriendly: boolean;
  wbeCertified: boolean;
  mbeCertified: boolean;
  lgbtFriendly: boolean;
  bcorpCertified: boolean;
  vbeCertified: boolean;
};

type HomeVenueCacheEntry = {
  timestamp: number;
  venues: EnrichedVenue[];
};

const DEFAULT_HOME_FILTERS: HomeVenueFilters = {
  wifi: false,
  callsAllowed: false,
  fourPlusStars: false,
  accessibilityFriendly: false,
  wbeCertified: false,
  mbeCertified: false,
  lgbtFriendly: false,
  bcorpCertified: false,
  vbeCertified: false,
};

const EDI_BADGE_STYLES: Record<string, React.CSSProperties> = {
  "WBE-Certified": { background: "repeating-linear-gradient(90deg, transparent, transparent 25%, #9333ea 25%, #9333ea 50%, transparent 50%, transparent 75%, #9333ea 75%, #9333ea 100%)" },
  "MBE-Certified": { background: "repeating-linear-gradient(90deg, transparent, transparent 33%, #78350f 33%, #78350f 66%, #000000 66%, #000000 100%)" },
  "LGBT+ Friendly": { background: "linear-gradient(90deg, #e40303 0%, #e40303 16.67%, #ff8c00 16.67%, #ff8c00 33.33%, #ffed00 33.33%, #ffed00 50%, #008026 50%, #008026 66.67%, #24408e 66.67%, #24408e 83.33%, #732982 83.33%, #732982 100%)" },
  "B-Corp Certified": { backgroundColor: "#2d6a4f" },
  "VBE-Certified": { backgroundColor: "#1d4ed8" },
};

function getSuitabilityColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s <= 50) return `rgb(200, ${Math.round((s / 50) * 180)}, 0)`;
  return `rgb(${Math.round(40 + ((100 - s) / 50) * 160)}, 180, 0)`;
}

function buildHomeVenueCacheKey(filters: HomeVenueFilters): string {
  return `${HOME_VENUES_CACHE_PREFIX}${JSON.stringify(filters)}`;
}

function readCachedHomeVenues(filters: HomeVenueFilters): EnrichedVenue[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(buildHomeVenueCacheKey(filters));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as HomeVenueCacheEntry;
    if (!parsed?.timestamp || !Array.isArray(parsed.venues)) return null;
    if (Date.now() - parsed.timestamp > HOME_VENUES_CACHE_TTL_MS) return null;

    return parsed.venues;
  } catch {
    return null;
  }
}

function writeCachedHomeVenues(filters: HomeVenueFilters, venues: EnrichedVenue[]) {
  if (typeof window === "undefined") return;

  try {
    const entry: HomeVenueCacheEntry = {
      timestamp: Date.now(),
      venues,
    };
    window.localStorage.setItem(buildHomeVenueCacheKey(filters), JSON.stringify(entry));
  } catch {
    // Ignore quota and serialization failures.
  }
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [showOwnedByFilters, setShowOwnedByFilters] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [filters, setFilters] = useState<HomeVenueFilters>(DEFAULT_HOME_FILTERS);
  const [venues, setVenues] = useState<EnrichedVenue[]>(() => readCachedHomeVenues(DEFAULT_HOME_FILTERS) ?? []);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(() => readCachedHomeVenues(DEFAULT_HOME_FILTERS) === null);
  const [loadError, setLoadError] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);

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

  const fetchVenues = useCallback(async () => {
    const cachedVenues = readCachedHomeVenues(filters);
    if (cachedVenues) {
      setVenues(cachedVenues);
      setVisibleCount(PAGE_SIZE);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setLoadError(false);

    try {
      const data = await api.getVenues({
        page: 1,
        limit: 200,
        sort: "recommended",
        wifi: filters.wifi ? true : undefined,
        calls_allowed: filters.callsAllowed ? true : undefined,
        accessibility_friendly: filters.accessibilityFriendly ? true : undefined,
        wbe_certified: filters.wbeCertified ? true : undefined,
        mbe_certified: filters.mbeCertified ? true : undefined,
        lgbt_friendly: filters.lgbtFriendly ? true : undefined,
        bcorp_certified: filters.bcorpCertified ? true : undefined,
        vbe_certified: filters.vbeCertified ? true : undefined,
      });
      const filteredItems = filters.fourPlusStars
        ? data.items.filter((venue) => venue.rating >= 4)
        : data.items;
      const sorted = [...filteredItems].sort((a, b) => {
        const suitabilityDiff = (b.suitability_score ?? -1) - (a.suitability_score ?? -1);
        if (suitabilityDiff !== 0) return suitabilityDiff;
        return b.rating - a.rating;
      });
      const enrichedVenues = sorted.map(enrichVenue);
      setVenues(enrichedVenues);
      writeCachedHomeVenues(filters, enrichedVenues);
      setVisibleCount(PAGE_SIZE);
    } catch {
      if (!cachedVenues) {
        setVenues([]);
      }
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationEnabled(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        // Native Chrome popup fires normally; coordinates are pinned to Midtown Manhattan
        // so the demo works regardless of the user's real location.
        setLocationEnabled(true);
      },
      () => setLocationEnabled(false),
    );
  }, []);

  const visibleVenues = venues.slice(0, visibleCount);
  const hasMore = visibleCount < venues.length;
  const venueHeading = locationEnabled ? "Available Near You" : "Venue Recommendations for You";

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="mb-4">Because all you need is a Plug & Wifi</h1>
        <p className="text-muted-foreground mb-8">
          Book quality workspace with WiFi and power outlets in hotel lobbies, cafes, and lounges
        </p>

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

        <div className="flex flex-wrap gap-2 justify-center">
          <Button
            variant={filters.wifi ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters((current) => ({ ...current, wifi: !current.wifi }))}
          >
            <Wifi className="size-4 mr-2" />
            WiFi Available
          </Button>
          <Button
            variant={filters.callsAllowed ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters((current) => ({ ...current, callsAllowed: !current.callsAllowed }))}
          >
            <Phone className="size-4 mr-2" />
            Calls Allowed
          </Button>
          <Button
            variant={filters.fourPlusStars ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters((current) => ({ ...current, fourPlusStars: !current.fourPlusStars }))}
          >
            <Star className="size-4 mr-2" />
            4+ Stars
          </Button>
          <Button
            variant={filters.accessibilityFriendly ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                accessibilityFriendly: !current.accessibilityFriendly,
              }))
            }
          >
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
              <Button
                variant={filters.wbeCertified ? "default" : "outline"}
                size="sm"
                className="relative overflow-hidden"
                onClick={() => setFilters((current) => ({ ...current, wbeCertified: !current.wbeCertified }))}
              >
                <span className="absolute inset-0 opacity-20" style={EDI_BADGE_STYLES["WBE-Certified"]} />
                <span className="relative z-10">WBE-Certified</span>
              </Button>
              <Button
                variant={filters.mbeCertified ? "default" : "outline"}
                size="sm"
                className="relative overflow-hidden"
                onClick={() => setFilters((current) => ({ ...current, mbeCertified: !current.mbeCertified }))}
              >
                <span className="absolute inset-0 opacity-20" style={EDI_BADGE_STYLES["MBE-Certified"]} />
                <span className="relative z-10">MBE-Certified</span>
              </Button>
              <Button
                variant={filters.lgbtFriendly ? "default" : "outline"}
                size="sm"
                className="relative overflow-hidden"
                onClick={() => setFilters((current) => ({ ...current, lgbtFriendly: !current.lgbtFriendly }))}
              >
                <span className="absolute inset-0 opacity-25" style={EDI_BADGE_STYLES["LGBT+ Friendly"]} />
                <span className="relative z-10">LGBT+ Friendly</span>
              </Button>
              <Button
                variant={filters.bcorpCertified ? "default" : "outline"}
                size="sm"
                className="relative overflow-hidden"
                onClick={() => setFilters((current) => ({ ...current, bcorpCertified: !current.bcorpCertified }))}
              >
                <span className="absolute inset-0 opacity-15 rounded" style={EDI_BADGE_STYLES["B-Corp Certified"]} />
                <span className="relative z-10">B-Corp Certified</span>
              </Button>
              <Button
                variant={filters.vbeCertified ? "default" : "outline"}
                size="sm"
                className="relative overflow-hidden"
                onClick={() => setFilters((current) => ({ ...current, vbeCertified: !current.vbeCertified }))}
              >
                <span className="absolute inset-0 opacity-15 rounded" style={EDI_BADGE_STYLES["VBE-Certified"]} />
                <span className="relative z-10">VBE-Certified</span>
              </Button>
            </>
          )}
        </div>
      </div>

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

      <div className="mb-12">
        <div className="mb-6 space-y-2">
          <h2>{venueHeading}</h2>
          {locationEnabled === false && (
            <p className="text-sm text-muted-foreground">
              Enable location for nearby results.
            </p>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span>Loading recommendations...</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">Couldn't load venue recommendations right now.</p>
            <Button variant="outline" onClick={() => fetchVenues()}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !loadError && venues.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            No venue recommendations are available yet.
          </div>
        )}

        {!loading && !loadError && venues.length > 0 && viewMode === "grid" && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {visibleVenues.map((venue) => {
                const busyness = busynessDisplay(venue.venue_id, venue.busyness_score, venue.busyness_label);
                const suitability = venue.suitability_score != null
                  ? Math.round(venue.suitability_score)
                  : Math.round(venue.rating * 20);

                return (
                  <Card key={venue.venue_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="pt-4 space-y-3">
                      <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-4">
                        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                          {(venue.osm_type ?? venue.cuisine_type ?? "workspace").replace(/_/g, " ")}
                        </p>
                        <h4 className="mt-2 text-xl font-bold leading-tight text-foreground">
                          {venue.name}
                        </h4>
                      </div>

                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${busyness.color}`}>
                        {busyness.label}
                      </span>

                      <div className="flex items-start justify-between">
                        <div className="flex flex-1 items-center gap-2 pr-2 text-sm text-muted-foreground">
                          <MapPin className="size-4" />
                          <span>{venue.borough ?? "Manhattan"}</span>
                        </div>
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
                        {venue.cuisine_type} • {venue.borough ?? "Workspace"}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                        {venue.has_wifi && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                            <Wifi className="size-3.5" />
                            WiFi
                          </span>
                        )}
                        {(venue.plug_access ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                            <Zap className="size-3.5" />
                            Plug Access
                          </span>
                        )}
                        {venue.calls_allowed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                            <Volume className="size-3.5" />
                            Calls Allowed
                          </span>
                        )}
                        {venue.distance_km > 0 && (
                          <div className="flex items-center gap-1 text-sm ml-auto">
                            <Navigation className="size-4" />
                            {venue.distance_km.toFixed(1)}km
                          </div>
                        )}
                      </div>

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

        {!loading && !loadError && venues.length > 0 && viewMode === "map" && (
          <Card className="h-[600px] overflow-hidden border border-border shadow-sm">
            <MapView venues={venues} height="600px" />
          </Card>
        )}
      </div>
    </div>
  );
}
