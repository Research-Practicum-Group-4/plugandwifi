import axios from "axios";
import {
  LoginResponse,
  VenueDetail,
  VenueAvailability,
  BookingRequest,
  BookingResponse,
  MockPaymentResponse,
  VenueListResponse,
  UserBookingItem,
  UserBookingsResponse,
  BookingCancellationResponse,
  ProviderDashboardKPIsResponse,
  ProviderArrivalsResponse,
  VenueSuggestionsResponse,
  ChatbotRecommendRequest,
  ChatbotRecommendResponse,
  FavoriteListResponse,
  FavoriteResponse,
  AdminActionType,
  AdminActionResponse,
  AdminCustomerIssue,
  AdminVenueIssue,
  AdminStatsResponse,
  AdminDashboardOverviewResponse,
  VenueSuspensionResponse,
} from "../types/api";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Create an axios instance for real API calls
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

// Set token in headers if it exists
axiosInstance.interceptors.request.use((config: any) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically handle 401 Unauthorized errors to sign out user
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_profile");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Helper for mock delay
const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

// Pre-request auth check helper
const checkAuth = () => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new Error("Authentication required: Please log in first.");
  }
};

// ==========================================
// Mock Data Store (Matching Week 1-2 Specification)
// ==========================================
const MOCK_VENUE_NUM = 30;

const DEFAULT_VENUE_CONTRACT_FIELDS = {
  accessibility_friendly: false,
  calls_allowed: false,
  wbe_certified: false,
  mbe_certified: false,
  vbe_certified: false,
  bcorp_certified: false,
  lgbt_friendly: true,
  seat_capacity: 1,
  amenity_tags: [] as string[],
  rules_text: "",
  suitability_score: null,
};

const BASE_VENUES: VenueDetail[] = [
  {
    venue_id: "osm_12345",
    name: "Starbucks Ranelagh",
    osm_type: "cafe",
    cuisine_type: "Coffee/Tea",
    cuisine_detail: "coffee_shop",
    phone: "+353100000000",
    website: "https://example.ie",
    building_number: "12",
    street: "Main Street",
    zipcode: "D06ABC1",
    borough: "Dublin South",
    lat: 53.3090,
    lon: -6.2550,
    opening_hours: "Mo-Su 08:00-22:00",
    opening_now: true,
    has_wifi: true,
    wifi_free: true,
    hotel_stars: null,
    ...DEFAULT_VENUE_CONTRACT_FIELDS,
    hourly_profile: {
      "08": { score: 0.80, label: "loud" },
      "14": { score: 0.44, label: "moderate" }
    },
    best_hours_for_work: [10, 14, 15, 16],
    distance_km: 0.8,
    seats_avail: 12,
    total_seats: 20,
    hourly_price: 3.5,
    rating: 4.6,
    busyness_score: 45,
    busyness_label: null,
  },
  {
    venue_id: "osm_12346",
    name: "Baker Street Oven",
    osm_type: "bakery",
    cuisine_type: "Bakery",
    cuisine_detail: "artisan_bakery",
    phone: "+35317167777",
    website: "https://examplebakery.ie",
    building_number: "18",
    street: "Baker Street",
    zipcode: "D04V1W8",
    borough: "Dublin South",
    lat: 53.3078,
    lon: -6.2230,
    opening_hours: "Mo-Su 07:00-19:00",
    opening_now: true,
    has_wifi: true,
    wifi_free: true,
    hotel_stars: null,
    ...DEFAULT_VENUE_CONTRACT_FIELDS,
    hourly_profile: {
      "08": { score: 0.20, label: "quiet" },
      "14": { score: 0.12, label: "quiet" }
    },
    best_hours_for_work: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    distance_km: 1.2,
    seats_avail: 45,
    total_seats: 100,
    hourly_price: 1.5,
    rating: 4.8,
    busyness_score: 12,
    busyness_label: null,
  },
  {
    venue_id: "osm_12347",
    name: "The Grand Hotel Lobby",
    osm_type: "hotel",
    cuisine_type: "Hotel/Lounge",
    cuisine_detail: "hotel_lobby",
    phone: "+12125550199",
    website: "https://thegrandhotel.com",
    building_number: "109",
    street: "Broadway",
    zipcode: "10001",
    borough: "Manhattan",
    lat: 40.7589,
    lon: -73.9851,
    opening_hours: "Mo-Su 00:00-23:59",
    opening_now: true,
    has_wifi: true,
    wifi_free: true,
    hotel_stars: "5",
    ...DEFAULT_VENUE_CONTRACT_FIELDS,
    hourly_profile: {
      "09": { score: 0.30, label: "quiet" },
      "15": { score: 0.25, label: "quiet" }
    },
    best_hours_for_work: [9, 10, 11, 14, 15, 16, 17],
    distance_km: 0.3,
    seats_avail: 8,
    total_seats: 15,
    hourly_price: 6.0,
    rating: 4.8,
    busyness_score: 25,
    busyness_label: null,
  },
  {
    venue_id: "osm_12348",
    name: "Cafe Moderna",
    osm_type: "cafe",
    cuisine_type: "Coffee/Tea",
    cuisine_detail: "modern_cafe",
    phone: "+12125550188",
    website: "https://cafemoderna.com",
    building_number: "250",
    street: "5th Avenue",
    zipcode: "10016",
    borough: "Manhattan",
    lat: 40.7614,
    lon: -73.9776,
    opening_hours: "Mo-Su 07:00-20:00",
    opening_now: true,
    has_wifi: true,
    wifi_free: true,
    hotel_stars: null,
    ...DEFAULT_VENUE_CONTRACT_FIELDS,
    hourly_profile: {
      "12": { score: 0.85, label: "loud" },
      "16": { score: 0.65, label: "moderate" }
    },
    best_hours_for_work: [8, 9, 14, 15],
    distance_km: 0.8,
    seats_avail: 5,
    total_seats: 25,
    hourly_price: 4.0,
    rating: 4.6,
    busyness_score: 78,
    busyness_label: null,
  },
  {
    venue_id: "osm_12349",
    name: "Union Square Kitchen",
    osm_type: "restaurant",
    cuisine_type: "Restaurant",
    cuisine_detail: "casual_restaurant",
    phone: "+12125550177",
    website: "https://unionsquarekitchen.com",
    building_number: "45",
    street: "Wall Street",
    zipcode: "10005",
    borough: "Manhattan",
    lat: 40.7549,
    lon: -73.9840,
    opening_hours: "Mo-Fr 08:00-19:00",
    opening_now: true,
    has_wifi: true,
    wifi_free: false,
    hotel_stars: null,
    ...DEFAULT_VENUE_CONTRACT_FIELDS,
    hourly_profile: {
      "09": { score: 0.20, label: "quiet" },
      "17": { score: 0.35, label: "moderate" }
    },
    best_hours_for_work: [9, 10, 11, 12, 13, 14, 15, 16, 17],
    distance_km: 0.5,
    seats_avail: 18,
    total_seats: 40,
    hourly_price: 8.0,
    rating: 4.9,
    busyness_score: 95,
    busyness_label: null,
  }
];

