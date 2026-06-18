import axios from "axios";
import {
  LoginResponse,
  Venue,
  VenueDetail,
  VenueAvailability,
  BookingRequest,
  BookingResponse,
  UserBooking,
  VenueListResponse,
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
const mockVenues: VenueDetail[] = [
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
    rating: 4.6
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
    rating: 4.8
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
    rating: 4.8
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
    rating: 4.6
  },
  {
    venue_id: "osm_123495",
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
    rating: 4.9
  },
  {
    venue_id: "osm_12344",
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
    rating: 4.9
  },
  {
    venue_id: "osm_12343",
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
    rating: 4.9
  },
  {
    venue_id: "osm_12342",
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
    rating: 4.9
  },
  {
    venue_id: "osm_12341",
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
    rating: 4.9
  },
  {
    venue_id: "osm_12340",
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
    rating: 4.9
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
    rating: 4.9
  }
];

const mockBookings: UserBooking[] = [
  {
    booking_id: 101,
    venue_name: "Starbucks Ranelagh",
    date: "2026-06-03",
    start_time: "09:00",
    end_time: "10:00",
    status: "confirmed"
  }
];

const mockAvailability: Record<string, VenueAvailability> = {
  "osm_12345": {
    venue_id: "osm_12345",
    available_slots: [
      { slot_id: 1, start_time: "2026-06-05T09:00:00", end_time: "2026-06-05T10:00:00", available: true },
      { slot_id: 2, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: false },
      { slot_id: 3, start_time: "2026-06-05T11:00:00", end_time: "2026-06-05T12:00:00", available: true },
      { slot_id: 4, start_time: "2026-06-05T14:00:00", end_time: "2026-06-05T15:00:00", available: true }
    ]
  },
  "osm_12346": {
    venue_id: "osm_12346",
    available_slots: [
      { slot_id: 5, start_time: "2026-06-05T09:00:00", end_time: "2026-06-05T10:00:00", available: true },
      { slot_id: 6, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: true },
      { slot_id: 7, start_time: "2026-06-05T11:00:00", end_time: "2026-06-05T12:00:00", available: true }
    ]
  },
  "osm_12347": {
    venue_id: "osm_12347",
    available_slots: [
      { slot_id: 8, start_time: "2026-06-05T14:00:00", end_time: "2026-06-05T15:00:00", available: true },
      { slot_id: 9, start_time: "2026-06-05T15:00:00", end_time: "2026-06-05T16:00:00", available: true }
    ]
  },
  "osm_12348": {
    venue_id: "osm_12348",
    available_slots: [
      { slot_id: 10, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: true },
      { slot_id: 11, start_time: "2026-06-05T11:00:00", end_time: "2026-06-05T12:00:00", available: true }
    ]
  },
  "osm_12349": {
    venue_id: "osm_12349",
    available_slots: [
      { slot_id: 12, start_time: "2026-06-05T09:00:00", end_time: "2026-06-05T10:00:00", available: true },
      { slot_id: 13, start_time: "2026-06-05T10:00:00", end_time: "2026-06-05T11:00:00", available: true }
    ]
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
        return {
          access_token: "mock_jwt_token",
          user: {
            user_id: 1,
            full_name: "Sunmin Lee",
            email: credentials.email,
            role: "user"
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
          user_id: data.user.id,
          id: data.user.id,
          full_name: data.user.full_name,
          email: data.user.email,
          role: "user"
        }
      };
    }
  },

  register: async (user: { full_name: string; email: string; password: string }): Promise<{ message: string }> => {
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
      }

      const limit = filters?.limit ?? 20;
      const page = filters?.page ?? 1;
      const offset = (page - 1) * limit;
      const paginatedItems = filtered.slice(offset, offset + limit);
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
          rating: v.rating
        })),
        page,
        limit,
        has_more
      };
    } else {
      // Map filters to backend query parameters
      const params: any = {};
      if (filters) {
        if (filters.has_wifi !== undefined) params.wifi = filters.has_wifi;
        else if (filters.wifi_free !== undefined) params.wifi = filters.wifi_free;
        if (filters.noise_level) params.noise_level = filters.noise_level;
        if (filters.borough) params.borough = filters.borough;
        if (filters.max_price !== undefined) params.max_price = filters.max_price;
        if (filters.page !== undefined) params.page = filters.page;
        if (filters.limit !== undefined) params.limit = filters.limit;
      }
      const response = await axiosInstance.get<VenueListResponse>("/venues", { params });
      return response.data;
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
      const response = await axiosInstance.get<VenueDetail>(`/venues/${venueId}`);
      return response.data;
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
      
      const newBooking: UserBooking = {
        booking_id: newBookingId,
        venue_name: venue?.name || "Unknown Venue",
        date: booking.booking_date,
        start_time: booking.start_time.substring(0, 5),
        end_time: booking.end_time.substring(0, 5),
        status: "confirmed"
      };
      
      mockBookings.push(newBooking);

      // Prune seat availability
      if (venue && venue.seats_avail > 0) {
        venue.seats_avail -= booking.seats_reserved;
      }

      return {
        booking_id: newBookingId,
        status: "confirmed",
        message: "Booking created successfully"
      };
    } else {
      const response = await axiosInstance.post<BookingResponse>("/bookings", booking);
      return response.data;
    }
  },

  // 6. Get User Bookings
  getUserBookings: async (): Promise<UserBooking[]> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      return [...mockBookings];
    } else {
      const response = await axiosInstance.get<UserBooking[]>("/users/me/bookings");
      return response.data;
    }
  },

  // 7. Cancel Booking
  cancelBooking: async (bookingId: number): Promise<{ booking_id: number; status: string }> => {
    checkAuth();
    if (USE_MOCK) {
      await delay(300);
      const booking = mockBookings.find(b => b.booking_id === bookingId);
      if (booking) {
        booking.status = "cancelled";
        return { booking_id: bookingId, status: "cancelled" };
      }
      throw new Error("Booking not found");
    } else {
      const response = await axiosInstance.delete<{ booking_id: number; status: string }>(`/bookings/${bookingId}`);
      return response.data;
    }
  }
};
