import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Search, Star, Wifi, Volume2, Filter, Clock, MapPin, Sparkles, Zap, ArrowUpDown } from "lucide-react";
import { api } from "../../services/api";
import { Venue } from "../../types/api";
import { MapView } from "../components/MapView";

const LANDMARKS: Record<string, { lat: number; lon: number }> = {
  "Times Square": { lat: 40.7580, lon: -73.9855 },
  "Central Park": { lat: 40.7829, lon: -73.9654 },
  "Empire State Building": { lat: 40.7484, lon: -73.9857 },
  "Grand Central Terminal": { lat: 40.7527, lon: -73.9772 },
  "Bryant Park": { lat: 40.7536, lon: -73.9832 },
  "Rockefeller Center": { lat: 40.7587, lon: -73.9787 },
  "Columbus Circle": { lat: 40.7681, lon: -73.9819 },
  "Union Square": { lat: 40.7359, lon: -73.9911 },
  "Washington Square Park": { lat: 40.7308, lon: -73.9973 },
  "Madison Square Park": { lat: 40.7420, lon: -73.9880 },
  "Flatiron Building": { lat: 40.7411, lon: -73.9897 },
  "Chelsea Market": { lat: 40.7420, lon: -74.0062 },
  "The High Line": { lat: 40.7480, lon: -74.0048 },
  "Hudson Yards": { lat: 40.7538, lon: -74.0022 },
  "Penn Station": { lat: 40.7505, lon: -73.9934 },
  "Wall Street": { lat: 40.7074, lon: -74.0113 },
  "World Trade Center": { lat: 40.7126, lon: -74.0099 },
  "Battery Park": { lat: 40.7033, lon: -74.0170 },
  "Columbia University": { lat: 40.8075, lon: -73.9626 },
  "NYU": { lat: 40.7295, lon: -73.9965 },
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
  const [searchDate, setSearchDate] = useState(searchParams.get("date") || "");
  const [startTime, setStartTime] = useState(searchParams.get("start_time") || "");
  const [endTime, setEndTime] = useState(searchParams.get("end_time") || "");
  const [seatsRequired, setSeatsRequired] = useState(parseInt(searchParams.get("seats") || "1"));
  const [sortBy, setSortBy] = useState<"default" | "suitability" | "price" | "rating">("default");

  const [filters, setFilters] = useState({
    freeWifi: false,
    noLoudMusic: false,
    fourPlusStars: false,
  });
  const [priceRange, setPriceRange] = useState([1, 10]);
  
  // paginatedVenues for List View; allVenues for Map View
  const [paginatedVenues, setPaginatedVenues] = useState<Venue[]>([]);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<{ name: string; type: "landmark" | "venue"; id?: string; coords?: { lat: number; lon: number } }[]>([]);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setAutocompleteItems([]);
      return;
    }

    const clean = searchQuery.trim().toLowerCase();

    const matchedLandmarks = Object.entries(LANDMARKS)
      .filter(([name]) => name.toLowerCase().includes(clean))
      .map(([name, coords]) => ({
        name,
        type: "landmark" as const,
        coords
      }));

    const fetchVenueSuggestions = async () => {
      try {
        const res = await api.getSuggestions(searchQuery.trim(), 6);
        const matchedVenues = res.items.map(v => ({
          name: v.name,
          type: "venue" as const,
          id: v.venue_id
        }));

        setAutocompleteItems([...matchedLandmarks, ...matchedVenues]);
      } catch (err) {
        console.warn("Autocomplete suggestions API failed:", err);
        setAutocompleteItems(matchedLandmarks);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchVenueSuggestions();
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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
    const executeQuery = async () => {
      setLoading(true);

      let lat: number | undefined = undefined;
      let lon: number | undefined = undefined;
      let nameFilter: string | undefined = undefined;
      let isLandmarkSearch = false;

      if (debouncedSearchQuery) {
        const clean = debouncedSearchQuery.trim().toLowerCase();

        for (const [name, coords] of Object.entries(LANDMARKS)) {
          if (clean.includes(name.toLowerCase()) || name.toLowerCase().includes(clean)) {
            lat = coords.lat;
            lon = coords.lon;
            isLandmarkSearch = true;
            break;
          }
        }

        if (!isLandmarkSearch) {
          nameFilter = debouncedSearchQuery;
        }
      }

      try {
        const queryParams = {
          noise_level: filters.noLoudMusic ? "quiet" : undefined,
          wifi_free: filters.freeWifi ? true : undefined,
          max_price: priceRange[1],
          date: searchDate || undefined,
          start_time: startTime ? `${startTime}:00` : undefined,
          end_time: endTime ? `${endTime}:00` : undefined,
          seats_required: seatsRequired,
        };

        let matched: Venue[] = [];

        if (isLandmarkSearch && lat !== undefined && lon !== undefined) {
          const allData = await api.getVenues({
            ...queryParams,
            lat,
            lon,
            radius: 2.0,
            page: 1,
            limit: 1000
          });
          matched = [...allData.items];
        } 
        else if (nameFilter) {
          const allData = await api.getVenues({
            ...queryParams,
            page: 1,
            limit: 1000
          });
          matched = allData.items.filter(v => v.name.toLowerCase().includes(nameFilter!.toLowerCase()));
        } 
        else {
          const allData = await api.getVenues({ ...queryParams, page: 1, limit: 1000 });
          matched = [...allData.items];
        }

        if (filters.fourPlusStars) {
          matched = matched.filter(v => v.rating >= 4.0);
        }
        matched = matched.filter(v => v.hourly_price >= priceRange[0] && v.hourly_price <= priceRange[1]);

        // Sorting logic
        if (sortBy === "suitability") {
          matched.sort((a, b) => ((b as any).suitability_score || 85) - ((a as any).suitability_score || 85));
        } else if (sortBy === "price") {
          matched.sort((a, b) => a.hourly_price - b.hourly_price);
        } else if (sortBy === "rating") {
          matched.sort((a, b) => b.rating - a.rating);
        }

        setAllVenues(matched);
        setTotalPages(Math.ceil(matched.length / limit) || 1);
        setPaginatedVenues(matched.slice((currentPage - 1) * limit, currentPage * limit));
        setHasMore(matched.length > currentPage * limit);
      } catch (err) {
        console.error("Failed to load search data:", err);
      } finally {
        setLoading(false);
      }
    };

    executeQuery();
  }, [filters, debouncedSearchQuery, priceRange, currentPage, limit, searchDate, startTime, endTime, seatsRequired, sortBy]);

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
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
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
            <h4 className="mb-4 font-medium text-sm">Price Range (per hour)</h4>
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

          <div className="space-y-4 border-t pt-4">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
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
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Any</option>
                    {Array.from({ length: 15 }, (_, i) => {
                      const hour = i + 8;
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
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Any</option>
                    {Array.from({ length: 15 }, (_, i) => {
                      const hour = i + 9;
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
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="w-full cursor-pointer"
            onClick={() => {
              setFilters({ freeWifi: false, noLoudMusic: false, fourPlusStars: false });
              setPriceRange([1, 10]);
              setSearchQuery("");
              setSearchDate("");
              setStartTime("");
              setEndTime("");
              setSeatsRequired(1);
              setSortBy("default");
              setCurrentPage(1);
            }}
          >
            Clear All Filters
          </Button>
        </aside>

        {/* Main Content */}
        <div>
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
              <Input
                placeholder="Search by landmark or venue name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="pl-10 h-12"
              />

              {/* Autocomplete Suggestions Panel */}
              {showSuggestions && autocompleteItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-md shadow-lg z-50 max-h-[250px] overflow-y-auto">
                  {autocompleteItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSearchQuery(item.name);
                        setShowSuggestions(false);
                        setCurrentPage(1);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-accent hover:text-accent-foreground text-sm flex items-center justify-between border-b border-border last:border-0 cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        {item.type === "landmark" ? (
                          <MapPin className="size-4 text-emerald-600" />
                        ) : (
                          <Sparkles className="size-4 text-sky-500" />
                        )}
                        <span className="font-medium">{item.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {item.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <Tabs defaultValue="list" className="w-auto">
                <TabsList>
                  <TabsTrigger value="list">List View</TabsTrigger>
                  <TabsTrigger value="map">Map View</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Sorting options */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-4 text-muted-foreground" />
                <Label htmlFor="sortDropdown" className="text-sm font-medium">Sort:</Label>
                <select
                  id="sortDropdown"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="default">Default</option>
                  <option value="suitability">Sort by Suitability Score</option>
                  <option value="rating">Sort by Customer Rating</option>
                  <option value="price">Sort by Price (Low to High)</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-muted-foreground pt-1">
              Showing {allVenues.length} workspace{allVenues.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Tabs defaultValue="list" className="w-full">
            <TabsContent value="list" className="space-y-4">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading workspaces...</div>
              ) : paginatedVenues.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No spaces found matching filters.</div>
              ) : (
                paginatedVenues.map((venue) => {
                  const suitability = (venue as any).suitability_score || Math.round(75 + venue.rating * 4);
                  const busynessLabel = (venue as any).busyness_label || (venue.rating > 4.5 ? "Moderate" : "Quiet");

                  return (
                    <Card key={venue.venue_id} className="p-5 hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-2.5 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-lg font-bold hover:text-emerald-700 transition-colors">
                                <Link to={`/venue/${venue.venue_id}`}>{venue.name}</Link>
                              </h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <MapPin className="size-3.5" />
                                {venue.cuisine_type} • {venue.distance_km ? `${venue.distance_km.toFixed(1)} km away` : (venue.borough || "Manhattan")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full text-amber-700 dark:text-amber-300 font-semibold text-sm border border-amber-200">
                              <Star className="size-4 fill-amber-400 stroke-amber-400" />
                              <span>{venue.rating}</span>
                            </div>
                          </div>

                          {/* Metric Badges: Suitability & Area Busyness */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 font-medium">
                              <Sparkles className="size-3 text-emerald-600" />
                              Suitability Score: {suitability}%
                            </Badge>

                            <Badge variant="outline" className="text-xs text-muted-foreground gap-1">
                              <Zap className="size-3 text-amber-500" />
                              Area Busyness: {busynessLabel}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            {getAmenities(venue).map((amenity) => (
                              <span
                                key={amenity}
                                className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Price & Action */}
                        <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-border gap-3">
                          <div className="text-left md:text-right">
                            <p className="text-2xl font-bold" style={{ color: '#2f8a64' }}>
                              ${venue.hourly_price}/hr
                            </p>
                            <p className={`text-xs ${venue.opening_now ? "text-green-600" : "text-muted-foreground"}`}>
                              {venue.opening_now ? "Open Now" : "Closed"}
                            </p>
                          </div>
                          <Link
                            to={`/venue/${venue.venue_id}`}
                            state={{
                              searchDate,
                              startTime,
                              endTime,
                              seatsRequired
                            }}
                          >
                            <Button style={{ backgroundColor: '#253c50' }} className="cursor-pointer">
                              Book a Space
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}

              {/* Pagination UI Indicator */}
              {!loading && paginatedVenues.length > 0 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="px-4 py-2 cursor-pointer"
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
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={!hasMore}
                    className="px-4 py-2 cursor-pointer"
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
                  <MapView venues={allVenues} height="600px" />
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
