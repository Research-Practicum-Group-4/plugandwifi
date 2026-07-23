export interface User {
  id?: number;
  user_id: number;
  full_name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface HourlyProfileDetail {
  score: number;
  label: string;
}

export interface HourlyProfile {
  [hour: string]: HourlyProfileDetail;
}

// Core venue shape returned by GET /api/venues (list endpoint)
export interface Venue {
  [key: string]: unknown;
  venue_id: string;
  name: string;
  osm_type?: string;
  cuisine_type: string;
  distance_km: number;
  has_wifi: boolean;
  wifi_free: boolean;
  opening_now: boolean;
  seats_avail: number;
  total_seats: number;
  hourly_price: number;
  rating: number;
  lat: number;
  lon: number;
  borough?: string;
  state?: string;
  plug_access?: number | null;
  availability_window?: string | null;
  opening_hours_summary?: string | boolean | null;
  busyness_score?: number | null;
  busyness_label?: string | null;
  suitability_score?: number | null;
  accessibility_friendly: boolean;
  calls_allowed: boolean;
  wbe_certified: boolean;
  mbe_certified: boolean;
  vbe_certified: boolean;
  bcorp_certified: boolean;
  lgbt_friendly: boolean;
}

// Full venue shape returned by GET /api/venues/{id} (detail endpoint)
export interface VenueDetail extends Venue {
  osm_type: string;
  cuisine_detail: string;
  phone: string | null;
  website: string | null;
  building_number: string | null;
  street: string | null;
  zipcode: string | null;
  borough: string;
  lat: number;
  lon: number;
  opening_hours: string;
  hotel_stars: string | null;
  hourly_profile: HourlyProfile;
  best_hours_for_work: number[];
  seat_capacity: number;
  amenity_tags: string[];
  rules_text: string | null;
}

export interface AvailabilitySlot {
  slot_id: number;
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface VenueAvailability {
  venue_id: string;
  available_slots: AvailabilitySlot[];
}

export interface BookingRequest {
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_reserved: number;
}

export interface BookingResponse {
  booking_id: number;
  status: string;
  message: string;
  payment_status?: string;
  order_id?: string;
}

export interface MockPaymentResponse {
  booking_id: number;
  order_id: string;
  status: string;
  payment_status: string;
  message: string;
}

export interface UserBookingItem {
  booking_id: number;
  venue_id: string;
  venue_name: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_reserved: number;
  status: string;
  order_id: string;
  payment_status: string;
  lat: number | null;
  lon: number | null;
}

export interface UserBookingsResponse {
  upcoming: UserBookingItem[];
  completed: UserBookingItem[];
  cancelled: UserBookingItem[];
}

export interface BookingCancellationResponse {
  booking_id: number;
  status: string;
  payment_status: string;
  released_seats: number;
  message: string;
}

export interface Provider {
  provider_id: number;
  company_name: string;
  contact_email: string;
  contact_phone: string;
  verified: boolean;
}

export interface ProviderVenue {
  venue_id: string;
  name: string;
  seats_avail: number;
  total_seats: number;
}

export interface VenueListResponse {
  items: Venue[];
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_more: boolean;
}

export interface KPIMetric {
  value: number;
  delta_percent: number | null;
}

export interface ProviderDashboardKPIsResponse {
  window_days: number;
  total_reservations: KPIMetric;
  monthly_revenue: KPIMetric;
  active_properties_count: KPIMetric;
  average_user_rating: KPIMetric;
}

export interface ProviderArrivalItem {
  booking_id: number;
  client_full_name: string;
  venue_id: string;
  venue_name: string | null;
  confirmation_status: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_reserved: number;
  space_label: string | null;
  fee_estimate: number;
}

export interface ProviderArrivalsResponse {
  items: ProviderArrivalItem[];
}

export interface VenueSuggestion {
  venue_id: string;
  name: string;
  lat: number;
  lon: number;
  borough: string;
  type: "venue";
}

export interface VenueSuggestionsResponse {
  items: VenueSuggestion[];
}

export interface ChatbotHistoryMessage {
  role: "user" | "assistant";
  message: string;
}

export interface ChatbotRecommendRequest {
  message: string;
  chat_history?: ChatbotHistoryMessage[];
}

export interface ChatbotRecommendResponse {
  response: string;
  model: string;
  venues?: Venue[];
  follow_up_question?: string | null;
}

export interface FavoriteResponse {
  user_id: number;
  venue_id: string;
  message: string;
}

// ── Admin types ───────────────────────────────────────────────────────────────

export type AdminActionType = "warn" | "suspend" | "ban";
export type AdminIssueStatus = "pending" | "warned" | "suspended" | "banned" | "resolved";

export interface AdminCustomerIssue {
  id: number;
  user_id: string;
  user_name: string;
  issue: string;
  description: string;
  severity: "low" | "medium" | "high";
  reported_at: string;
  status: AdminIssueStatus;
}

export interface AdminVenueIssue {
  id: number;
  venue_id: string;
  venue_name: string;
  issue: string;
  description: string;
  severity: "low" | "medium" | "high";
  reported_at: string;
  status: AdminIssueStatus;
}

export interface AdminActionResponse {
  id: number;
  action: AdminActionType;
  status: AdminIssueStatus;
  message: string;
}

export interface AdminStatsResponse {
  total_revenue: number;
  total_bookings: number;
  avg_booking_value: number;
  median_venue_revenue: number;
  total_venues: number;
  active_venues: number;
  pending_approval: number;
  suspended_venues: number;
  top_performer: string;
  total_users: number;
  active_users: number;
  new_this_month: number;
  churn_rate: number;
}

export interface AdminDashboardOverviewResponse {
  global_active_properties: number;
  total_completed_checkout_revenues: number;
  system_incident_counts: {
    cancelled_bookings: number;
    refund_pending_bookings: number;
    unavailable_slots: number;
  };
}

export interface VenueSuspensionResponse {
  venue_id: string;
  state: string;
  cancelled_bookings: number;
  released_seats: number;
  message: string;
}
