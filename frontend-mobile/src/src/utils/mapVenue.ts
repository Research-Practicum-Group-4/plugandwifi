import type { VenueItem } from '../services/venues';
import type { Venue } from '../types/venue';

export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '—';
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)} km`;
}

export function formatHours(raw: string | boolean | null | undefined): string {
  if (typeof raw !== 'string' || !raw) return 'Varies';
  const semi = raw.indexOf(';');
  return semi > 0 ? raw.slice(0, semi) : raw;
}

export function mapVenue(v: VenueItem): Venue {
  const amenities: string[] = [];
  if (v.has_wifi) amenities.push('WiFi');
  if ((v.plug_access ?? 0) > 0) amenities.push('Power Outlets');
  if (v.noise_level === 'quiet') amenities.push('Quiet Zone');

  return {
    id: v.venue_id,
    name: v.name,
    type: v.cuisine_type || 'Workspace',
    distance: formatDistance(v.distance_km),
    availability: formatHours(v.opening_hours_summary),
    rating: v.rating ?? 0,
    price: v.hourly_price ?? v.hourly_fee ?? 5,
    amenities,
    lat: v.lat,
    lng: v.lon,
  };
}
