export type Venue = {
  id: string;
  name: string;
  type: string;
  distance: string;
  availability: string;
  rating: number;
  reviews?: number;
  price: number;
  amenities?: string[];
  image?: string;
  lat?: number;
  lng?: number;
  suitabilityScore?: number;
  busynessLabel?: string | null;
  busynessScore?: number | null;
};