const generateMockVenues = (): VenueDetail[] => {
  const venues = [...BASE_VENUES];

  // Deterministic LCG seeded by index — no Math.random() so results are stable across refreshes
  const lcg = (seed: number) => {
    let s = (seed * 1664525 + 1013904223) >>> 0;
    return {
      next: () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; },
      pick: <T>(arr: T[]): T => { s = (s * 1664525 + 1013904223) >>> 0; return arr[s % arr.length]; },
    };
  };

  const names = [
    "Tech Space Cafe", "The Quiet Nook", "Study Corner Cafe",
    "Borough Library Room", "Elite Business Lounge", "Metropolitan Lounge",
    "Boutique Workspace", "Green Oasis Lounge", "Urban Study Hall", "The Hub",
    "Corner Co-working Cafe", "Central Park Lounge"
  ];

  const osmTypes = ["bakery", "restaurant", "hotel", "cafe"];
  const cuisineTypes = ["Bakery", "Restaurant", "Hotel/Lounge", "Coffee/Tea"];
  const cuisineDetails = ["artisan_bakery", "casual_restaurant", "hotel_lobby", "modern_cafe", "coffee_shop"];
  const streets = ["Dame Street", "Grand Canal Dock", "Broadway", "Wall Street", "5th Avenue", "O'Connell Street"];
  const boroughs = ["Manhattan", "Brooklyn", "Dublin South", "Dublin North", "Dublin Center"];
  const zipcodes = ["D02XY23", "D06ABC1", "10001", "10005", "10016", "D04V1W8"];
  const hourlyProfileLabels = ["quiet", "moderate", "loud"];

  for (let i = 5; i < MOCK_VENUE_NUM; i++) {
    const rng = lcg(i * 31337);
    const venue_id = `osm_123${50 + i}`;
    const name = `${rng.pick(names)} ${i}`;
    const osm_type = rng.pick(osmTypes);
    const cuisine_type = rng.pick(cuisineTypes);
    const cuisine_detail = rng.pick(cuisineDetails);
    const street = rng.pick(streets);
    const borough = rng.pick(boroughs);
    const zipcode = rng.pick(zipcodes);
    const hourly_profile_label = rng.pick(hourlyProfileLabels);
    
    const hourly_profile_score = Math.round((hourly_profile_label === "quiet" ? Math.random() * 0.3 : hourly_profile_label === "moderate" ? 0.3 + Math.random() * 0.4 : 0.7 + Math.random() * 0.3) * 100) / 100;
    const rating = Math.round((3.8 + Math.random() * 1.2) * 10) / 10;
    const hourly_price = Math.round((1.5 + Math.random() * 8) * 2) / 2;
    const total_seats = rng.pick([15, 20, 25, 30, 40, 50, 100]);
    const seats_avail = Math.floor(Math.random() * total_seats);
    
    const inDublin = Math.random() > 0.5;
    const lat = inDublin ? 53.30 + Math.random() * 0.05 : 40.74 + Math.random() * 0.04;
    const lon = inDublin ? -6.25 + Math.random() * 0.05 : -73.98 + Math.random() * 0.04;
    const distance_km = Math.round((0.1 + Math.random() * 2.5) * 10) / 10;

    venues.push({
      venue_id,
      name,
      osm_type,
      cuisine_type,
      cuisine_detail,
      phone: `+12125550${100 + i}`,
      website: `https://example_${i}.com`,
      building_number: `${Math.floor(Math.random() * 300) + 1}`,
      street,
      zipcode,
      borough,
      lat,
      lon,
      opening_hours: "Mo-Su 08:00-22:00",
      opening_now: rng.next() > 0.1,
      has_wifi: true,
      wifi_free: Math.random() > 0.3,
      hotel_stars: osm_type === "hotel" ? `${Math.floor(Math.random() * 2) + 4}` : null,
      ...DEFAULT_VENUE_CONTRACT_FIELDS,
      hourly_profile: {
        "09": { score: Math.round(hourly_profile_score * 0.9 * 100) / 100, label: hourly_profile_label },
        "15": { score: hourly_profile_score, label: hourly_profile_label }
      },
      best_hours_for_work: [9, 10, 11, 14, 15, 16],
      distance_km,
      seats_avail,
      total_seats,
      hourly_price,
      rating,
      busyness_score: Math.round(rng.next() * 100),
      busyness_label: null, // derived on display from busyness_score
    });
  }
  return venues;
};

