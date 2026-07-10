import type { Venue } from '../types/venue';

const RESTAURANT_IMAGES = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600',
  'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
  'https://images.unsplash.com/photo-1504718855392-0b0b1b8a3a1b?w=600',
  'https://images.unsplash.com/photo-1537047902294-62a40c13b2e6?w=600',
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600',
  'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=600',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
  'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600',
];

const CAFE_IMAGES = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600',
  'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600',
  'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=600',
  'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600',
  'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=600',
  'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=600',
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600',
  'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600',
  'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=600',
  'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600',
  'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600',
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
];

const BAKERY_IMAGES = [
  'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600',
  'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=600',
  'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600',
  'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=600',
  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
  'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=600',
  'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=600',
  'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
  'https://images.unsplash.com/photo-1517686468429-8e126f7ecb83?w=600',
];

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600',
  'https://images.unsplash.com/photo-1577412647305-991150c7d5b3?w=600',
  'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600',
  'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=600',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600',
  'https://images.unsplash.com/photo-1604328698692-f76ea9498aac?w=600',
  'https://images.unsplash.com/photo-1484807352052-23338990c6c6?w=600',
];

function hashId(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function getVenueImage(venue: Venue): string {
  const image = (venue as any).image as string | undefined;
  if (image) return image;

  const type = venue.type?.toLowerCase() || '';
  let pool: string[];

  if (type === 'restaurant' || type === 'restaurants') pool = RESTAURANT_IMAGES;
  else if (type === 'cafe' || type === 'cafes') pool = CAFE_IMAGES;
  else if (type === 'bakery' || type === 'bakeries' || type === 'bakeshop') pool = BAKERY_IMAGES;
  else pool = DEFAULT_IMAGES;

  return pool[hashId(venue.id) % pool.length];
}
