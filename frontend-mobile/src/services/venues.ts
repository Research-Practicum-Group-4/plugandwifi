import { apiGet } from './api';
import type { VenueListResponse, VenueItem } from '../types/venue';

type VenueFilters = {
  lat?: number;
  lon?: number;
  radius?: number;
  wifi?: boolean;
  plug_access?: number;
  venue_type?: string | string[];
  name?: string;
  accessibility_friendly?: boolean;
  calls_allowed?: boolean;
  wbe_certified?: boolean;
  mbe_certified?: boolean;
  vbe_certified?: boolean;
  bcorp_certified?: boolean;
  lgbt_friendly?: boolean;
  max_price?: number;
  borough?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  seats_required?: number;
  page?: number;
  limit?: number;
};

export async function fetchVenues(filters: VenueFilters = {}): Promise<VenueListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, String(item)));
      } else {
        params.append(key, String(value));
      }
    }
  });
  const query = params.toString();
  return apiGet<VenueListResponse>(`/api/venues${query ? `?${query}` : ''}`);
}

export async function fetchVenueById(venueId: string): Promise<VenueItem> {
  return apiGet<VenueItem>(`/api/venues/${venueId}`);
}