const mockVenues: VenueDetail[] = generateMockVenues();

const mockBookings: UserBookingItem[] = [
  {
    booking_id: 101,
    venue_id: "osm_12345",
    venue_name: "Starbucks Ranelagh",
    booking_date: "2026-06-03",
    start_time: "09:00:00",
    end_time: "10:00:00",
    seats_reserved: 1,
    status: "completed",
    order_id: "ORD-20260603-01",
    payment_status: "paid",
    lat: 53.3090,
    lon: -6.2550
  },
  {
    booking_id: 102,
    venue_id: "osm_12346",
    venue_name: "UCD Library",
    booking_date: "2026-07-15",
    start_time: "14:00:00",
    end_time: "16:00:00",
    seats_reserved: 2,
    status: "upcoming",
    order_id: "ORD-20260715-02",
    payment_status: "paid",
    lat: 53.3078,
    lon: -6.2230
  },
  {
    booking_id: 103,
    venue_id: "osm_12347",
    venue_name: "The Grand Hotel Lobby",
    booking_date: "2026-05-20",
    start_time: "11:00:00",
    end_time: "13:00:00",
    seats_reserved: 1,
    status: "cancelled",
    order_id: "ORD-20260520-03",
    payment_status: "refunded",
    lat: 40.7589,
    lon: -73.9851
  }
];

const mockFavoritesByUserId: Record<number, string[]> = {
  1: [],
  2: [],
};

const generateMockAvailability = (venues: VenueDetail[]): Record<string, VenueAvailability> => {
  const availability: Record<string, VenueAvailability> = {};
  
  availability["osm_12345"] = {
    venue_id: "osm_12345",
    available_slots: [
      { slot_id: 1, start_time: "2026-06-05T09:00:00", end_time: "2026-06-05T10:00:00", available: true },
      { slot_id: 2, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: false },
      { slot_id: 3, start_time: "2026-06-05T11:00:00", end_time: "2026-06-05T12:00:00", available: true },
      { slot_id: 4, start_time: "2026-06-05T14:00:00", end_time: "2026-06-05T15:00:00", available: true }
    ]
  };
  availability["osm_12346"] = {
    venue_id: "osm_12346",
    available_slots: [
      { slot_id: 5, start_time: "2026-06-05T09:00:00", end_time: "2026-06-05T10:00:00", available: true },
      { slot_id: 6, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: true },
      { slot_id: 7, start_time: "2026-06-05T11:00:00", end_time: "2026-06-05T12:00:00", available: true }
    ]
  };
  availability["osm_12347"] = {
    venue_id: "osm_12347",
    available_slots: [
      { slot_id: 8, start_time: "2026-06-05T14:00:00", end_time: "2026-06-05T15:00:00", available: true },
      { slot_id: 9, start_time: "2026-06-05T15:00:00", end_time: "2026-06-05T16:00:00", available: true }
    ]
  };
  availability["osm_12348"] = {
    venue_id: "osm_12348",
    available_slots: [
      { slot_id: 10, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: true },
      { slot_id: 11, start_time: "2026-06-05T11:00:00", end_time: "2026-06-05T12:00:00", available: true }
    ]
  };
  availability["osm_12349"] = {
    venue_id: "osm_12349",
    available_slots: [
      { slot_id: 12, start_time: "2026-06-05T09:00:00", end_time: "2026-06-05T10:00:00", available: true },
      { slot_id: 13, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: true }
    ]
  };

  let slotId = 14;
  for (const v of venues) {
    if (!availability[v.venue_id]) {
      // Seed availability deterministically from the venue_id string
      let h = 5381;
      for (let k = 0; k < v.venue_id.length; k++) { h = (((h << 5) + h) ^ v.venue_id.charCodeAt(k)) >>> 0; }
      const avail = (offset: number) => (((h * (offset + 1)) >>> 0) % 10) > 2;
      availability[v.venue_id] = {
        venue_id: v.venue_id,
        available_slots: [
          { slot_id: slotId++, start_time: "2026-06-05T09:00:00", end_time: "2026-06-05T10:00:00", available: avail(0) },
          { slot_id: slotId++, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: avail(1) },
          { slot_id: slotId++, start_time: "2026-06-05T11:00:00", end_time: "2026-06-05T12:00:00", available: avail(2) },
          { slot_id: slotId++, start_time: "2026-06-05T14:00:00", end_time: "2026-06-05T15:00:00", available: avail(3) }
        ]
      };
    }
  }
  return availability;
};

