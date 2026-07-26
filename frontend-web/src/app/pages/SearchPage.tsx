import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Search, Star, Filter, Clock, MapPin, Sparkles, Phone, Accessibility, Plug, Wifi, Zap, Volume, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import {
  enrichVenue,
  EnrichedVenue,
  venueImage,
  busynessDisplay,
  formatVenueRating,
  getVenueRatingRank,
  getVenueSuitabilityRank,
  getVenueSuitabilityScore,
} from "../utils/venueEnrichment";
import { formatDistance, LandmarkContext } from "../utils/distance";
import { MapView } from "../components/MapView";
import { manhattanVenues } from "../data/manhattanVenues";
import { Venue, VenueSuggestion } from "../../types/api";

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

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function renderWorkspaceFeatureBadges({
  hasWifi,
  plugAccess,
  callsAllowed,
}: {
  hasWifi: boolean;
  plugAccess: number;
  callsAllowed: boolean;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-muted-foreground">
      {hasWifi && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
          <Wifi className="size-3.5" />
          WiFi
        </span>
      )}
      {plugAccess > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
          <Zap className="size-3.5" />
          Plug Access
        </span>
      )}
      {callsAllowed && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
          <Volume className="size-3.5" />
          Calls Allowed
        </span>
      )}
    </div>
  );
}



const EDI_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  "WBE-Certified":    { bg: "bg-purple-100", text: "text-purple-700" },
  "MBE-Certified":    { bg: "bg-amber-100",  text: "text-amber-800"  },
  "LGBT+ Friendly":   { bg: "bg-pink-100",   text: "text-pink-700"   },
  "B-Corp Certified": { bg: "bg-green-100",  text: "text-green-700"  },
  "VBE-Certified":    { bg: "bg-blue-100",   text: "text-blue-700"   },
};

const SUPPORTED_VENUE_TYPES = [
  "bakery",
  "restaurant",
  "cafe",
  "hotel",
];

const fallbackMapVenues: Venue[] = manhattanVenues.map((venue) => ({
  venue_id: String(venue.id),
  name: venue.name,
  osm_type: venue.type.toLowerCase().replace(/\s+/g, "_"),
  cuisine_type: venue.type,
  distance_km: venue.distance,
  has_wifi: venue.amenities.includes("WiFi"),
  wifi_free: venue.amenities.includes("WiFi"),
  opening_now: true,
  seats_avail: 1,
  total_seats: 1,
  hourly_price: venue.price,
  rating: venue.rating,
  lat: venue.lat,
  lon: venue.lng,
  borough: "Manhattan",
  state: "NY",
  plug_access: venue.amenities.includes("Power Outlets") ? 1 : 0,
  availability_window: venue.availability,
  opening_hours_summary: venue.availability,
  busyness_score: null,
  busyness_label: null,
  suitability_score: venue.suitabilityScore,
  accessibility_friendly: false,
  calls_allowed: false,
  wbe_certified: false,
  mbe_certified: false,
  vbe_certified: false,
  bcorp_certified: false,
  lgbt_friendly: false,
}));

const INITIAL_DISPLAY_COUNT = 10;
const SEARCH_RESULT_FETCH_LIMIT = 200;
type FallbackVenue = (typeof manhattanVenues)[number];
type SearchResultsCacheEntry = {
  venues: EnrichedVenue[];
  activeLandmark: LandmarkContext | null;
};

