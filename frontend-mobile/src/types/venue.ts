export type VenueItem = {
  venue_id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  borough: string;
  cuisine_type: string | null;
  has_wifi: boolean | null;
  rating: number | null;
  plug_access: number | null;
  hourly_price: number | null;
  availability_window: string | null;
  opening_hours_summary: string | null;
  distance_km: number | null;
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
};

export type VenueListResponse = {
  items: VenueItem[];
  page: number;
  limit: number;
  has_more: boolean;
};