const mockAvailability: Record<string, VenueAvailability> = generateMockAvailability(mockVenues);

const getMockCurrentUserId = (): number => {
  const userProfile = localStorage.getItem("user_profile");
  if (!userProfile) {
    throw new Error("Authentication required: Please log in first.");
  }

  try {
    const parsed = JSON.parse(userProfile);
    return parsed.user_id || parsed.id || 1;
  } catch {
    throw new Error("Authentication required: Please log in first.");
  }
};

// ==========================================
// API Implementation
// ==========================================
export const api = {
  // 1. Authentication
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    if (USE_MOCK) {
      await delay(300);
      if (credentials.email && credentials.password) {
        const isProvider = credentials.email.includes("provider");
        return {
          access_token: "mock_jwt_token",
          user: {
            user_id: isProvider ? 2 : 1,
            full_name: isProvider ? "Mock Provider" : "Sunmin Lee",
            email: credentials.email,
            role: isProvider ? "provider" : "user"
          }
        };
      }
      throw new Error("Invalid credentials");
    } else {
      const response = await axiosInstance.post<any>("/auth/login", credentials);
      const data = response.data;
      return {
        access_token: data.access_token,
        user: {
          user_id: data.user.user_id || data.user.id,
          id: data.user.user_id || data.user.id,
          full_name: data.user.full_name,
          email: data.user.email,
          role: data.user.role || "user"
        }
      };
    }
  },

  register: async (user: { full_name: string; email: string; password: string; role?: string }): Promise<{ message: string }> => {
    if (USE_MOCK) {
      await delay(300);
      return { message: "User created successfully" };
    } else {
      const response = await axiosInstance.post<{ message: string }>("/auth/register", user);
      return response.data;
    }
  },

  // 2. Get Venues List (with filtering)
  getVenues: async (filters?: {
    cuisine_type?: string;
    venue_type?: string | string[];
    borough?: string;
    has_wifi?: boolean;
    wifi_free?: boolean;
    wifi?: boolean;
    plug_access?: number;
    accessibility_friendly?: boolean;
    calls_allowed?: boolean;
    wbe_certified?: boolean;
    mbe_certified?: boolean;
    vbe_certified?: boolean;
    bcorp_certified?: boolean;
    lgbt_friendly?: boolean;
    opening_now?: boolean;
    max_price?: number;
    page?: number;
    limit?: number;
    name?: string;
    lat?: number;
    lon?: number;
    radius?: number;
    date?: string;
    start_time?: string;
    end_time?: string;
    duration_hours?: number;
    seats_required?: number;
    sort?: "recommended" | "suitability";
  }): Promise<VenueListResponse> => {
    if (USE_MOCK) {
      await delay(400);
      let filtered = [...mockVenues];

      if (filters) {
        if (filters.cuisine_type) {
          filtered = filtered.filter(v => v.cuisine_type.toLowerCase() === filters.cuisine_type?.toLowerCase());
        }
        if (filters.borough) {
          filtered = filtered.filter(v => v.borough.toLowerCase().includes(filters.borough?.toLowerCase() || ""));
        }
        if (filters.has_wifi !== undefined) {
          filtered = filtered.filter(v => v.has_wifi === filters.has_wifi);
        }
        if (filters.wifi_free !== undefined) {
          filtered = filtered.filter(v => v.wifi_free === filters.wifi_free);
        }
        if (filters.opening_now !== undefined) {
          filtered = filtered.filter(v => v.opening_now === filters.opening_now);
        }
        if (filters.max_price !== undefined) {
          filtered = filtered.filter(v => v.hourly_price <= filters.max_price!);
        }
        if (filters.plug_access !== undefined) {
          filtered = filtered.filter(v => v.plug_access === filters.plug_access);
        }
        if (filters.accessibility_friendly !== undefined) {
          filtered = filtered.filter(v => v.accessibility_friendly === filters.accessibility_friendly);
        }
        if (filters.calls_allowed !== undefined) {
          filtered = filtered.filter(v => v.calls_allowed === filters.calls_allowed);
        }
        if (filters.wbe_certified !== undefined) {
          filtered = filtered.filter(v => v.wbe_certified === filters.wbe_certified);
        }
        if (filters.mbe_certified !== undefined) {
          filtered = filtered.filter(v => v.mbe_certified === filters.mbe_certified);
        }
        if (filters.vbe_certified !== undefined) {
          filtered = filtered.filter(v => v.vbe_certified === filters.vbe_certified);
        }
        if (filters.bcorp_certified !== undefined) {
          filtered = filtered.filter(v => v.bcorp_certified === filters.bcorp_certified);
        }
        if (filters.lgbt_friendly !== undefined) {
          filtered = filtered.filter(v => v.lgbt_friendly === filters.lgbt_friendly);
        }
        if (filters.venue_type !== undefined) {
          const types = Array.isArray(filters.venue_type) ? filters.venue_type : [filters.venue_type];
          filtered = filtered.filter(v => types.some(type => v.osm_type.toLowerCase() === type.toLowerCase()));
        }
        if (filters.name) {
          filtered = filtered.filter(v => v.name.toLowerCase().includes(filters.name!.toLowerCase()));
        }
        if (filters.lat !== undefined && filters.lon !== undefined) {
          const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371; // Earth radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          };
          const radius = filters.radius ?? 2.0;
          filtered = filtered.map(v => ({
            ...v,
            distance_km: Math.round(calculateDistance(filters.lat!, filters.lon!, v.lat, v.lon) * 10) / 10
          })).filter(v => v.distance_km <= radius);
          filtered.sort((a, b) => a.distance_km - b.distance_km);
        }
      }

      const limit = filters?.limit ?? 20;
      const page = filters?.page ?? 1;
      const offset = (page - 1) * limit;
      const paginatedItems = filtered.slice(offset, offset + limit);
      const total_items = filtered.length;
      const total_pages = Math.ceil(total_items / limit);
      const has_more = filtered.length > offset + limit;

      // Return a list of basic Venue items
      return {
        items: paginatedItems.map((v) => ({
          venue_id: v.venue_id,
          name: v.name,
          cuisine_type: v.cuisine_type,
          distance_km: v.distance_km,
          has_wifi: v.has_wifi,
          wifi_free: v.wifi_free,
          opening_now: v.opening_now,
          seats_avail: v.seats_avail,
          total_seats: v.total_seats,
          hourly_price: v.hourly_price,
          rating: v.rating,
          lat: v.lat,
          lon: v.lon,
          accessibility_friendly: Boolean(v.accessibility_friendly),
          calls_allowed: Boolean(v.calls_allowed),
          wbe_certified: Boolean(v.wbe_certified),
          mbe_certified: Boolean(v.mbe_certified),
          vbe_certified: Boolean(v.vbe_certified),
          bcorp_certified: Boolean(v.bcorp_certified),
          lgbt_friendly: Boolean(v.lgbt_friendly),
        })),
        page,
        limit,
        total_items,
        total_pages,
        has_more
      };
    } else {
      // Map filters to backend query parameters
      const params = new URLSearchParams();
      const setParam = (key: string, value: unknown) => {
        if (value === undefined || value === null) return;
        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, String(item)));
        } else {
          params.set(key, String(value));
        }
      };
      if (filters) {
        if (filters.has_wifi !== undefined) setParam("wifi", filters.has_wifi);
        else if (filters.wifi !== undefined) setParam("wifi", filters.wifi);
        else if (filters.wifi_free !== undefined) setParam("wifi", filters.wifi_free);
        setParam("plug_access", filters.plug_access);
        setParam("venue_type", filters.venue_type);
        setParam("accessibility_friendly", filters.accessibility_friendly);
        setParam("calls_allowed", filters.calls_allowed);
        setParam("wbe_certified", filters.wbe_certified);
        setParam("mbe_certified", filters.mbe_certified);
        setParam("vbe_certified", filters.vbe_certified);
        setParam("bcorp_certified", filters.bcorp_certified);
        setParam("lgbt_friendly", filters.lgbt_friendly);
        setParam("borough", filters.borough);
        setParam("max_price", filters.max_price);
        setParam("page", filters.page);
        setParam("limit", filters.limit);
        setParam("name", filters.name);
        setParam("lat", filters.lat);
        setParam("lon", filters.lon);
        setParam("radius", filters.radius);
        setParam("date", filters.date);
        setParam("start_time", filters.start_time);
        setParam("end_time", filters.end_time);
        setParam("duration_hours", filters.duration_hours);
        setParam("seats_required", filters.seats_required);
        setParam("sort", filters.sort);
      }
      const response = await axiosInstance.get<any>("/venues", { params });
      const raw = response.data;
      // Normalise list items: backend omits wifi_free/opening_now/seats_avail
      const items = (raw.items ?? []).map((v: any) => ({
        ...v,
        wifi_free: v.wifi_free ?? (v.has_wifi ?? false),
        opening_now: v.opening_now ?? true,
        seats_avail: v.seats_avail ?? v.plugs_available ?? 0,
        total_seats: v.total_seats ?? 0,
        distance_km: v.distance_km ?? 0,
        suitability_score: v.suitability_score ?? null,
      }));
      return { ...raw, items } as VenueListResponse;
    }
  },

  // 3. Get Venue Details
  getVenueDetail: async (venueId: string): Promise<VenueDetail> => {
    if (USE_MOCK) {
      await delay(300);
      const venue = mockVenues.find(v => v.venue_id === venueId);
      if (venue) return venue;
      throw new Error("Venue not found");
    } else {
      const response = await axiosInstance.get<any>(`/venues/${venueId}`);
      const d = response.data;
      // Backend stores best_hours_for_work and hourly_profile as JSON strings
      return {
        ...d,
        best_hours_for_work: typeof d.best_hours_for_work === "string"
          ? JSON.parse(d.best_hours_for_work)
          : (d.best_hours_for_work ?? []),
        hourly_profile: typeof d.hourly_profile === "string"
          ? JSON.parse(d.hourly_profile)
          : (d.hourly_profile ?? {}),
        // Fields not in backend detail response — provide safe defaults
        wifi_free: d.wifi_free ?? (d.inferred_wifi ?? d.has_wifi ?? false),
        opening_now: d.opening_now ?? true,
        seats_avail: d.seats_avail ?? d.seat_capacity ?? 0,
        total_seats: d.total_seats ?? d.seat_capacity ?? 0,
        hotel_stars: d.hotel_stars ?? null,
        distance_km: d.distance_km ?? 0,
      } as VenueDetail;
    }
  },

  // 4. Get Availability slots
  getAvailability: async (venueId: string): Promise<VenueAvailability> => {
    if (USE_MOCK) {
      await delay(200);
      const slots = mockAvailability[venueId];
      if (slots) return slots;
      return { venue_id: venueId, available_slots: [] };
    } else {
      try {
        const response = await axiosInstance.get<VenueAvailability>(`/venues/${venueId}/availability`);
        return response.data;
      } catch (err) {
        console.warn("Availability API fallback to simulated slots", err);
        return {
          venue_id: venueId,
          available_slots: [
            { slot_id: 1, start_time: "2026-06-15T09:00:00", end_time: "2026-06-15T12:00:00", available: true },
            { slot_id: 2, start_time: "2026-06-15T13:00:00", end_time: "2026-06-15T15:00:00", available: true },
            { slot_id: 3, start_time: "2026-06-15T15:30:00", end_time: "2026-06-15T18:00:00", available: true },
          ]
        };
      }
    }
  },

  // 5. Create Booking
  createBooking: async (booking: BookingRequest): Promise<BookingResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(500);
      const venue = mockVenues.find(v => v.venue_id === booking.venue_id);
      const newBookingId = 100 + mockBookings.length + 1;
      
      const newBooking: UserBookingItem = {
        booking_id: newBookingId,
        venue_id: booking.venue_id,
        venue_name: venue?.name || "Unknown Venue",
        booking_date: booking.booking_date,
        start_time: booking.start_time.includes(":") ? booking.start_time : `${booking.start_time}:00`,
        end_time: booking.end_time.includes(":") ? booking.end_time : `${booking.end_time}:00`,
        seats_reserved: booking.seats_reserved,
        status: "pending_payment",
        order_id: `ORD-20260625-${newBookingId}`,
        payment_status: "pending",
        lat: venue?.lat || null,
        lon: venue?.lon || null
      };
      
      mockBookings.push(newBooking);

      // Prune seat availability
      if (venue && (venue.seats_avail ?? 0) > 0) {
        venue.seats_avail = Math.max(0, (venue.seats_avail ?? 0) - booking.seats_reserved);
      }

      return {
        booking_id: newBookingId,
        status: "pending_payment",
        message: "Booking created pending payment",
        payment_status: "pending",
        order_id: newBooking.order_id
      };
    } else {
      const response = await axiosInstance.post<any>("/bookings", booking);
      return {
        booking_id: response.data.id || response.data.booking_id,
        status: response.data.status,
        message: "Booking created pending payment",
        payment_status: response.data.payment_status,
        order_id: response.data.order_id
      };
    }
  },

  confirmMockPayment: async (payment: {
    booking_id: number;
    card_number: string;
  }): Promise<MockPaymentResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(700);
      const booking = mockBookings.find(b => b.booking_id === payment.booking_id);
      if (!booking) {
        throw new Error("Booking not found");
      }

      const normalizedCard = payment.card_number.replace(/\D/g, "");
      if (normalizedCard === "4242424242424242") {
        booking.payment_status = "paid";
        booking.status = "upcoming";
        return {
          booking_id: booking.booking_id,
          order_id: booking.order_id,
          status: "confirmed",
          payment_status: "paid",
          message: "Mock payment approved"
        };
      }

      if (normalizedCard === "4000000000000002") {
        booking.payment_status = "failed";
        booking.status = "payment_failed";
        return {
          booking_id: booking.booking_id,
          order_id: booking.order_id,
          status: "payment_failed",
          payment_status: "failed",
          message: "Mock payment declined"
        };
      }

      throw new Error("Use 4242 4242 4242 4242 for success or 4000 0000 0000 0002 for failure.");
    } else {
      const response = await axiosInstance.post<MockPaymentResponse>("/payments/mock-confirm", payment);
      return response.data;
    }
  },

  // 6. Get User Bookings
  getUserBookings: async (): Promise<UserBookingsResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return {
        upcoming: mockBookings.filter(b => b.status === "upcoming"),
        completed: mockBookings.filter(b => b.status === "completed"),
        cancelled: mockBookings.filter(b => b.status === "cancelled" || b.status === "canceled")
      };
    } else {
      const response = await axiosInstance.get<UserBookingsResponse>("/users/me/bookings");
      return response.data;
    }
  },

  // 7. Cancel Booking
  cancelBooking: async (bookingId: number): Promise<BookingCancellationResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      const booking = mockBookings.find(b => b.booking_id === bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }
      if (booking.status === "cancelled") {
        throw new Error("Booking is already cancelled");
      }
      if (booking.status === "completed") {
        throw new Error("Completed bookings cannot be cancelled");
      }

      // Simulated cancellation window check
      // Assume local date is 2026-06-25T19:53:42 as metadata says.
      const now = new Date("2026-06-25T19:53:42");
      const bookingStart = new Date(`${booking.booking_date}T${booking.start_time}`);
      const hoursDiff = (bookingStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      // If booking date is less than 24 hours away, simulate a 409 Conflict rejection
      if (hoursDiff < 24) {
        const err: any = new Error("Booking can only be cancelled at least 24 hours before the start time");
        err.response = {
          status: 409,
          data: {
            detail: "Booking can only be cancelled at least 24 hours before the start time"
          }
        };
        throw err;
      }

      booking.status = "cancelled";
      booking.payment_status = "refund_pending";

      return {
        booking_id: bookingId,
        status: "cancelled",
        payment_status: "refund_pending",
        released_seats: booking.seats_reserved,
        message: "Booking cancelled successfully"
      };
    } else {
      const response = await axiosInstance.patch<BookingCancellationResponse>(`/bookings/${bookingId}/cancel`);
      return response.data;
    }
  },

  // 8. Get Provider KPIs
  getProviderKPIs: async (): Promise<ProviderDashboardKPIsResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return {
        window_days: 30,
        total_reservations: { value: 127, delta_percent: 12 },
        monthly_revenue: { value: 2450, delta_percent: 18 },
        active_properties_count: { value: 3, delta_percent: 0 },
        average_user_rating: { value: 4.8, delta_percent: 4.1 }
      };
    } else {
      const response = await axiosInstance.get<ProviderDashboardKPIsResponse>("/provider/dashboard/kpis");
      return response.data;
    }
  },

  // 9. Get Provider Arrivals
  getProviderArrivals: async (): Promise<ProviderArrivalsResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return {
        items: [
          {
            booking_id: 1,
            client_full_name: "Sarah Johnson",
            venue_id: "osm_12347",
            venue_name: "Grand Hotel Lobby - Table 5",
            confirmation_status: "confirmed",
            booking_date: "2026-06-28",
            start_time: "14:00:00",
            end_time: "16:00:00",
            seats_reserved: 1,
            space_label: "Table 5",
            fee_estimate: 24.0
          },
          {
            booking_id: 2,
            client_full_name: "Michael Chen",
            venue_id: "osm_12347",
            venue_name: "Grand Hotel Lobby - Table 3",
            confirmation_status: "confirmed",
            booking_date: "2026-06-28",
            start_time: "15:00:00",
            end_time: "17:00:00",
            seats_reserved: 1,
            space_label: "Table 3",
            fee_estimate: 24.0
          },
          {
            booking_id: 3,
            client_full_name: "Emma Wilson",
            venue_id: "osm_12349",
            venue_name: "Business Lounge - Desk 2",
            confirmation_status: "pending",
            booking_date: "2026-06-29",
            start_time: "10:00:00",
            end_time: "13:00:00",
            seats_reserved: 1,
            space_label: "Desk 2",
            fee_estimate: 45.0
          }
        ]
      };
    } else {
      const response = await axiosInstance.get<ProviderArrivalsResponse>("/provider/dashboard/arrivals");
      return response.data;
    }
  },

  // 10. Get Venue Suggestions (Autocomplete)
  getSuggestions: async (q: string, limit: number = 8): Promise<VenueSuggestionsResponse> => {
    if (USE_MOCK) {
      await delay(100);
      const filtered = mockVenues
        .filter(v => v.name.toLowerCase().includes(q.toLowerCase()))
        .slice(0, limit)
        .map(v => ({
          venue_id: v.venue_id,
          name: v.name,
          lat: v.lat,
          lon: v.lon,
          borough: v.borough || "",
          type: "venue" as const
        }));
      return { items: filtered };
    } else {
      const response = await axiosInstance.get<VenueSuggestionsResponse>("/venues/suggestions", {
        params: { q, limit }
      });
      return response.data;
    }
  },

  // 11. Call Gemini Chatbot
  getChatbotReply: async (
    message: string,
    chat_history: ChatbotRecommendRequest["chat_history"] = []
  ): Promise<ChatbotRecommendResponse> => {
    if (USE_MOCK) {
      await delay(800);
      return {
        response: `Hello! I am your Manhattan AI assistant. Based on your prompt "${message}", I recommend booking Flatiron Workspace or Grand Central Office Hub.`,
        model: "gemini-1.5-flash"
      };
    } else {
      const response = await axiosInstance.post<ChatbotRecommendResponse>(
        "/chatbot/recommend",
        { message, chat_history }
      );
      return response.data;
    }
  },

  // 12. Add Venue to Favorites
  getMyFavorites: async (): Promise<FavoriteListResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(200);
      const userId = getMockCurrentUserId();
      return { venue_ids: [...(mockFavoritesByUserId[userId] ?? [])] };
    } else {
      const response = await axiosInstance.get<FavoriteListResponse>("/favorites/me");
      return response.data;
    }
  },

  addFavorite: async (venueId: string): Promise<FavoriteResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(200);
      const userId = getMockCurrentUserId();
      const favorites = mockFavoritesByUserId[userId] ?? [];
      if (favorites.includes(venueId)) {
        const err: any = new Error("Favorite already exists");
        err.response = { status: 409, data: { detail: "Favorite already exists" } };
        throw err;
      }
      mockFavoritesByUserId[userId] = [...favorites, venueId];
      return { user_id: userId, venue_id: venueId, message: "Favorite created successfully" };
    } else {
      const response = await axiosInstance.post<FavoriteResponse>(`/favorites/${venueId}`);
      return response.data;
    }
  },

  // 13. Remove Venue from Favorites
  removeFavorite: async (venueId: string): Promise<{ message: string }> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(200);
      const userId = getMockCurrentUserId();
      const favorites = mockFavoritesByUserId[userId] ?? [];
      if (!favorites.includes(venueId)) {
        const err: any = new Error("Favorite not found");
        err.response = { status: 404, data: { detail: "Favorite not found" } };
        throw err;
      }
      mockFavoritesByUserId[userId] = favorites.filter((favoriteId) => favoriteId !== venueId);
      return { message: "Favorite removed successfully" };
    } else {
      const response = await axiosInstance.delete<{ message: string }>(`/favorites/${venueId}`);
      return response.data;
    }
  },

  // 14. Admin — Get platform stats
  getAdminStats: async (): Promise<AdminStatsResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return {
        total_revenue: 45670,
        total_bookings: 1890,
        avg_booking_value: 24,
        median_venue_revenue: 1250,
        total_venues: 127,
        active_venues: 98,
        pending_approval: 15,
        suspended_venues: 14,
        top_performer: "The Grand Hotel Lobby",
        total_users: 3456,
        active_users: 2890,
        new_this_month: 234,
        churn_rate: 5.2,
      };
    } else {
      const response = await axiosInstance.get<AdminStatsResponse>("/admin/stats");
      return response.data;
    }
  },

  getAdminOverview: async (): Promise<AdminDashboardOverviewResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return {
        global_active_properties: 98,
        total_completed_checkout_revenues: 45670,
        system_incident_counts: {
          cancelled_bookings: 12,
          refund_pending_bookings: 3,
          unavailable_slots: 4,
        },
      };
    } else {
      const response = await axiosInstance.get<AdminDashboardOverviewResponse>(
        "/admin/dashboard/overview"
      );
      return response.data;
    }
  },

  // 15. Admin — Get customer issues
  getAdminCustomerIssues: async (): Promise<AdminCustomerIssue[]> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return [
        {
          id: 1,
          user_id: "USR-1234",
          user_name: "John Doe",
          issue: "Unorderly behavior at The Grand Hotel Lobby",
          description: "Customer was causing disturbance and using inappropriate language with staff",
          severity: "high",
          reported_at: "2026-06-01",
          status: "pending",
        },
        {
          id: 2,
          user_id: "USR-5678",
          user_name: "Jane Smith",
          issue: "Multiple no-shows without cancellation",
          description: "Customer has not shown up for 3 consecutive bookings in the past week",
          severity: "medium",
          reported_at: "2026-05-30",
          status: "pending",
        },
        {
          id: 3,
          user_id: "USR-9012",
          user_name: "Mike Johnson",
          issue: "Damage to venue property",
          description: "Spilled liquid on furniture causing damage, refused to compensate",
          severity: "high",
          reported_at: "2026-05-28",
          status: "pending",
        },
      ];
    } else {
      const response = await axiosInstance.get<AdminCustomerIssue[]>("/admin/customer-issues");
      return response.data;
    }
  },

  // 16. Admin — Get venue issues
  getAdminVenueIssues: async (): Promise<AdminVenueIssue[]> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return [
        {
          id: 1,
          venue_id: "osm_12345",
          venue_name: "Bryant Park Cafe",
          issue: "Multiple noise complaints",
          description: "Venue has received 5 noise complaints from customers in the past month",
          severity: "high",
          reported_at: "2026-06-02",
          status: "pending",
        },
        {
          id: 2,
          venue_id: "osm_12347",
          venue_name: "Grand Central Lounge",
          issue: "Overbooked seats 3 times",
          description: "Venue accepted more bookings than available seats on 3 separate occasions",
          severity: "medium",
          reported_at: "2026-05-29",
          status: "pending",
        },
      ];
    } else {
      const response = await axiosInstance.get<AdminVenueIssue[]>("/admin/venue-issues");
      return response.data;
    }
  },

  // 17. Admin — Take action on a customer issue
  adminActionCustomer: async (issueId: number, action: AdminActionType): Promise<AdminActionResponse> => {
    checkAuth();
    const statusMap: Record<AdminActionType, AdminActionResponse["status"]> = {
      warn: "warned",
      suspend: "suspended",
      ban: "banned",
    };
    if (USE_MOCK) {
      await delay(400);
      return {
        id: issueId,
        action,
        status: statusMap[action],
        message: `Action '${action}' applied to customer issue #${issueId}`,
      };
    } else {
      const response = await axiosInstance.post<AdminActionResponse>(
        `/admin/customer-issues/${issueId}/action`,
        { action }
      );
      return response.data;
    }
  },

  // 18. Admin — Take action on a venue issue
  adminActionVenue: async (issueId: number, action: AdminActionType): Promise<AdminActionResponse> => {
    checkAuth();
    const statusMap: Record<AdminActionType, AdminActionResponse["status"]> = {
      warn: "warned",
      suspend: "suspended",
      ban: "banned",
    };
    if (USE_MOCK) {
      await delay(400);
      return {
        id: issueId,
        action,
        status: statusMap[action],
        message: `Action '${action}' applied to venue issue #${issueId}`,
      };
    } else {
      const response = await axiosInstance.post<AdminActionResponse>(
        `/admin/venue-issues/${issueId}/action`,
        { action }
      );
      return response.data;
    }
  },

  suspendVenue: async (
    venueId: string,
    state: "Suspended" | "Active" = "Suspended"
  ): Promise<VenueSuspensionResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return {
        venue_id: venueId,
        state,
        cancelled_bookings: 0,
        released_seats: 0,
        message: `Venue ${state.toLowerCase()} successfully`,
      };
    } else {
      const response = await axiosInstance.patch<VenueSuspensionResponse>(
        `/admin/venues/${venueId}/suspension`,
        { state }
      );
      return response.data;
    }
  },

};
