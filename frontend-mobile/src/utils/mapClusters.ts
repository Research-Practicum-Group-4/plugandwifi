import type { Region } from 'react-native-maps';
import type { Venue } from '../types/venue';

export type VenueMapCluster = {
  id: string;
  latitude: number;
  longitude: number;
  venues: Venue[];
};

const GRID_SIZE = 9;

/** Groups venues in a viewport-relative grid that expands as the user zooms in. */
export function clusterVenues(venues: Venue[], region: Region, gridSize = GRID_SIZE): VenueMapCluster[] {
  const latitudeStep = Math.max(region.latitudeDelta / gridSize, 0.00001);
  const longitudeStep = Math.max(region.longitudeDelta / gridSize, 0.00001);
  const buckets = new Map<string, Venue[]>();

  for (const venue of venues) {
    if (!Number.isFinite(venue.lat) || !Number.isFinite(venue.lng)) continue;
    const latitudeBucket = Math.floor((venue.lat! - region.latitude) / latitudeStep);
    const longitudeBucket = Math.floor((venue.lng! - region.longitude) / longitudeStep);
    const id = `${latitudeBucket}:${longitudeBucket}`;
    const bucket = buckets.get(id) ?? [];
    bucket.push(venue);
    buckets.set(id, bucket);
  }

  return [...buckets.entries()].map(([id, groupedVenues]) => ({
    id,
    latitude: groupedVenues.reduce((sum, venue) => sum + venue.lat!, 0) / groupedVenues.length,
    longitude: groupedVenues.reduce((sum, venue) => sum + venue.lng!, 0) / groupedVenues.length,
    venues: groupedVenues,
  }));
}
