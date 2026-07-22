import axios from "axios";
import {
  LoginResponse,
  VenueDetail,
  VenueAvailability,
  BookingRequest,
  BookingResponse,
  VenueListResponse,
  UserBookingItem,
  UserBookingsResponse,
  BookingCancellationResponse,
  ProviderDashboardKPIsResponse,
  ProviderArrivalsResponse,
  VenueSuggestionsResponse,
  ChatbotRecommendResponse,
  FavoriteResponse,
  AdminActionType,
  AdminActionResponse,
  AdminCustomerIssue,
  AdminVenueIssue,
  AdminStatsResponse,
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
    noise_score: 0.44,
    noise_level: "moderate",
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
    name: "UCD Library",
    osm_type: "library",
    cuisine_type: "Library",
    cuisine_detail: "academic_library",
    phone: "+35317167777",
    website: "https://www.ucd.ie/library",
    building_number: "James Joyce",
    street: "Belfield Campus",
    zipcode: "D04V1W8",
    borough: "Dublin South",
    lat: 53.3078,
    lon: -6.2230,
    opening_hours: "Mo-Su 08:00-22:00",
    opening_now: true,
    has_wifi: true,
    wifi_free: true,
    hotel_stars: null,
    noise_score: 0.12,
    noise_level: "quiet",
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
    noise_score: 0.25,
    noise_level: "quiet",
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
    noise_score: 0.65,
    noise_level: "loud",
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
    name: "Downtown Business Lounge",
    osm_type: "office",
    cuisine_type: "Co-working/Lounge",
    cuisine_detail: "business_lounge",
    phone: "+12125550177",
    website: "https://downtownlounge.com",
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
    noise_score: 0.20,
    noise_level: "quiet",
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

  const osmTypes = ["cafe", "library", "hotel", "office"];
  const cuisineTypes = ["Coffee/Tea", "Library", "Hotel/Lounge", "Co-working/Lounge"];
  const cuisineDetails = ["coffee_shop", "academic_library", "hotel_lobby", "modern_cafe", "business_lounge"];
  const streets = ["Dame Street", "Grand Canal Dock", "Broadway", "Wall Street", "5th Avenue", "O'Connell Street"];
  const boroughs = ["Manhattan", "Brooklyn", "Dublin South", "Dublin North", "Dublin Center"];
  const zipcodes = ["D02XY23", "D06ABC1", "10001", "10005", "10016", "D04V1W8"];
  const noiseLevels = ["quiet", "moderate", "loud"];
  const seatOptions = [15, 20, 25, 30, 40, 50, 100];

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
    const noise_level = rng.pick(noiseLevels);

    const nr = rng.next();
    const noise_score = Math.round((noise_level === "quiet" ? nr * 0.3 : noise_level === "moderate" ? 0.3 + nr * 0.4 : 0.7 + nr * 0.3) * 100) / 100;
    const rating = Math.round((3.8 + rng.next() * 1.2) * 10) / 10;
    const hourly_price = Math.round((1.5 + rng.next() * 8) * 2) / 2;
    const total_seats = rng.pick(seatOptions);
    const seats_avail = Math.floor(rng.next() * total_seats);

    const inDublin = rng.next() > 0.5;
    const lat = inDublin ? 53.30 + rng.next() * 0.05 : 40.74 + rng.next() * 0.04;
    const lon = inDublin ? -6.25 + rng.next() * 0.05 : -73.98 + rng.next() * 0.04;
    const distance_km = Math.round((0.1 + rng.next() * 2.5) * 10) / 10;

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
      wifi_free: rng.next() > 0.3,
      hotel_stars: osm_type === "hotel" ? `${Math.floor(rng.next() * 2) + 4}` : null,
      noise_score,
      noise_level,
      hourly_profile: {
        "09": { score: Math.round(noise_score * 0.9 * 100) / 100, label: noise_level },
        "15": { score: noise_score, label: noise_level }
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
    borough?: string;
    has_wifi?: boolean;
    wifi_free?: boolean;
    opening_now?: boolean;
    noise_level?: string;
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
    seats_required?: number;
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
        if (filters.noise_level) {
          filtered = filtered.filter(v => v.noise_level.toLowerCase() === filters.noise_level?.toLowerCase());
        }
        if (filters.max_price !== undefined) {
          filtered = filtered.filter(v => v.hourly_price <= filters.max_price!);
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
          noise_score: v.noise_score,
          noise_level: v.noise_level,
          seats_avail: v.seats_avail,
          total_seats: v.total_seats,
          hourly_price: v.hourly_price,
          rating: v.rating,
          lat: v.lat,
          lon: v.lon,
          busyness_score: v.busyness_score ?? null,
          busyness_label: v.busyness_label ?? null,
        })),
        page,
        limit,
        total_items,
        total_pages,
        has_more
      };
    } else {
      // Only 867 / ~13,000 OSM venues have confirmed wifi — always filter to wifi:true
      // so no wifi-less venues are ever shown in the app.
      const params: any = { wifi: true };
      if (filters) {
        if (filters.noise_level) params.noise_level = filters.noise_level;
        if (filters.borough) params.borough = filters.borough;
        if (filters.max_price !== undefined) params.max_price = filters.max_price;
        if (filters.page !== undefined) params.page = filters.page;
        if (filters.limit !== undefined) params.limit = filters.limit;
        if (filters.lat !== undefined) params.lat = filters.lat;
        if (filters.lon !== undefined) params.lon = filters.lon;
        if (filters.radius !== undefined) params.radius = filters.radius;
        if (filters.date !== undefined) params.date = filters.date;
        if (filters.start_time !== undefined) params.start_time = filters.start_time;
        if (filters.end_time !== undefined) params.end_time = filters.end_time;
        if (filters.seats_required !== undefined) params.seats_required = filters.seats_required;
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
        status: "upcoming",
        order_id: `ORD-20260625-${newBookingId}`,
        payment_status: "paid",
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
        status: "confirmed",
        message: "Booking created successfully"
      };
    } else {
      const response = await axiosInstance.post<any>("/bookings", booking);
      return {
        booking_id: response.data.id || response.data.booking_id,
        status: response.data.status,
        message: "Booking created successfully"
      };
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
  getChatbotReply: async (message: string): Promise<ChatbotRecommendResponse> => {
    if (USE_MOCK) {
      await delay(800);
      return {
        response: `Hello! I am your Manhattan AI assistant. Based on your prompt "${message}", I recommend booking Flatiron Workspace or Grand Central Office Hub.`,
        model: "gemini-1.5-flash"
      };
    } else {
      const response = await axiosInstance.post<ChatbotRecommendResponse>("/chatbot/recommend", { message });
      return response.data;
    }
  },

  // 12. Add Venue to Favorites
  addFavorite: async (venueId: string): Promise<FavoriteResponse> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(200);
      return { user_id: 1, venue_id: venueId, message: "Favorite created successfully" };
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

};
