import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, Star, Wifi, Volume2, Filter, Clock } from "lucide-react";
import { api } from "../../services/api";
import { Venue } from "../../types/api";
import { MapView } from "../components/MapView";

const LANDMARKS: Record<string, { lat: number; lon: number }> = {
  "times square": { lat: 40.7580, lon: -73.9855 },
  "central park": { lat: 40.7829, lon: -73.9654 },
  "empire state building": { lat: 40.7484, lon: -73.9857 },
  "grand canal dock": { lat: 53.3421, lon: -6.2397 },
  "ranelagh": { lat: 53.3262, lon: -6.2546 },
  "belfield": { lat: 53.3078, lon: -6.2230 },
  "dublin": { lat: 53.3498, lon: -6.2603 },
  "manhattan": { lat: 40.7831, lon: -73.9712 },
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
  const [searchDate, setSearchDate] = useState(searchParams.get("date") || "");
  const [startTime, setStartTime] = useState(searchParams.get("start_time") || "");
  const [endTime, setEndTime] = useState(searchParams.get("end_time") || "");
  const [seatsRequired, setSeatsRequired] = useState(parseInt(searchParams.get("seats") || "1"));

  const [filters, setFilters] = useState({
    freeWifi: false,
    noLoudMusic: false,
    fourPlusStars: false,
  });
  const [priceRange, setPriceRange] = useState([1, 10]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(false);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Debounce search query to limit geocoding API hits
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync state variables back to URL search params & sessionStorage
  useEffect(() => {
    const params: any = {};
    if (searchQuery) params.query = searchQuery;
    if (searchDate) params.date = searchDate;
    if (startTime) params.start_time = startTime;
    if (endTime) params.end_time = endTime;
    if (seatsRequired > 1) params.seats = seatsRequired.toString();
    setSearchParams(params);

    sessionStorage.setItem("searchDate", searchDate);
    sessionStorage.setItem("startTime", startTime);
    sessionStorage.setItem("endTime", endTime);
    sessionStorage.setItem("seatsRequired", seatsRequired.toString());
  }, [searchQuery, searchDate, startTime, endTime, seatsRequired]);

  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);

      let lat: number | undefined = undefined;
      let lon: number | undefined = undefined;
      let nameFilter: string | undefined = undefined;

      if (debouncedSearchQuery) {
        const clean = debouncedSearchQuery.trim().toLowerCase();
        let matched = false;

        // Local lookup for instant matching
        for (const [key, coords] of Object.entries(LANDMARKS)) {
          if (clean.includes(key) || key.includes(clean)) {
            lat = coords.lat;
            lon = coords.lon;
            matched = true;
            break;
          }
        }

        // Fallback to OSM Nominatim API if no local match is found
        if (!matched) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedSearchQuery)}&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
              lat = parseFloat(data[0].lat);
              lon = parseFloat(data[0].lon);
              matched = true;
            }
          } catch (e) {
            console.warn("OSM Geocoding API failed:", e);
          }
        }

        // If it is not a landmark (no coordinates resolved), query standard venues
        if (!matched) {
          nameFilter = debouncedSearchQuery;
        }
      }

      try {
        const data = await api.getVenues({
          noise_level: filters.noLoudMusic ? "quiet" : undefined,
          wifi_free: filters.freeWifi ? true : undefined,
          max_price: priceRange[1],
          page: currentPage,
          limit: limit,
          name: nameFilter,
          lat,
          lon,
          radius: (lat !== undefined && lon !== undefined) ? 2.0 : undefined,
          date: searchDate || undefined,
          start_time: startTime ? `${startTime}:00` : undefined,
          end_time: endTime ? `${endTime}:00` : undefined,
          seats_required: seatsRequired,
        });

        let result = [...data.items];
        setHasMore(data.has_more);

        // Local filters for ratings and price range
        if (filters.fourPlusStars) {
          result = result.filter(v => v.rating >= 4.0);
        }
        result = result.filter(v => v.hourly_price >= priceRange[0] && v.hourly_price <= priceRange[1]);

        setVenues(result);
      } catch (err) {
        console.error("Failed to fetch venues:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [filters, debouncedSearchQuery, priceRange, currentPage, limit, searchDate, startTime, endTime, seatsRequired]);

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
                  onCheckedChange={(checked) => {
                    setFilters({ ...filters, noLoudMusic: checked as boolean });
                    setCurrentPage(1);
                  }}
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
                  onCheckedChange={(checked) => {
                    setFilters({ ...filters, freeWifi: checked as boolean });
                    setCurrentPage(1);
                  }}
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
                  onCheckedChange={(checked) => {
                    setFilters({ ...filters, fourPlusStars: checked as boolean });
                    setCurrentPage(1);
                  }}
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
              onValueChange={(val) => {
                setPriceRange(val);
                setCurrentPage(1);
              }}
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

          <div className="space-y-4">
            <h3 className="mb-4 flex items-center gap-2">
              <Clock className="size-5" />
              Availability
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="searchDate">Date</Label>
                <Input
                  id="searchDate"
                  type="date"
                  value={searchDate}
                  onChange={(e) => {
                    setSearchDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="startTime">Start Time</Label>
                  <select
                    id="startTime"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Any</option>
                    {Array.from({ length: 15 }, (_, i) => {
                      const hour = i + 8; // 8 AM to 10 PM
                      const str = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                      return <option key={str} value={str}>{hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</option>;
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="endTime">End Time</Label>
                  <select
                    id="endTime"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Any</option>
                    {Array.from({ length: 15 }, (_, i) => {
                      const hour = i + 9; // 9 AM to 11 PM
                      const str = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                      return <option key={str} value={str}>{hour > 12 ? `${hour - 12} PM` : `${hour} AM`}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="seatsRequired">Seats Required</Label>
                <select
                  id="seatsRequired"
                  value={seatsRequired}
                  onChange={(e) => {
                    setSeatsRequired(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <option key={num} value={num}>{num} {num === 1 ? "seat" : "seats"}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setFilters({ freeWifi: false, noLoudMusic: false, fourPlusStars: false });
              setPriceRange([1, 10]);
              setSearchQuery("");
              setSearchDate("");
              setStartTime("");
              setEndTime("");
              setSeatsRequired(1);
              setCurrentPage(1);
            }}
          >
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
                              <Link
                                to={`/venue/${venue.venue_id}`}
                                state={{
                                  searchDate,
                                  startTime,
                                  endTime,
                                  seatsRequired
                                }}
                              >
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

                {/* Pagination controls */}
                {!loading && venues.length > 0 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage(prev => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="px-4 py-2"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-semibold text-foreground bg-muted px-3 py-1.5 rounded-md">
                      Page {currentPage}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage(prev => prev + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={!hasMore}
                      className="px-4 py-2"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map">
                <Card className="h-[600px] overflow-hidden border border-border shadow-sm">
                  {loading ? (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-muted bg-opacity-80">
                      Loading map and active venues...
                    </div>
                  ) : (
                    <MapView venues={venues} height="600px" />
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
