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
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { api } from "../../services/api";
import { Venue } from "../../types/api";
import { MapView } from "../components/MapView";
import { ManhattanMap } from "../components/ManhattanMap";
import { manhattanVenues } from "../data/manhattanVenues";

// Helper function to calculate color gradient from red (0) to green (100)
function getSuitabilityColor(score: number): string {
  const clampedScore = Math.max(0, Math.min(100, score));
  if (clampedScore <= 50) {
    const green = Math.round((clampedScore / 50) * 180);
    return `rgb(200, ${green}, 0)`;
  } else {
    const red = Math.round(40 + ((100 - clampedScore) / 50) * 160);
    return `rgb(${red}, 180, 0)`;
  }
}

const busynessLevels = [
  { label: "You'll be the first one", color: "bg-emerald-100 text-emerald-700" },
  { label: "It's a tiny group today", color: "bg-teal-100 text-teal-700" },
  { label: "It's a normal day", color: "bg-blue-100 text-blue-700" },
  { label: "It's a busy day", color: "bg-orange-100 text-orange-700" },
  { label: "It's a full house!", color: "bg-red-100 text-red-700" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [showOwnedByFilters, setShowOwnedByFilters] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  // API state
  const [apiVenues, setApiVenues] = useState<Venue[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiFailed, setApiFailed] = useState(false);

  // "Show More" pagination state (for fallback data)
  const [visibleVenues, setVisibleVenues] = useState(6);

  // Manhattan neighborhoods for autocomplete
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

  useEffect(() => {
    setApiLoading(true);
    api
      .getVenues({ page: 1, limit: 18 })
      .then((data: any) => {
        const venuesList = Array.isArray(data) ? data : (data?.items || []);
        setApiVenues(venuesList);
        setApiFailed(false);
        setApiLoading(false);
        })
      .catch((err) => {
        console.error("Failed to fetch venues from API, using fallback data:", err);
        setApiFailed(true);
        setApiLoading(false);
      });
  }, []);

  // Determine which venues to display
  const usingFallback = apiFailed || (!apiLoading && (!apiVenues || apiVenues.length === 0));

  const getApiVenueImage = (venueId: string) => {
    // ** HARDCODED **
    const images: Record<string, string> = {
      osm_12345: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
      osm_12346: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
      osm_12347: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      osm_12348: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
      osm_12349: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
    };
    return images[venueId] || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400";
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
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
              onFocus={() => setShowLocationSuggestions(searchQuery?.length > 0)}
              onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
              className="pl-10 h-12"
            />
            {showLocationSuggestions && locationSuggestions?.length > 0 && (
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

        {/* Filter chips with icons */}
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
                <span
                  className="absolute inset-0 opacity-20"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, transparent, transparent 25%, #9333ea 25%, #9333ea 50%, transparent 50%, transparent 75%, #9333ea 75%, #9333ea 100%)",
                  }}
                />
                <span className="relative z-10">WBE-Certified</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span
                  className="absolute inset-0 opacity-20"
                  style={{
                    background:
                      "repeating-linear-gradient(90deg, transparent, transparent 33%, #78350f 33%, #78350f 66%, #000000 66%, #000000 100%)",
                  }}
                />
                <span className="relative z-10">MBE-Certified</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span
                  className="absolute inset-0 opacity-25"
                  style={{
                    background:
                      "linear-gradient(90deg, #e40303 0%, #e40303 16.67%, #ff8c00 16.67%, #ff8c00 33.33%, #ffed00 33.33%, #ffed00 50%, #008026 50%, #008026 66.67%, #24408e 66.67%, #24408e 83.33%, #732982 83.33%, #732982 100%)",
                  }}
                />
                <span className="relative z-10">LGBT+ Friendly</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span
                  className="absolute inset-0 opacity-15 rounded"
                  style={{ backgroundColor: "#2d6a4f" }}
                />
                <span className="relative z-10">B-Corp Certified</span>
              </Button>
              <Button variant="outline" size="sm" className="relative overflow-hidden">
                <span
                  className="absolute inset-0 opacity-15 rounded"
                  style={{ backgroundColor: "#1d4ed8" }}
                />
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

      {/* Nearby Suggestions */}
      <div className="mb-12">
        <h2 className="mb-6">Available Near You</h2>

        {apiLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading workspaces...</div>
        ) : viewMode === "grid" ? (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              {usingFallback
                ? (manhattanVenues || []).slice(0, visibleVenues).map((venue) => {
                    const busyness = busynessLevels[Math.abs(typeof venue.id === 'number' ? venue.id : 0) % (busynessLevels?.length || 1)] || busynessLevels[0];
                    return (
                      <Card
                        key={venue.id}
                        className="overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={venue.image}
                            alt={venue.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="pt-4 space-y-3">
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${busyness.color}`}
                          >
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
                            <div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Suitability for you</span>
                                <span
                                  className="font-semibold"
                                  style={{ color: getSuitabilityColor(venue.suitabilityScore) }}
                                >
                                  {venue.suitabilityScore}/100
                                </span>
                              </div>
                            </div>
                          )}
                          <p className="text-muted-foreground text-sm">
                            {venue.type} • {venue.availability}
                          </p>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <div className="flex items-center gap-1" title="WiFi Available">
                              <Wifi className="size-4" />
                            </div>
                            <div className="flex items-center gap-1" title="Power Outlets">
                              <Zap className="size-4" />
                            </div>
                            <div className="flex items-center gap-1" title="Quiet Environment">
                              <Volume className="size-4" />
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Navigation className="size-4" />
                              {venue.distance}km
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p style={{ color: "#2f8a64" }}>${venue.price}/hour</p>
                            <Button
                              size="sm"
                              style={{ backgroundColor: "#253c50" }}
                              onClick={() => navigate(`/venue/${venue.id}`)}
                            >
                              Book a Space
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                : (apiVenues || []).map((venue, idx) => {
                    const suitability = Math.round(venue.rating * 20);
                    const busyness = busynessLevels[idx % busynessLevels?.length];
                    return (
                      <Card
                        key={venue.venue_id}
                        className="overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <img
                            src={getApiVenueImage(venue.venue_id)}
                            alt={venue.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="pt-4 space-y-3">
                          <span
                            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${busyness.color}`}
                          >
                            {busyness.label}
                          </span>
                          <div className="flex items-start justify-between">
                            <h4>{venue.name}</h4>
                            <div className="flex items-center gap-1">
                              <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                              <span>{venue.rating}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Suitability for you</span>
                              <span
                                className="font-semibold"
                                style={{ color: getSuitabilityColor(suitability) }}
                              >
                                {suitability}/100
                              </span>
                            </div>
                          </div>
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

            {/* Show More button (only for fallback manhattanVenues) */}
            {usingFallback && visibleVenues < (manhattanVenues?.length || 0) && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() =>
                    setVisibleVenues((prev) => Math.min(prev + 6, manhattanVenues?.length || 0))
                  }
                >
                  Show More Venues ({(manhattanVenues?.length || 0) - visibleVenues} remaining)
                </Button>
              </div>
            )}
          </>
        ) : usingFallback ? (
          <ManhattanMap venues={manhattanVenues} height="600px" />
        ) : (
          <Card className="h-[600px] overflow-hidden border border-border shadow-sm">
            <MapView venues={apiVenues} height="600px" />
          </Card>
        )}
      </div>
    </div>
  );
}
