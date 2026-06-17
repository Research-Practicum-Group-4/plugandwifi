export type VenueItem = {
  venue_id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  borough: string;
  cuisine_type: string | null;
  has_wifi: boolean | null;
  noise_level: string | null;
  noise_score: number | null;
  rating: number | null;
  plug_access: number | null;
  hourly_price: number | null;
  plugs_available: number | null;
  hourly_fee: number | null;
  availability_window: string | null;
  opening_hours_summary: string | null;
  distance_km: number | null;
};

export type VenueListResponse = {
  items: VenueItem[];
  page: number;
  limit: number;
  has_more: boolean;
};
