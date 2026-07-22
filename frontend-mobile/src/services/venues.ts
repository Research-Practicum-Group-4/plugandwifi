import { apiGet } from './api';
import type { VenueListResponse, VenueItem } from '../types/venue';

type VenueFilters = {
  lat?: number;
  lon?: number;
  radius?: number;
  wifi?: boolean;
  plug_access?: number;
  max_price?: number;
  borough?: string;
  page?: number;
  limit?: number;
};

export async function fetchVenues(filters: VenueFilters = {}): Promise<VenueListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return apiGet<VenueListResponse>(`/api/venues${query ? `?${query}` : ''}`);
}

export async function fetchVenueById(venueId: string): Promise<VenueItem> {
  return apiGet<VenueItem>(`/api/venues/${venueId}`);
}
