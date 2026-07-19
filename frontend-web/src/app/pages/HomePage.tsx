import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, LayoutGrid, Map } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { api } from "../../services/api";
import { Venue } from "../../types/api";
import { MapView } from "../components/MapView";

const OWNERSHIP_CHIPS = ["WBE", "MBE", "LGBT+", "B-Corp", "VBE"];

function getSuitabilityColor(score: number): string {
  if (score >= 80) return "#2f8a64";
  if (score >= 55) return "#f59e0b";
  if (score >= 30) return "#ef4444";
  return "#6b7280";
}

export function HomePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [activeOwnershipChips, setActiveOwnershipChips] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    api.getVenues({ page: currentPage, limit })
      .then((data) => {
        setVenues(data.items);
        setHasMore(data.has_more);
        setTotalPages(data.total_pages || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch venues:", err);
        setLoading(false);
      });
  }, [currentPage, limit]);

  const toggleChip = (chip: string) => {
    setActiveOwnershipChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const getVenueImage = (venueId: string) => {
    const images: Record<string, string> = {
      "osm_12345": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
      "osm_12346": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
      "osm_12347": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      "osm_12348": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
      "osm_12349": "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400",
    };
    return images[venueId] || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400";
  };


  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="mb-4">Find Your Perfect Workspace</h1>
        <p className="text-muted-foreground mb-8">
          Book quality workspace with WiFi and power outlets in hotel lobbies, cafes, and lounges
        </p>

        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              placeholder="Search by city or venue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
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
            style={{ backgroundColor: '#2f8a64' }}
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

        {/* Ownership filter chips */}
        <div className="mb-2">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
            You'll love these certified spaces
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {OWNERSHIP_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
                  activeOwnershipChips.includes(chip)
                    ? "text-white border-transparent"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
                style={
                  activeOwnershipChips.includes(chip)
                    ? { backgroundColor: "#253c50", borderColor: "#253c50" }
                    : {}
                }
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center mb-8">
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "map")} className="w-auto">
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

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading workspaces...</div>
        ) : viewMode === "grid" ? (
          <div className="grid md:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <Card key={venue.venue_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={getVenueImage(venue.venue_id)}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Suitability score badge */}
                  <div
                    className="absolute top-2 right-2 size-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
                    style={{ backgroundColor: getSuitabilityColor(venue.rating * 20) }}
                  >
                    {Math.round(venue.rating * 20)}
                  </div>
                </div>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4>{venue.name}</h4>
                    <span className="text-sm text-muted-foreground">⭐ {venue.rating}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {venue.distance_km} km away • {venue.cuisine_type}
                  </p>
                  <div className="flex items-center justify-between">
                    <p style={{ color: '#2f8a64' }}>${venue.hourly_price}/hour</p>
                    <Button
                      size="sm"
                      style={{ backgroundColor: '#253c50' }}
                      onClick={() => navigate(`/venue/${venue.venue_id}`)}
                    >
                      Book a Space
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="h-[600px] overflow-hidden border border-border shadow-sm">
            <MapView venues={venues} height="600px" />
          </Card>
        )}

        {/* Pagination controls */}
        {!loading && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
              className="px-4 py-2"
            >
              Previous
            </Button>
            <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1.5 rounded-md">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setCurrentPage(prev => prev + 1);
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              disabled={!hasMore}
              className="px-4 py-2"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