function buildSearchResultsCacheKey({
  searchQuery,
  selectedVenueSuggestionId,
  selectedVenueTypes,
  filters,
  priceRange,
  searchDate,
  startTime,
  endTime,
  seatsRequired,
  duration,
  sortBy,
  userLocationEnabled,
}: {
  searchQuery: string;
  selectedVenueSuggestionId: string | null;
  selectedVenueTypes: string[];
  filters: Record<string, boolean>;
  priceRange: number[];
  searchDate: string;
  startTime: string;
  endTime: string;
  seatsRequired: number;
  duration: string;
  sortBy: string;
  userLocationEnabled: boolean;
}) {
  return JSON.stringify({
    version: 1,
    searchQuery: normalizeSearchText(searchQuery),
    selectedVenueSuggestionId,
    selectedVenueTypes: [...selectedVenueTypes].sort(),
    filters,
    priceRange,
    searchDate,
    startTime,
    endTime,
    seatsRequired,
    duration,
    sortBy,
    userLocationEnabled,
  });
}

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
  const [sortBy, setSortBy] = useState<"suitability" | "price" | "rating">("suitability");

  const [allVenues, setAllVenues] = useState<EnrichedVenue[]>([]);
  const [fallbackVenues, setFallbackVenues] = useState<EnrichedVenue[]>([]);
  const [apiFailed, setApiFailed] = useState(false);
  const searchResultsCacheRef = useRef<Map<string, SearchResultsCacheEntry>>(new Map());
  const fallbackVenuesCacheRef = useRef<EnrichedVenue[] | null>(null);

  // Pinned Midtown Manhattan — Chrome popup fires normally but real coords are ignored
  const PINNED_LAT = 40.7589;
  const PINNED_LON = -73.9851;
  const [userLocationEnabled, setUserLocationEnabled] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => setUserLocationEnabled(true),
      () => {},
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_DISPLAY_COUNT);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<{ name: string; type: "landmark" | "venue"; id?: string; coords?: { lat: number; lon: number } }[]>([]);
  const [selectedVenueSuggestionId, setSelectedVenueSuggestionId] = useState<string | null>(null);
  const [activeLandmark, setActiveLandmark] = useState<LandmarkContext | null>(null);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setVisibleCount(INITIAL_DISPLAY_COUNT);
  }, [filters, selectedVenueTypes, debouncedSearchQuery, priceRange, searchDate, startTime, endTime, seatsRequired, duration, sortBy]);

  // Handle Autocomplete List Filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setAutocompleteItems([]);
      setSelectedVenueSuggestionId(null);
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

  useEffect(() => {
    if (activeLandmark) {
      sessionStorage.setItem("activeLandmark", JSON.stringify(activeLandmark));
      return;
    }

    sessionStorage.removeItem("activeLandmark");
  }, [activeLandmark]);

  // Main Data Fetching Engine
  useEffect(() => {
    const executeQuery = async () => {
      const searchCacheKey = buildSearchResultsCacheKey({
        searchQuery: debouncedSearchQuery,
        selectedVenueSuggestionId,
        selectedVenueTypes,
        filters,
        priceRange,
        searchDate,
        startTime,
        endTime,
        seatsRequired,
        duration,
        sortBy,
        userLocationEnabled,
      });
      const cachedResult = searchResultsCacheRef.current.get(searchCacheKey);

      if (cachedResult) {
        setAllVenues(cachedResult.venues);
        setActiveLandmark(cachedResult.activeLandmark);
        setApiFailed(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      let lat: number | undefined = undefined;
      let lon: number | undefined = undefined;
      let nameFilter: string | undefined = undefined;
      let selectedVenueId: string | undefined = undefined;
      let isLandmarkSearch = false;
      let matchedLandmark: LandmarkContext | null = null;

      if (debouncedSearchQuery) {
        const clean = debouncedSearchQuery.trim().toLowerCase();
        const normalizedQuery = normalizeSearchText(debouncedSearchQuery);

        if (selectedVenueSuggestionId) {
          nameFilter = debouncedSearchQuery;
          selectedVenueId = selectedVenueSuggestionId;
        } else {
          try {
            const suggestionRes = await api.getSuggestions(debouncedSearchQuery, 10);
            const exactSuggestion = suggestionRes.items.find(
              (item: VenueSuggestion) => normalizeSearchText(item.name) === normalizedQuery
            );

            if (exactSuggestion) {
              nameFilter = debouncedSearchQuery;
              selectedVenueId = exactSuggestion.venue_id;
            }
          } catch (err) {
            console.warn("Pre-search exact venue suggestion lookup failed:", err);
          }
        }

        if (!selectedVenueId) {
          for (const [name, coords] of Object.entries(LANDMARKS)) {
            if (clean.includes(name.toLowerCase()) || name.toLowerCase().includes(clean)) {
              lat = coords.lat;
              lon = coords.lon;
              isLandmarkSearch = true;
              matchedLandmark = { name, lat: coords.lat, lon: coords.lon };
              break;
            }
          }

          if (!isLandmarkSearch) {
            nameFilter = debouncedSearchQuery;
          }
        }
      }

      // Apply client-side post-filters (EDI + accessibility + plug)
      const applyEdiFilters = (venues: EnrichedVenue[]): EnrichedVenue[] => {
        let result = venues;
        if (filters.accessibilityFriendly) result = result.filter(v => v.isAccessible);
        if (filters.plugAccess)            result = result.filter(v => (v.plug_access ?? 0) > 0);
        if (filters.wbeOwned)              result = result.filter(v => v.certifications.includes("WBE-Certified"));
        if (filters.mbeOwned)              result = result.filter(v => v.certifications.includes("MBE-Certified"));
        if (filters.lgbtFriendly)          result = result.filter(v => v.certifications.includes("LGBT+ Friendly"));
        if (filters.bCorpCertified)        result = result.filter(v => v.certifications.includes("B-Corp Certified"));
        if (filters.vbeOwned)              result = result.filter(v => v.certifications.includes("VBE-Certified"));
        return result;
      };

      try {
        const cacheAndApplyResult = (
          venues: EnrichedVenue[],
          landmark: LandmarkContext | null,
        ) => {
          searchResultsCacheRef.current.set(searchCacheKey, {
            venues,
            activeLandmark: landmark,
          });
          setAllVenues(venues);
          setActiveLandmark(landmark);
          setApiFailed(false);
        };

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
          sort: sortBy === "suitability" ? "suitability" as const : undefined,
        };

        if (isLandmarkSearch && lat !== undefined && lon !== undefined) {
          const allData = await api.getVenues({
            ...queryParams,
            lat,
            lon,
            radius: 2.0,
            page: 1,
            limit: SEARCH_RESULT_FETCH_LIMIT,
          });

          let matched: EnrichedVenue[] = allData.items.map(enrichVenue);
          if (filters.fourPlusStars) {
            matched = matched.filter((v) => getVenueRatingRank(v.rating) >= 4.0);
          }
          matched = matched.filter(
            (v) => v.enrichedPrice >= priceRange[0] && v.enrichedPrice <= priceRange[1]
          );
          matched = applyEdiFilters(matched);

          cacheAndApplyResult(matched, matchedLandmark);
        } else if (nameFilter) {
          const normalizedNameFilter = normalizeSearchText(nameFilter);
          let suggestionItems: VenueSuggestion[] = [];

          try {
            const suggestionRes = await api.getSuggestions(nameFilter, 10);
            suggestionItems = suggestionRes.items;
          } catch (err) {
            console.warn("Venue suggestion lookup failed:", err);
          }

          const prioritizedIds: string[] = [];
          const pushId = (venueId?: string | null) => {
            if (!venueId || prioritizedIds.includes(venueId)) return;
            prioritizedIds.push(venueId);
          };

          pushId(selectedVenueId);

          const exactSuggestion = suggestionItems.find(
            (item) => normalizeSearchText(item.name) === normalizedNameFilter
          );
          pushId(exactSuggestion?.venue_id);
          suggestionItems.forEach((item) => pushId(item.venue_id));

          const allData = await api.getVenues({
            ...queryParams,
            ...(userLocationEnabled ? { lat: PINNED_LAT, lon: PINNED_LON, radius: 50 } : {}),
            page: 1,
            limit: SEARCH_RESULT_FETCH_LIMIT,
          });

          let matched: EnrichedVenue[];
          const prioritizedRank = new Map(prioritizedIds.map((id, index) => [id, index]));

          if (prioritizedIds.length > 0) {
            matched = allData.items
              .filter((v) => prioritizedRank.has(v.venue_id))
              .sort((a, b) => (prioritizedRank.get(a.venue_id) ?? Number.MAX_SAFE_INTEGER) - (prioritizedRank.get(b.venue_id) ?? Number.MAX_SAFE_INTEGER))
              .map(enrichVenue);
          } else {
            matched = allData.items
              .filter((v) => normalizeSearchText(v.name).includes(normalizedNameFilter))
              .map(enrichVenue);
          }

          const matchedIds = new Set(matched.map((venue) => venue.venue_id));
          const missingPrioritizedIds = prioritizedIds.filter((venueId) => !matchedIds.has(venueId));

          if (missingPrioritizedIds.length > 0) {
            try {
              const fallbackDetails = await Promise.all(
                missingPrioritizedIds.slice(0, 10).map((venueId) => api.getVenueDetail(venueId).catch(() => null))
              );

              const fallbackMatches = fallbackDetails
                .filter((venue): venue is NonNullable<typeof venue> => venue !== null)
                .map(enrichVenue);
              matched = [...matched, ...fallbackMatches].sort(
                (a, b) => (prioritizedRank.get(a.venue_id) ?? Number.MAX_SAFE_INTEGER) - (prioritizedRank.get(b.venue_id) ?? Number.MAX_SAFE_INTEGER)
              );
            } catch (err) {
              console.warn("Venue detail fallback lookup failed:", err);
            }
          }

          if (filters.fourPlusStars) {
            matched = matched.filter((v) => getVenueRatingRank(v.rating) >= 4.0);
          }
          matched = matched.filter(
            (v) => v.enrichedPrice >= priceRange[0] && v.enrichedPrice <= priceRange[1]
          );
          matched = applyEdiFilters(matched);

          cacheAndApplyResult(matched, null);
        } else {
          // General browse — pass pinned coords when user granted location for proximity sorting
          const allData = await api.getVenues({
            ...queryParams,
            ...(userLocationEnabled ? { lat: PINNED_LAT, lon: PINNED_LON, radius: 50 } : {}),
            page: 1,
            limit: SEARCH_RESULT_FETCH_LIMIT,
          });

          let finalAll: EnrichedVenue[] = allData.items.map(enrichVenue);

          if (filters.fourPlusStars) {
            finalAll = finalAll.filter((v) => getVenueRatingRank(v.rating) >= 4.0);
          }
          finalAll = finalAll.filter(
            (v) => v.enrichedPrice >= priceRange[0] && v.enrichedPrice <= priceRange[1]
          );
          finalAll = applyEdiFilters(finalAll);

          cacheAndApplyResult(finalAll, null);
        }
      } catch (err) {
        console.error("Failed to load search data, using fallback data:", err);
        setApiFailed(true);
        setAllVenues([]);
        setActiveLandmark(null);
      } finally {
        setLoading(false);
      }
    };

    executeQuery();
  }, [filters, selectedVenueTypes, debouncedSearchQuery, selectedVenueSuggestionId, priceRange, searchDate, startTime, endTime, seatsRequired, duration, sortBy, userLocationEnabled]);

  useEffect(() => {
    const shouldShowFallback = !loading && !apiFailed && allVenues.length === 0;

    if (!shouldShowFallback) {
      setFallbackVenues([]);
      return;
    }

    const loadFallbackVenues = async () => {
      if (fallbackVenuesCacheRef.current) {
        setFallbackVenues(fallbackVenuesCacheRef.current);
        return;
      }

      try {
        const data = await api.getVenues({
          page: 1,
          limit: SEARCH_RESULT_FETCH_LIMIT,
          sort: "recommended",
        });
        const enrichedFallbackVenues = data.items.map(enrichVenue);
        fallbackVenuesCacheRef.current = enrichedFallbackVenues;
        setFallbackVenues(enrichedFallbackVenues);
      } catch (err) {
        console.warn("Failed to load fallback venues:", err);
        setFallbackVenues([]);
      }
    };

    loadFallbackVenues();
  }, [allVenues.length, apiFailed, loading]);

  const sortEnrichedVenues = (venues: EnrichedVenue[]) => {
    const sortedVenues = [...venues];

    if (sortBy === "suitability") {
      sortedVenues.sort((a, b) => {
        const left = getVenueSuitabilityRank(a);
        const right = getVenueSuitabilityRank(b);
        return right - left;
      });
    } else if (sortBy === "price") {
      sortedVenues.sort((a, b) => a.enrichedPrice - b.enrichedPrice);
    } else if (sortBy === "rating") {
      sortedVenues.sort((a, b) => getVenueRatingRank(b.rating) - getVenueRatingRank(a.rating));
    }

    return sortedVenues;
  };

  const emptySearchState = !loading && !apiFailed && allVenues.length === 0;
  const visibleFallbackVenues = sortEnrichedVenues(fallbackVenues).slice(0, visibleCount);
  const visibleLegacyFallbackVenues: FallbackVenue[] = manhattanVenues.slice(0, visibleCount);
  const visibleApiVenues = emptySearchState
    ? visibleFallbackVenues
    : sortEnrichedVenues(allVenues).slice(0, visibleCount);
  const canLoadMore = apiFailed
    ? manhattanVenues.length > visibleLegacyFallbackVenues.length
    : emptySearchState
      ? fallbackVenues.length > visibleFallbackVenues.length
      : allVenues.length > visibleApiVenues.length;
  const displayCount = apiFailed
    ? manhattanVenues.length
    : emptySearchState && fallbackVenues.length > 0
      ? fallbackVenues.length
      : allVenues.length;

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
    setVisibleCount(INITIAL_DISPLAY_COUNT);
  };

  const renderApiVenueCard = (venue: EnrichedVenue) => {
    const suitability = getVenueSuitabilityScore(venue);
    const busyness = busynessDisplay(venue.venue_id, venue.busyness_score, venue.busyness_label);

    return (
      <Card
        key={venue.venue_id}
        className="overflow-hidden hover:shadow-lg transition-shadow"
      >
        <div className="grid md:grid-cols-[250px_1fr] gap-4">
          <div className="relative min-h-[180px] overflow-hidden rounded-l-xl border-b border-border/60 md:border-b-0 md:border-r">
            <img
              src={venueImage(venue.venue_id, venue.osm_type ?? venue.cuisine_type ?? "workspace")}
              alt={venue.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-white/80">
                {(venue.osm_type ?? venue.cuisine_type ?? "workspace").replace(/_/g, " ")}
              </p>
              <h3 className="text-2xl font-bold leading-tight">
                {venue.name}
              </h3>
            </div>
          </div>
          <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${busyness.color}`}
                >
                  {busyness.label}
                </span>
                {(activeLandmark || userLocationEnabled) &&
                typeof venue.distance_km === "number" &&
                venue.distance_km > 0 ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4" />
                    <span>{formatDistance(venue.distance_km) ?? "Distance unavailable"}</span>
                  </div>
                ) : null}
                <h3 className="hidden">{venue.name}</h3>
                <p className="hidden text-muted-foreground">
                  {venue.cuisine_type}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                <span>{formatVenueRating(venue.rating)}</span>
              </div>
            </div>

            {renderWorkspaceFeatureBadges({
              hasWifi: venue.has_wifi,
              plugAccess: venue.plug_access ?? 0,
              callsAllowed: venue.calls_allowed,
            })}

            {venue.seats_avail > 0 && (
              <div className="mb-3">
                <span className="inline-flex items-center rounded-full border border-border/80 px-2.5 py-1 text-xs text-muted-foreground">
                  {venue.seats_avail} seats left
                </span>
              </div>
            )}

            {venue.certifications.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {venue.certifications.map((cert) => {
                  const style = EDI_BADGE_STYLES[cert] ?? { bg: "bg-gray-100", text: "text-gray-700" };
                  return (
                    <span
                      key={cert}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      {cert}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Suitability for you</span>
                <span
                  className="font-semibold"
                  style={{ color: suitability == null ? "#6b7280" : getSuitabilityColor(suitability) }}
                >
                  {suitability == null ? "New" : `${suitability}/100`}
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
                  ${venue.enrichedPrice}/hr
                </p>
                <Link
                  to={`/venue/${venue.venue_id}`}
                  state={{ searchDate, startTime, endTime, seatsRequired, landmark: activeLandmark }}
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
  };

  const renderFallbackVenueCard = (venue: FallbackVenue) => {
    const busyness = busynessDisplay(String(venue.id));

    return (
      <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="grid md:grid-cols-[250px_1fr] gap-4">
          <div className="relative min-h-[180px] overflow-hidden rounded-l-xl border-b border-border/60 md:border-b-0 md:border-r">
            <img
              src={venueImage(String(venue.id), venue.type)}
              alt={venue.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-white/80">
                {venue.type}
              </p>
              <h3 className="text-2xl font-bold leading-tight">
                {venue.name}
              </h3>
            </div>
          </div>
          <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span
                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${busyness.color}`}
                >
                  {busyness.label}
                </span>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{venue.distance} km away</span>
                </div>
                <h3 className="hidden">{venue.name}</h3>
                <p className="hidden text-muted-foreground">
                  {venue.type} • {venue.distance} km away
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                <span>{formatVenueRating(venue.rating)}</span>
                <span className="text-muted-foreground">({venue.reviews})</span>
              </div>
            </div>

            {renderWorkspaceFeatureBadges({
              hasWifi: venue.amenities.includes("WiFi"),
              plugAccess: venue.amenities.includes("Power Outlets") ? 1 : 0,
              callsAllowed: venue.amenities.includes("Calls Allowed"),
            })}

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
                <Select value={duration} onValueChange={(val) => { setDuration(val); setVisibleCount(INITIAL_DISPLAY_COUNT); }}>
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
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                          setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
                  }}
                />
                <Label htmlFor="accessibilityFriendly" className="flex items-center gap-2 cursor-pointer">
                  <Accessibility className="size-4" />
                  Accessibility Friendly
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="plugAccess"
                  checked={filters.plugAccess}
                  onCheckedChange={(checked) => {
                    setFilters({ ...filters, plugAccess: checked as boolean });
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
                  }}
                />
                <Label htmlFor="plugAccess" className="flex items-center gap-2 cursor-pointer">
                  <Zap className="size-4" />
                  Plug Access
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
                  onCheckedChange={(checked) => { setFilters({ ...filters, wbeOwned: checked as boolean }); setVisibleCount(INITIAL_DISPLAY_COUNT); }}
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
                  onCheckedChange={(checked) => { setFilters({ ...filters, mbeOwned: checked as boolean }); setVisibleCount(INITIAL_DISPLAY_COUNT); }}
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
                  onCheckedChange={(checked) => { setFilters({ ...filters, lgbtFriendly: checked as boolean }); setVisibleCount(INITIAL_DISPLAY_COUNT); }}
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
                  onCheckedChange={(checked) => { setFilters({ ...filters, bCorpCertified: checked as boolean }); setVisibleCount(INITIAL_DISPLAY_COUNT); }}
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
                  onCheckedChange={(checked) => { setFilters({ ...filters, vbeOwned: checked as boolean }); setVisibleCount(INITIAL_DISPLAY_COUNT); }}
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
                setVisibleCount(INITIAL_DISPLAY_COUNT);
              }}
              min={3}
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
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                      setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                      setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                  setSelectedVenueSuggestionId(null);
                  setVisibleCount(INITIAL_DISPLAY_COUNT);
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
                        setSelectedVenueSuggestionId(item.type === "venue" ? item.id ?? null : null);
                        setShowSuggestions(false);
                        setVisibleCount(INITIAL_DISPLAY_COUNT);
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

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">{displayCount} spaces available</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="sortBy" className="text-sm text-muted-foreground">
                  Sort by
                </Label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as typeof sortBy);
                    setVisibleCount(INITIAL_DISPLAY_COUNT);
                  }}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {/* <option value="default">Recommended</option> */}
                  <option value="suitability">Recommended</option>
                  <option value="rating">Customer Rating</option>
                  <option value="price">Price (Low to High)</option>
                </select>
              </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="map">Map View</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                {loading && !apiFailed ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Loader2 className="size-5 animate-spin" />
                    Loading workspaces...
                  </div>
                ) : emptySearchState ? (
                  <div className="space-y-6">
                    <div className="text-center py-6 text-muted-foreground">
                      No matching venues found. Here are some recommended venues for you.
                    </div>
                    {visibleApiVenues.map((venue) => renderApiVenueCard(venue))}
                  </div>
                ) : apiFailed ? (
                  // Fallback: render manhattanVenues with Figma card UI
                  visibleLegacyFallbackVenues.map((venue) => {
                    const busyness = busynessDisplay(String(venue.id));
                    return (
                      <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="grid md:grid-cols-[250px_1fr] gap-4">
                          <div className="relative min-h-[180px] overflow-hidden rounded-l-xl border-b border-border/60 md:border-b-0 md:border-r">
                            <img
                              src={venueImage(String(venue.id), venue.type)}
                              alt={venue.name}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.24em] text-white/80">
                                {venue.type}
                              </p>
                              <h3 className="text-2xl font-bold leading-tight">
                                {venue.name}
                              </h3>
                            </div>
                          </div>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span
                                  className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${busyness.color}`}
                                >
                                  {busyness.label}
                                </span>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />
                  <span>{venue.distance} km away</span>
                </div>
                <h3 className="hidden">{venue.name}</h3>
                                <p className="hidden text-muted-foreground">
                                  {venue.type} • {venue.distance} km away
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="size-4 fill-yellow-400 stroke-yellow-400" />
                                <span>{venue.rating}</span>
                                <span className="text-muted-foreground">({venue.reviews})</span>
                              </div>
                            </div>

                            {renderWorkspaceFeatureBadges({
                              hasWifi: venue.amenities.includes("WiFi"),
                              plugAccess: venue.amenities.includes("Power Outlets") ? 1 : 0,
                              callsAllowed: venue.amenities.includes("Calls Allowed"),
                            })}

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
                  visibleApiVenues.map((venue) => renderApiVenueCard(venue))
                )}

                {!loading && canLoadMore && (
                  <div className="flex items-center justify-center mt-8">
                    <Button
                      onClick={() => {
                        setVisibleCount((prev) => prev + INITIAL_DISPLAY_COUNT);
                      }}
                      className="px-6 py-2 cursor-pointer"
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map">
                <Card className="h-[600px] overflow-hidden border border-border shadow-sm">
                  {loading && !apiFailed ? (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-muted bg-opacity-80">
                      Loading map and active venues...
                    </div>
                  ) : (
                    <MapView
                      venues={apiFailed ? fallbackMapVenues : allVenues}
                      height="600px"
                    />
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
