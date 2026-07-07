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

export interface Venue {
  venue_id: string;
  name: string;
  cuisine_type: string;
  distance_km: number;
  has_wifi: boolean;
  wifi_free: boolean;
  opening_now: boolean;
  noise_score: number;
  noise_level: string;
  seats_avail: number;
  total_seats: number;
  hourly_price: number;
  rating: number;
  lat: number;
  lon: number;
}

export interface HourlyProfileDetail {
  score: number;
  label: string;
}

export interface HourlyProfile {
  [hour: string]: HourlyProfileDetail;
}

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
  user_id: number;
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
}

export interface UserBooking {
  booking_id: number;
  venue_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
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


