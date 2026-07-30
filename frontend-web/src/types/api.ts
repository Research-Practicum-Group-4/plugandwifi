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
  hourly_price: number | null;
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

export interface VenueCreateRequest {
  name: string;
  osm_type: string;
  street: string;
  zipcode: string;
  lat: number;
  lon: number;
  borough: string;
  opening_hours: string;
  seat_capacity: number;
  amenity_tags: string[];
  rules_text: string;
  has_wifi: boolean;
  plug_access: number;
  hourly_price: number;
  accessibility_friendly: boolean;
  wbe_certified: boolean;
  mbe_certified: boolean;
  lgbt_friendly: boolean;
  availability_date?: string;
  availability_days?: number[];
  availability_start_time: string;
  availability_end_time: string;
}

export interface GeocodeResponse {
  lat: number;
  lon: number;
  display_name: string | null;
}

export interface VenueCreateResponse {
  venue_id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  borough: string;
  opening_hours: string | null;
  seat_capacity: number;
  amenity_tags: string[];
  rules_text: string | null;
  has_wifi: boolean | null;
  plug_access: number | null;
  hourly_price: number | null;
}

export interface ProviderVenueListResponse {
  items: VenueCreateResponse[];
}

export interface AdminPendingVenue extends VenueCreateResponse {
  provider_name: string;
  provider_email: string;
  osm_type: string | null;
  street: string | null;
  zipcode: string | null;
  availability_date: string | null;
  availability_start_time: string | null;
  availability_end_time: string | null;
}

export interface AdminPendingVenueListResponse {
  items: AdminPendingVenue[];
}

export interface VenueReviewResponse {
  venue_id: string;
  state: "Active" | "Rejected";
  message: string;
}

export interface AvailabilitySlot {
  slot_id: number;
  start_time: string;
  end_time: string;
  available: boolean;
  available_seats?: number;
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
  review_submitted?: boolean;
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

export interface ReviewCreateRequest {
  booking_id: number;
  wifi_score: number;
  plug_score: number;
  quietness_score: number;
  comment?: string | null;
}

export interface ReviewResponse {
  id: number;
  booking_id: number;
  user_id: number;
  venue_id: string;
  wifi_score: number | null;
  plug_score: number | null;
  quietness_score: number | null;
  comment: string | null;
  verified: boolean;
  venue_rating: number | null;
}

export interface VenueReviewItem {
  id: number;
  booking_id: number;
  user_id: number;
  reviewer_name: string | null;
  venue_id: string;
  rating: number | null;
  wifi_score: number | null;
  plug_score: number | null;
  quietness_score: number | null;
  comment: string | null;
  verified: boolean;
  created_at: string;
}

export interface VenueReviewsResponse {
  items: VenueReviewItem[];
  total_items: number;
  average_rating: number | null;
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

export interface ProviderBookingCompletionResponse {
  booking_id: number;
  status: string;
  message: string;
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

export type ChatbotIntent =
  | "new_search"
  | "refine_search"
  | "compare_previous"
  | "venue_detail"
  | "general_chat"
  | "reset";

export interface ChatbotSearchParameters {
  venue_name?: string | null;
  candidate_venue_names?: string[];
  location?: string | null;
  radius_km?: number | null;
  venue_type?: string | null;
  date?: string | null;
  start_time?: string | null;
  wifi?: boolean | null;
  plug_access?: number | null;
  accessibility_friendly?: boolean | null;
  calls_allowed?: boolean | null;
  wbe_certified?: boolean | null;
  mbe_certified?: boolean | null;
  vbe_certified?: boolean | null;
  bcorp_certified?: boolean | null;
  lgbt_friendly?: boolean | null;
  busyness?: "low" | "medium" | "high" | null;
  time?: string | null;
  sort_by_distance?: boolean;
  no_preference?: boolean;
}

export interface ChatbotConversationContext {
  active_search_parameters: ChatbotSearchParameters | null;
  last_recommended_venue_ids: string[];
  clarification_asked: boolean;
  last_intent: ChatbotIntent | null;
}

export interface ChatbotRecommendRequest {
  message: string;
  chat_history?: ChatbotHistoryMessage[];
  conversation_context?: ChatbotConversationContext | null;
}

export interface ChatbotRecommendResponse {
  response: string;
  model: string;
  search_parameters?: ChatbotSearchParameters | null;
  venues?: Venue[];
  follow_up_question?: string | null;
  conversation_context: ChatbotConversationContext;
}

export interface FavoriteResponse {
  user_id: number;
  venue_id: string;
  message: string;
}

export interface FavoriteListResponse {
  venue_ids: string[];
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
