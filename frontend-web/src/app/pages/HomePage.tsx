import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, Volume2, Phone, Star, MapPin, LayoutGrid, Map } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { api } from "../../services/api";
import { Venue } from "../../types/api";
import { useAuth } from "../contexts/AuthContext";

export function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setVenues([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    api.getVenues()
      .then((data) => {
        setVenues(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch venues:", err);
        setLoading(false);
      });
  }, [isAuthenticated]);

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
          <Link to={isAuthenticated ? "/search" : "#"} className={!isAuthenticated ? "pointer-events-none opacity-50" : ""}>
            <Button size="lg" className="h-12 px-8" style={{ backgroundColor: '#2f8a64' }} disabled={!isAuthenticated}>
              Search
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm">
            <Volume2 className="size-4 mr-2" />
            No Loud Music
          </Button>
          <Button variant="outline" size="sm">
            <Phone className="size-4 mr-2" />
            Calls Allowed
          </Button>
          <Button variant="outline" size="sm">
            <Star className="size-4 mr-2" />
            4+ Stars
          </Button>
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

        {!isAuthenticated ? (
          <div className="text-center py-12 border border-dashed rounded-xl bg-card p-6">
            <p className="text-muted-foreground mb-4">Please log in to view and book workspaces in your area.</p>
            <Link to="/login">
              <Button style={{ backgroundColor: '#2f8a64' }} className="cursor-pointer">Sign In</Button>
            </Link>
          </div>
        ) : loading ? (
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
                </div>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4>{venue.name}</h4>
                    <div className="flex items-center gap-1">
                      <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                      <span>{venue.rating}</span>
                    </div>
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
          <Card className="h-[600px] overflow-hidden">
            <div className="relative h-full bg-gray-100">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2b/Location_map_United_States_Manhattan_2.svg"
                alt="Manhattan Map"
                className="w-full h-full object-contain"
              />
              {venues.map((venue, idx) => (
                <div
                  key={venue.venue_id}
                  className="absolute cursor-pointer group"
                  style={{
                    left: `${30 + idx * 12}%`,
                    top: `${40 + idx * 8}%`,
                  }}
                  onClick={() => navigate(`/venue/${venue.venue_id}`)}
                >
                  <div className="relative">
                    <div
                      className="size-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                      style={{ backgroundColor: '#253c50' }}
                    >
                      <MapPin className="size-6 text-white" />
                    </div>
                    <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      <p className="font-medium">{venue.name}</p>
                      <p className="text-sm text-muted-foreground mb-2">${venue.hourly_price}/hour</p>
                      <Button
                        size="sm"
                        className="w-full"
                        style={{ backgroundColor: '#2f8a64' }}
                      >
                        Book a Space
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
