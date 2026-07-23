import type { VenueItem } from '../types/venue';

const imageMap: Record<string, string> = {
  cafe: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
  'hotel lobby': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
  'business lounge': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
  bar: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400',
  bakery: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
  co_working: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=400',
};

const defaultImage = 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400';

export function getVenueImage(venue: VenueItem): string {
  const type = (venue.cuisine_type ?? '').toLowerCase();
  for (const [key, url] of Object.entries(imageMap)) {
    if (type.includes(key)) return url;
  }
  return defaultImage;
}
