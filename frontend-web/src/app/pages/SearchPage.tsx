import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, MapPin, Star, Wifi, Volume2, Filter } from "lucide-react";
import { api } from "../../services/api";
import { Venue } from "../../types/api";

export function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    freeWifi: false,
    noLoudMusic: false,
    fourPlusStars: false,
  });
  const [priceRange, setPriceRange] = useState([1, 10]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getVenues({
      noise_level: filters.noLoudMusic ? "quiet" : undefined,
      wifi_free: filters.freeWifi ? true : undefined,
    })
      .then((data) => {
        let result = [...data];
        
        // Local filtering
        if (searchQuery) {
          result = result.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        if (filters.fourPlusStars) {
          result = result.filter(v => v.rating >= 4.0);
        }
        
        // Filter by price range
        result = result.filter(v => v.hourly_price >= priceRange[0] && v.hourly_price <= priceRange[1]);
        
        setVenues(result);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch venues:", err);
        setLoading(false);
      });
  }, [filters, searchQuery, priceRange]);

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

  const getAmenities = (venue: Venue) => {
    const amenities = [];
    if (venue.has_wifi) amenities.push("WiFi");
    if (venue.wifi_free) amenities.push("Free WiFi");
    if (venue.noise_level === "quiet") amenities.push("Quiet Space");
    if (venue.seats_avail > 0) amenities.push(`${venue.seats_avail} seats left`);
    return amenities;
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        {/* Filters Sidebar */}
        <aside className="space-y-6">
          <div>
            <h3 className="mb-4 flex items-center gap-2">
              <Filter className="size-5" />
              Filters
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="noLoudMusic"
                  checked={filters.noLoudMusic}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, noLoudMusic: checked as boolean })
                  }
                />
                <Label htmlFor="noLoudMusic" className="flex items-center gap-2 cursor-pointer">
                  <Volume2 className="size-4" />
                  No Loud Music
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="freeWifi"
                  checked={filters.freeWifi}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, freeWifi: checked as boolean })
                  }
                />
                <Label htmlFor="freeWifi" className="flex items-center gap-2 cursor-pointer">
                  <Wifi className="size-4" />
                  Free Wi-Fi
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fourPlusStars"
                  checked={filters.fourPlusStars}
                  onCheckedChange={(checked) =>
                    setFilters({ ...filters, fourPlusStars: checked as boolean })
                  }
                />
                <Label htmlFor="fourPlusStars" className="flex items-center gap-2 cursor-pointer">
                  <Star className="size-4" />
                  4+ Stars
                </Label>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4">Price Range (per hour)</h4>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              min={1}
              max={10}
              step={1}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>${priceRange[0]}</span>
              <span>${priceRange[1]}</span>
            </div>
          </div>

          <Button variant="outline" className="w-full">
            Clear All Filters
          </Button>
        </aside>

        {/* Main Content */}
        <div>
          <div className="mb-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search by city or venue name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="map">Map View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <p className="text-muted-foreground">
                  {venues.length} spaces available
                </p>

                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">Loading workspaces...</div>
                ) : venues.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No spaces found matching filters.</div>
                ) : (
                  venues.map((venue) => (
                    <Card key={venue.venue_id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="grid md:grid-cols-[250px_1fr] gap-4">
                        <div className="aspect-video md:aspect-square overflow-hidden">
                          <img
                            src={getVenueImage(venue.venue_id)}
                            alt={venue.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="mb-1">{venue.name}</h3>
                              <p className="text-muted-foreground">
                                {venue.cuisine_type} • {venue.distance_km} km away
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                              <span>{venue.rating}</span>
                              <span className="text-muted-foreground">
                                ({venue.seats_avail * 3 + 12})
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            {getAmenities(venue).map((amenity) => (
                              <span
                                key={amenity}
                                className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>

                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <p className={venue.opening_now ? "text-green-600" : "text-red-500"}>
                                {venue.opening_now ? "Open Now" : "Closed"}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-2xl" style={{ color: '#2f8a64' }}>
                                ${venue.hourly_price}/hr
                              </p>
                              <Link to={`/venue/${venue.venue_id}`}>
                                <Button style={{ backgroundColor: '#253c50' }}>
                                  Book a Space
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="map">
                <Card className="h-[600px] overflow-hidden">
                  <div className="relative h-full bg-gray-100">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/2/2b/Location_map_United_States_Manhattan_2.svg"
                      alt="Manhattan Map"
                      className="w-full h-full object-contain"
                    />
                    {loading ? (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-muted-foreground">
                        Loading map markers...
                      </div>
                    ) : (
                      venues.map((venue, idx) => (
                        <div
                          key={venue.venue_id}
                          className="absolute cursor-pointer group"
                          style={{
                            left: `${20 + idx * 12}%`,
                            top: `${30 + idx * 10}%`,
                          }}
                        >
                          <div className="relative">
                            <div
                              className="size-12 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
                              style={{ backgroundColor: '#253c50' }}
                            >
                              <MapPin className="size-6 text-white" />
                            </div>
                            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 min-w-[200px]">
                              <p className="font-medium mb-1">{venue.name}</p>
                              <p className="text-sm text-muted-foreground mb-2">${venue.hourly_price}/hour</p>
                              <Link to={`/venue/${venue.venue_id}`}>
                                <Button
                                  size="sm"
                                  className="w-full"
                                  style={{ backgroundColor: '#2f8a64' }}
                                >
                                  Book a Space
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
