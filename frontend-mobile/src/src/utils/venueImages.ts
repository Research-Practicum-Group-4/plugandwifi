import type { Venue } from '../types/venue';

const IMG_POOL = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600',
  'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
  'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600',
  'https://images.unsplash.com/photo-1504718855392-0b0b1b8a3a1b?w=600',
  'https://images.unsplash.com/photo-1537047902294-62a40c13b2e6?w=600',
];

export function getVenueImage(venue: Venue): string {
  const image = (venue as any).image as string | undefined;
  if (image) return image;

  // Better hash: use DJB2-like algorithm
  let hash = 5381;
  for (let i = 0; i < venue.id.length; i++) {
    hash = ((hash << 5) + hash + venue.id.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % IMG_POOL.length;
  return IMG_POOL[idx];
}
