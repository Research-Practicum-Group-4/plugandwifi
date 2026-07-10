import { apiGet } from './api';

// Backend-aligned response type
export interface VenueItem {
  venue_id: string;
  name: string;
  lat: number;
  lon: number;
  borough: string;
  cuisine_type: string | null;
  has_wifi: boolean | null;
  noise_level: string | null;
  noise_score: number | null;
  rating: number | null;
  plug_access: number | null;
  hourly_price: number | null;
  hourly_fee: number | null;
  availability_window: string | null;
  opening_hours_summary: string | boolean | null;
  distance_km: number | null;
  plugs_available?: number | null;
}

export interface VenueDetail extends VenueItem {
  osm_type?: string | null;
  cuisine_detail?: string | null;
  phone?: string | null;
  website?: string | null;
  building_number?: string | null;
  street?: string | null;
  zipcode?: string | null;
  opening_hours?: string | null;
  best_hours_for_work?: string | number[] | null;
  hourly_profile?: string | null;
  partner?: number | null;
  inferred_wifi?: boolean | null;
  wifi_user_reported?: boolean | null;
  nearest_subway?: string | null;
  nearest_subway_m?: number | null;
  nearest_bus?: string | null;
  nearest_bus_m?: number | null;
  plug_user_reported?: boolean | null;
  rating_user_reported?: number | null;
  actual_hourly_price?: number | null;
}

export interface VenueListResponse {
  items: VenueItem[];
  page: number;
  limit: number;
  has_more: boolean;
}

export interface VenueFilterParams {
  lat?: number;
  lon?: number;
  radius?: number;
  wifi?: boolean;
  plug_access?: number;
  noise_level?: string;
  max_price?: number;
  borough?: string;
  duration_hours?: number;
  seats_required?: number;
  page?: number;
  limit?: number;
}

export async function fetchVenues(params: VenueFilterParams = {}): Promise<VenueListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const query = qs.toString();
  return apiGet<VenueListResponse>(`/api/venues${query ? `?${query}` : ''}`);
}

export interface VenueAvailabilityResponse {
  venue_id: string;
  available_slots: Array<{
    slot_id: number;
    date: string;
    start_time: string;
    end_time: string;
    available: boolean;
    available_seats: number;
  }>;
}

export async function fetchVenueById(venueId: string): Promise<VenueDetail> {
  return apiGet<VenueDetail>(`/api/venues/${venueId}`);
}

export async function fetchVenueAvailability(venueId: string): Promise<VenueAvailabilityResponse> {
  return apiGet<VenueAvailabilityResponse>(`/api/venues/${venueId}/availability`);
}
