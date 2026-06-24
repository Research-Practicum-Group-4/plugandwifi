import type { Venue } from '../types/venue';

export const mockVenues: Venue[] = [
  {
    id: '1',
    name: 'The Grand Hotel Lobby',
    type: 'Hotel Lobby',
    distance: '5 mins away',
    availability: '2 PM - 4 PM',
    rating: 4.8,
    reviews: 124,
    price: 5,
    amenities: ['WiFi', 'Power Outlets', 'Quiet Zone'],
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    lat: 40.7589,
    lng: -73.9851,
  },
  {
    id: '2',
    name: 'Cafe Moderna',
    type: 'Cafe',
    distance: '8 mins away',
    availability: '3 PM - 6 PM',
    rating: 4.6,
    reviews: 89,
    price: 3,
    amenities: ['WiFi', 'Coffee', 'Calls Allowed'],
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    lat: 40.7614,
    lng: -73.9776,
  },
  {
    id: '3',
    name: 'Downtown Business Lounge',
    type: 'Business Lounge',
    distance: '12 mins away',
    availability: 'Now - 5 PM',
    rating: 4.9,
    reviews: 203,
    price: 7,
    amenities: ['WiFi', 'Power Outlets', 'Meeting Tables'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
    lat: 40.7549,
    lng: -73.9840,
  },
];

export function getVenueById(id: string): Venue | undefined {
  return mockVenues.find(venue => venue.id === id);
}
