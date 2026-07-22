import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Star, Filter, Clock, MapPin, Sparkles, Phone, Accessibility, Plug, Wifi } from "lucide-react";
import { api } from "../../services/api";
import { Venue } from "../../types/api";
import { MapView } from "../components/MapView";
import { ManhattanMap } from "../components/ManhattanMap";
import { manhattanVenues } from "../data/manhattanVenues";

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

const SUPPORTED_VENUE_TYPES = [
  "cafe",
  "library",
  "restaurant",
  "workspace",
  "office",
  "hotel",
];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") || "");
  const [searchDate, setSearchDate] = useState(searchParams.get("date") || "");
  const [startTime, setStartTime] = useState(searchParams.get("start_time") || "");
  const [endTime, setEndTime] = useState(searchParams.get("end_time") || "");
  const [seatsRequired, setSeatsRequired] = useState(parseInt(searchParams.get("seats") || "1"));

  const [filters, setFilters] = useState({
    freeWifi: false,
    plugAccess: false,
    fourPlusStars: false,
    callsAllowed: false,
    accessibilityFriendly: false,
    wbeOwned: false,
    mbeOwned: false,
    lgbtFriendly: false,
    bCorpCertified: false,
    vbeOwned: false,
  });
  const [selectedVenueTypes, setSelectedVenueTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([1, 10]);
  const [duration, setDuration] = useState("any");

  // paginatedVenues for List View; allVenues for Map View
  const [paginatedVenues, setPaginatedVenues] = useState<Venue[]>([]);
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [apiFailed, setApiFailed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [hasMore, setHasMore] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<{ name: string; type: "landmark" | "venue"; id?: string; coords?: { lat: number; lon: number } }[]>([]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle Autocomplete List Filtering
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
        coords,
      }));

    const fetchVenueSuggestions = async () => {
      try {
        const res = await api.getSuggestions(searchQuery.trim(), 6);
        const matchedVenues = res.items.map((v) => ({
          name: v.name,
          type: "venue" as const,
          id: v.venue_id,
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

  // Sync state back to URL parameters & sessionStorage
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

  // Main Data Fetching Engine
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
        const durationHours =
          duration !== "any" && searchDate && startTime
            ? Number(duration.replace("+", ""))
            : undefined;
        const queryParams = {
          wifi: filters.freeWifi ? true : undefined,
          plug_access: filters.plugAccess ? 1 : undefined,
          venue_type: selectedVenueTypes.length > 0 ? selectedVenueTypes : undefined,
          accessibility_friendly: filters.accessibilityFriendly ? true : undefined,
          calls_allowed: filters.callsAllowed ? true : undefined,
          wbe_certified: filters.wbeOwned ? true : undefined,
          mbe_certified: filters.mbeOwned ? true : undefined,
          vbe_certified: filters.vbeOwned ? true : undefined,
          bcorp_certified: filters.bCorpCertified ? true : undefined,
          lgbt_friendly: filters.lgbtFriendly ? true : undefined,
          max_price: priceRange[1],
          date: searchDate || undefined,
          start_time: startTime ? `${startTime}:00` : undefined,
          end_time: endTime ? `${endTime}:00` : undefined,
          duration_hours: durationHours,
          seats_required: seatsRequired,
        };

        if (isLandmarkSearch && lat !== undefined && lon !== undefined) {
          const allData = await api.getVenues({
            ...queryParams,
            lat,
            lon,
            radius: 2.0,
            page: 1,
            limit: 1000,
          });

          let matched = [...allData.items];
          if (filters.fourPlusStars) {
            matched = matched.filter((v) => v.rating >= 4.0);
          }
          matched = matched.filter(
            (v) => v.hourly_price >= priceRange[0] && v.hourly_price <= priceRange[1]
          );

          setAllVenues(matched);
          setTotalPages(Math.ceil(matched.length / limit) || 1);
          setPaginatedVenues(matched.slice((currentPage - 1) * limit, currentPage * limit));
          setHasMore(matched.length > currentPage * limit);
          setApiFailed(false);
        } else if (nameFilter) {
          const allData = await api.getVenues({
            ...queryParams,
            page: 1,
            limit: 1000,
          });

          let matched = allData.items.filter((v) =>
            v.name.toLowerCase().includes(nameFilter!.toLowerCase())
          );
          if (filters.fourPlusStars) {
            matched = matched.filter((v) => v.rating >= 4.0);
          }
          matched = matched.filter(
            (v) => v.hourly_price >= priceRange[0] && v.hourly_price <= priceRange[1]
          );

          setAllVenues(matched);
          setTotalPages(Math.ceil(matched.length / limit) || 1);
          setPaginatedVenues(matched.slice((currentPage - 1) * limit, currentPage * limit));
          setHasMore(matched.length > currentPage * limit);
          setApiFailed(false);
        } else {
          const [allData, pageData] = await Promise.all([
            api.getVenues({ ...queryParams, page: 1, limit: 1000 }),
            api.getVenues({ ...queryParams, page: currentPage, limit: limit }),
          ]);

          let finalAll = [...allData.items];
          let finalPage = [...pageData.items];

          if (filters.fourPlusStars) {
            finalAll = finalAll.filter((v) => v.rating >= 4.0);
            finalPage = finalPage.filter((v) => v.rating >= 4.0);
          }
          finalAll = finalAll.filter(
            (v) => v.hourly_price >= priceRange[0] && v.hourly_price <= priceRange[1]
          );
          finalPage = finalPage.filter(
            (v) => v.hourly_price >= priceRange[0] && v.hourly_price <= priceRange[1]
          );

          setAllVenues(finalAll);
          setPaginatedVenues(finalPage);
          setTotalPages(pageData.total_pages || 1);
          setHasMore(pageData.has_more);
          setApiFailed(false);
        }
      } catch (err) {
        console.error("Failed to load search data, using fallback data:", err);
        setApiFailed(true);
        setAllVenues([]);
        setPaginatedVenues([]);
      } finally {
        setLoading(false);
      }
    };

    executeQuery();
  }, [filters, selectedVenueTypes, debouncedSearchQuery, priceRange, currentPage, limit, searchDate, startTime, endTime, seatsRequired, duration]);

  // When API fails, use manhattanVenues as fallback
  const displayVenues = apiFailed ? manhattanVenues : paginatedVenues;
  const displayCount = apiFailed ? manhattanVenues.length : allVenues.length;

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

  const clearAllFilters = () => {
    setFilters({
      freeWifi: false,
      plugAccess: false,
      fourPlusStars: false,
      callsAllowed: false,
      accessibilityFriendly: false,
      wbeOwned: false,
      mbeOwned: false,
      lgbtFriendly: false,
      bCorpCertified: false,
      vbeOwned: false,
    });
    setSelectedVenueTypes([]);
    setPriceRange([1, 10]);
    setDuration("any");
    setSearchQuery("");
    setSearchDate("");
    setStartTime("");
    setEndTime("");
    setSeatsRequired(1);
    setCurrentPage(1);
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
              {/* Duration select */}
              <div>
                <Label htmlFor="duration" className="mb-2 block">Duration</Label>
                <Select value={duration} onValueChange={(val) => { setDuration(val); setCurrentPage(1); }}>
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any duration</SelectItem>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4+">4+ hours</SelectItem>
                  </SelectContent>
                </Select>
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
                  WiFi Available
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="plugAccess"
                  checked={filters.plugAccess}
                  onCheckedChange={(checked) => {
                    setFilters({ ...filters, plugAccess: checked as boolean });
                    setCurrentPage(1);
                  }}
                />
                <Label htmlFor="plugAccess" className="flex items-center gap-2 cursor-pointer">
                  <Plug className="size-4" />
                  Plug Access
                </Label>
              </div>

              <div>
                <Label className="mb-2 block">Venue Type</Label>
                <div className="space-y-2">
                  {SUPPORTED_VENUE_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`venueType-${type}`}
                        checked={selectedVenueTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          setSelectedVenueTypes((current) =>
                            checked
                              ? [...current, type]
                              : current.filter((item) => item !== type)
                          );
                          setCurrentPage(1);
                        }}
                      />
                      <Label htmlFor={`venueType-${type}`} className="cursor-pointer capitalize">
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="callsAllowed"
                  checked={filters.callsAllowed}
                  onCheckedChange={(checked) => {
                    setFilters({ ...filters, callsAllowed: checked as boolean });
                    setCurrentPage(1);
                  }}
                />
                <Label htmlFor="callsAllowed" className="flex items-center gap-2 cursor-pointer">
                  <Phone className="size-4" />
                  Calls Allowed
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="accessibilityFriendly"
                  checked={filters.accessibilityFriendly}
                  onCheckedChange={(checked) => {
                    setFilters({ ...filters, accessibilityFriendly: checked as boolean });
                    setCurrentPage(1);
                  }}
                />
                <Label htmlFor="accessibilityFriendly" className="flex items-center gap-2 cursor-pointer">
                  <Accessibility className="size-4" />
                  Accessibility Friendly
                </Label>
              </div>
            </div>
          </div>

          {/* "You'll love these..." section */}
          <div>
            <h4 className="mb-4">You'll love these...</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wbeOwned"
                  checked={filters.wbeOwned}
                  onCheckedChange={(checked) => setFilters({ ...filters, wbeOwned: checked as boolean })}
                />
                <Label htmlFor="wbeOwned" className="cursor-pointer relative inline-block px-3 py-1 rounded">
                  <span
                    className="absolute inset-0 opacity-15 rounded"
                    style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 25%, #9333ea 25%, #9333ea 50%, transparent 50%, transparent 75%, #9333ea 75%, #9333ea 100%)" }}
                  />
                  <span className="relative z-10">WBE-Certified</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mbeOwned"
                  checked={filters.mbeOwned}
                  onCheckedChange={(checked) => setFilters({ ...filters, mbeOwned: checked as boolean })}
                />
                <Label htmlFor="mbeOwned" className="cursor-pointer relative inline-block px-3 py-1 rounded">
                  <span
                    className="absolute inset-0 opacity-15 rounded"
                    style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 33%, #78350f 33%, #78350f 66%, #000000 66%, #000000 100%)" }}
                  />
                  <span className="relative z-10">MBE-Certified</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lgbtFriendly"
                  checked={filters.lgbtFriendly}
                  onCheckedChange={(checked) => setFilters({ ...filters, lgbtFriendly: checked as boolean })}
                />
                <Label htmlFor="lgbtFriendly" className="cursor-pointer relative inline-block px-3 py-1 rounded">
                  <span
                    className="absolute inset-0 opacity-20 rounded"
                    style={{ background: "linear-gradient(90deg, #e40303 0%, #e40303 16.67%, #ff8c00 16.67%, #ff8c00 33.33%, #ffed00 33.33%, #ffed00 50%, #008026 50%, #008026 66.67%, #24408e 66.67%, #24408e 83.33%, #732982 83.33%, #732982 100%)" }}
                  />
                  <span className="relative z-10">LGBT+ Friendly</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bCorpCertified"
                  checked={filters.bCorpCertified}
                  onCheckedChange={(checked) => setFilters({ ...filters, bCorpCertified: checked as boolean })}
                />
                <Label htmlFor="bCorpCertified" className="cursor-pointer relative inline-block px-3 py-1 rounded">
                  <span className="absolute inset-0 opacity-15 rounded" style={{ backgroundColor: "#2d6a4f" }} />
                  <span className="relative z-10">B-Corp Certified</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vbeOwned"
                  checked={filters.vbeOwned}
                  onCheckedChange={(checked) => setFilters({ ...filters, vbeOwned: checked as boolean })}
                />
                <Label htmlFor="vbeOwned" className="cursor-pointer relative inline-block px-3 py-1 rounded">
                  <span className="absolute inset-0 opacity-15 rounded" style={{ backgroundColor: "#1d4ed8" }} />
                  <span className="relative z-10">VBE-Certified</span>
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

          <div className="space-y-4 border-t pt-4">
            <h3 className="mb-4 flex items-center gap-2">
              <Clock className="size-5" />
              Availability
            </h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="searchDate">Date</Label>
                <input
                  id="searchDate"
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={searchDate}
                  onChange={(e) => {
                    setSearchDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      return (
                        <option key={str} value={str}>
                          {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                        </option>
                      );
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
                      return (
                        <option key={str} value={str}>
                          {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                        </option>
                      );
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
                    <option key={num} value={num}>
                      {num} {num === 1 ? "seat" : "seats"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full cursor-pointer" onClick={clearAllFilters}>
            Clear All Filters
          </Button>
        </aside>

        {/* Main Content */}
        <div>
          <div className="mb-6">
            <div className="relative mb-4">
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
                      <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="map">Map View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                <p className="text-muted-foreground">{displayCount} spaces available</p>

                {loading && !apiFailed ? (
                  <div className="text-center py-12 text-muted-foreground">Loading workspaces...</div>
                ) : displayVenues.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No spaces found matching filters.
                  </div>
                ) : apiFailed ? (
                  // Fallback: render manhattanVenues with Figma card UI
                  manhattanVenues.map((venue) => {
                    const busyness = busynessLevels[venue.id % busynessLevels.length];
                    return (
                      <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="grid md:grid-cols-[250px_1fr] gap-4">
                          <div className="aspect-video md:aspect-square overflow-hidden">
                            <img
                              src={venue.image}
                              alt={venue.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span
                                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${busyness.color}`}
                                >
                                  {busyness.label}
                                </span>
                                <h3 className="mb-1">{venue.name}</h3>
                                <p className="text-muted-foreground">
                                  {venue.type} • {venue.distance} km away
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                                <span>{venue.rating}</span>
                                <span className="text-muted-foreground">({venue.reviews})</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {venue.amenities.map((amenity) => (
                                <span
                                  key={amenity}
                                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                                >
                                  {amenity}
                                </span>
                              ))}
                            </div>

                            {venue.suitabilityScore !== undefined && (
                              <div className="mb-3">
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

                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-muted-foreground">Available</p>
                                <p>{venue.availability}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="text-2xl" style={{ color: "#2f8a64" }}>
                                  ${venue.price}/hr
                                </p>
                                <Link to={`/venue/${venue.id}`}>
                                  <Button style={{ backgroundColor: "#253c50" }} className="cursor-pointer">
                                    Book a Space
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  // API data with improved card UI
                  paginatedVenues.map((venue, venueIdx) => {
                    const suitability = Math.round(venue.rating * 20);
                    const busyness = busynessLevels[venueIdx % busynessLevels.length];
                    const amenities: string[] = [];
                    if (venue.has_wifi) amenities.push("WiFi");
                    if (venue.wifi_free) amenities.push("Free WiFi");
                    if (venue.calls_allowed) amenities.push("Calls Allowed");
                    if (venue.seats_avail > 0) amenities.push(`${venue.seats_avail} seats left`);

                    return (
                      <Card
                        key={venue.venue_id}
                        className="overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        <div className="grid md:grid-cols-[250px_1fr] gap-4">
                          <div className="aspect-video md:aspect-square overflow-hidden">
                            <img
                              src={getApiVenueImage(venue.venue_id)}
                              alt={venue.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span
                                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${busyness.color}`}
                                >
                                  {busyness.label}
                                </span>
                                <h3 className="mb-1">{venue.name}</h3>
                                <p className="text-muted-foreground">
                                  {venue.cuisine_type} •{" "}
                                  {venue.distance_km ? `${venue.distance_km} km away` : venue.borough}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                                <span>{venue.rating}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                              {amenities.map((amenity) => (
                                <span
                                  key={amenity}
                                  className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                                >
                                  {amenity}
                                </span>
                              ))}
                            </div>

                            <div className="mb-3">
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

                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-muted-foreground">Status</p>
                                <p className={venue.opening_now ? "text-green-600" : "text-red-500"}>
                                  {venue.opening_now ? "Open Now" : "Closed"}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                <p className="text-2xl" style={{ color: "#2f8a64" }}>
                                  ${venue.hourly_price}/hr
                                </p>
                                <Link
                                  to={`/venue/${venue.venue_id}`}
                                  state={{ searchDate, startTime, endTime, seatsRequired }}
                                >
                                  <Button
                                    style={{ backgroundColor: "#253c50" }}
                                    className="cursor-pointer"
                                  >
                                    Book a Space
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    );
                  })
                )}

                {/* Pagination UI (API data only) */}
                {!loading && !apiFailed && paginatedVenues.length > 0 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCurrentPage((prev) => Math.max(prev - 1, 1));
                        window.scrollTo({ top: 0, behavior: "smooth" });
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
                        setCurrentPage((prev) => prev + 1);
                        window.scrollTo({ top: 0, behavior: "smooth" });
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
                {apiFailed ? (
                  <ManhattanMap venues={manhattanVenues} height="600px" />
                ) : (
                  <Card className="h-[600px] overflow-hidden border border-border shadow-sm">
                    {loading ? (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-muted bg-opacity-80">
                        Loading map and active venues...
                      </div>
                    ) : (
                      <MapView venues={allVenues} height="600px" />
                    )}
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
