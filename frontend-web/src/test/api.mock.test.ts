/**
 * Integration tests for api.ts running in MOCK mode (VITE_USE_MOCK=true).
 * These tests call the real api object with the mock data store active —
 * no HTTP traffic, no external services needed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock import.meta.env before importing api ────────────────────────────
vi.stubEnv('VITE_USE_MOCK', 'true');
vi.stubEnv('VITE_API_BASE_URL', '/api');
vi.stubEnv('VITE_GOOGLE_MAPS_KEY', '');

// Mock localStorage used by checkAuth / interceptors
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Leaflet imports crash in jsdom; stub them out
vi.mock('leaflet', () => ({}));

const { api } = await import('../services/api');

// ── getVenues ─────────────────────────────────────────────────────────────

describe('api.getVenues (mock)', () => {
  it('returns items, pagination metadata, and has_more flag', async () => {
    const result = await api.getVenues({ page: 1, limit: 5 });
    expect(result.items.length).toBeLessThanOrEqual(5);
    expect(result).toHaveProperty('total_items');
    expect(result).toHaveProperty('has_more');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(5);
  });

  it('each item has required Venue fields', async () => {
    const result = await api.getVenues({ page: 1, limit: 3 });
    for (const v of result.items) {
      expect(v).toHaveProperty('venue_id');
      expect(v).toHaveProperty('name');
      expect(v).toHaveProperty('rating');
      expect(v).toHaveProperty('lat');
      expect(v).toHaveProperty('lon');
    }
  });

  it('filters by has_wifi=true', async () => {
    const result = await api.getVenues({ has_wifi: true, limit: 50 });
    result.items.forEach((v) => expect(v.has_wifi).toBe(true));
  });

  it('pages correctly — page 2 items differ from page 1', async () => {
    const p1 = await api.getVenues({ page: 1, limit: 5 });
    const p2 = await api.getVenues({ page: 2, limit: 5 });
    const p1Ids = p1.items.map((v) => v.venue_id);
    const p2Ids = p2.items.map((v) => v.venue_id);
    // No venue should appear on both pages
    expect(p1Ids.some((id) => p2Ids.includes(id))).toBe(false);
  });

  it('returns empty items for an out-of-range page', async () => {
    const result = await api.getVenues({ page: 9999, limit: 5 });
    expect(result.items).toHaveLength(0);
    expect(result.has_more).toBe(false);
  });

  it('total_items and total_pages are consistent', async () => {
    const result = await api.getVenues({ page: 1, limit: 10 });
    expect(result.total_pages).toBe(Math.ceil(result.total_items / 10));
  });

  it('radius filter: returns only venues within the given distance', async () => {
    // Centre on Manhattan; 1 km radius should return only close-by fixtures
    const result = await api.getVenues({ lat: 40.7589, lon: -73.9851, radius: 1, limit: 50 });
    result.items.forEach((v) => expect(v.distance_km).toBeLessThanOrEqual(1));
  });
});

// ── getVenueDetail ────────────────────────────────────────────────────────

describe('api.getVenueDetail (mock)', () => {
  it('returns the correct venue for a known venue_id', async () => {
    const venue = await api.getVenueDetail('osm_12345');
    expect(venue.venue_id).toBe('osm_12345');
    expect(venue.name).toBe('Starbucks Ranelagh');
  });

  it('throws for an unknown venue_id', async () => {
    await expect(api.getVenueDetail('does_not_exist')).rejects.toThrow('Venue not found');
  });
});

// ── login ─────────────────────────────────────────────────────────────────

describe('api.login (mock)', () => {
  it('returns an access_token and user role=user for demo user account', async () => {
    const result = await api.login({ email: 'user2@example.com', password: '00000000' });
    expect(result.access_token).toBeTruthy();
    expect(result.user.email).toBe('user2@example.com');
    expect(result.user.role).toBe('user');
  });

  it('returns role=provider for demo provider account', async () => {
    const result = await api.login({ email: 'user3@example.com', password: '00000000' });
    expect(result.user.role).toBe('provider');
  });

  it('throws on wrong password', async () => {
    await expect(api.login({ email: 'user2@example.com', password: 'wrongpass' })).rejects.toThrow();
  });

  it('throws on unknown email', async () => {
    await expect(api.login({ email: 'nobody@example.com', password: '00000000' })).rejects.toThrow();
  });

  it('throws on empty credentials', async () => {
    await expect(api.login({ email: '', password: '' })).rejects.toThrow();
  });
});

// ── createBooking ─────────────────────────────────────────────────────────

describe('api.createBooking (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock_token');
  });

  it('creates a pending-payment booking_id', async () => {
    const result = await api.createBooking({
      venue_id: 'osm_12346',
      booking_date: '2026-08-01',
      start_time: '10:00',
      end_time: '12:00',
      seats_reserved: 1,
    });
    expect(result.booking_id).toBeGreaterThan(0);
    expect(result.status).toBe('pending_payment');
    expect(result.payment_status).toBe('pending');
  });

  it('confirms the booking after mock payment success', async () => {
    const booking = await api.createBooking({
      venue_id: 'osm_12346',
      booking_date: '2026-08-01',
      start_time: '10:00',
      end_time: '12:00',
      seats_reserved: 1,
    });

    const payment = await api.confirmMockPayment({
      booking_id: booking.booking_id,
      card_number: '4242 4242 4242 4242',
    });

    expect(payment.status).toBe('confirmed');
    expect(payment.payment_status).toBe('paid');
  });
});

// ── getUserBookings ───────────────────────────────────────────────────────

describe('api.getUserBookings (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock_token');
  });

  it('returns upcoming, completed, and cancelled buckets', async () => {
    const result = await api.getUserBookings();
    expect(Array.isArray(result.upcoming)).toBe(true);
    expect(Array.isArray(result.completed)).toBe(true);
    expect(Array.isArray(result.cancelled)).toBe(true);
  });
});

// ── getSuggestions ────────────────────────────────────────────────────────

describe('api.getSuggestions (mock)', () => {
  it('returns venues whose names include the query string', async () => {
    const result = await api.getSuggestions('Library');
    result.items.forEach((v) =>
      expect(v.name.toLowerCase()).toContain('library')
    );
  });

  it('respects the limit parameter', async () => {
    const result = await api.getSuggestions('a', 3);
    expect(result.items.length).toBeLessThanOrEqual(3);
  });
});

// ── Admin API ─────────────────────────────────────────────────────────────

describe('provider venue approval flow (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock-provider-token');
    localStorageMock.setItem(
      'user_profile',
      JSON.stringify({
        user_id: 3,
        full_name: 'Demo Provider',
        email: 'user3@example.com',
        role: 'provider',
      })
    );
  });

  it('keeps a submitted venue hidden until admin approval', async () => {
    const geocode = await api.geocodeNycAddress({
      address: '350 5th Avenue',
      borough: 'Manhattan',
      zipcode: 'NY 10001',
    });

    const created = await api.createVenue({
      name: 'Mock Approval Flow Venue',
      osm_type: 'cafe',
      street: '350 5th Avenue',
      zipcode: 'NY 10001',
      lat: geocode.lat,
      lon: geocode.lon,
      borough: 'Manhattan',
      opening_hours: 'Mon, Wed, Fri 09:00-17:00',
      seat_capacity: 8,
      amenity_tags: ['wifi', 'power outlets'],
      rules_text: 'Keep calls brief.',
      has_wifi: true,
      plug_access: 8,
      hourly_price: 4.5,
      accessibility_friendly: true,
      wbe_certified: true,
      mbe_certified: false,
      lgbt_friendly: true,
      availability_days: [0, 2, 4],
      availability_start_time: '09:00:00',
      availability_end_time: '17:00:00',
    });

    expect(created.state).toBe('Pending Approval');
    expect((await api.getProviderVenues()).items).toContainEqual(created);
    expect((await api.getPendingVenues()).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ venue_id: created.venue_id }),
      ])
    );
    expect((await api.getVenues({ name: created.name })).items).toHaveLength(0);

    await api.reviewVenue(created.venue_id, 'approve');

    expect((await api.getPendingVenues()).items).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ venue_id: created.venue_id }),
      ])
    );
    expect((await api.getVenues({ name: created.name })).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          venue_id: created.venue_id,
        }),
      ])
    );
  });
});

describe('api.getAdminStats (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock-admin-token');
  });

  it('returns all required financial and platform fields', async () => {
    const result = await api.getAdminStats();
    expect(result).toHaveProperty('total_revenue');
    expect(result).toHaveProperty('total_bookings');
    expect(result).toHaveProperty('avg_booking_value');
    expect(result).toHaveProperty('median_venue_revenue');
    expect(result).toHaveProperty('total_venues');
    expect(result).toHaveProperty('active_venues');
    expect(result).toHaveProperty('pending_approval');
    expect(result).toHaveProperty('suspended_venues');
    expect(result).toHaveProperty('top_performer');
    expect(result).toHaveProperty('total_users');
    expect(result).toHaveProperty('active_users');
    expect(result).toHaveProperty('new_this_month');
    expect(result).toHaveProperty('churn_rate');
  });

  it('active_venues is less than total_venues', async () => {
    const result = await api.getAdminStats();
    expect(result.active_venues).toBeLessThanOrEqual(result.total_venues);
  });

  it('throws when unauthenticated', async () => {
    localStorageMock.removeItem('access_token');
    await expect(api.getAdminStats()).rejects.toThrow('Authentication required');
  });
});

describe('api.getAdminCustomerIssues (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock-admin-token');
  });

  it('returns an array of customer issues', async () => {
    const result = await api.getAdminCustomerIssues();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('each issue has required fields', async () => {
    const result = await api.getAdminCustomerIssues();
    for (const issue of result) {
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('user_id');
      expect(issue).toHaveProperty('user_name');
      expect(issue).toHaveProperty('issue');
      expect(issue).toHaveProperty('description');
      expect(['low', 'medium', 'high']).toContain(issue.severity);
      expect(issue).toHaveProperty('reported_at');
      expect(issue).toHaveProperty('status');
    }
  });

  it('throws when unauthenticated', async () => {
    localStorageMock.removeItem('access_token');
    await expect(api.getAdminCustomerIssues()).rejects.toThrow('Authentication required');
  });
});

describe('api.getAdminVenueIssues (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock-admin-token');
  });

  it('returns an array of venue issues', async () => {
    const result = await api.getAdminVenueIssues();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('each issue has required fields', async () => {
    const result = await api.getAdminVenueIssues();
    for (const issue of result) {
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('venue_id');
      expect(issue).toHaveProperty('venue_name');
      expect(issue).toHaveProperty('issue');
      expect(issue).toHaveProperty('description');
      expect(['low', 'medium', 'high']).toContain(issue.severity);
      expect(issue).toHaveProperty('reported_at');
      expect(issue).toHaveProperty('status');
    }
  });
});

describe('api.adminActionCustomer (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock-admin-token');
  });

  it('warn action returns status=warned', async () => {
    const result = await api.adminActionCustomer(1, 'warn');
    expect(result.action).toBe('warn');
    expect(result.status).toBe('warned');
    expect(result.id).toBe(1);
  });

  it('suspend action returns status=suspended', async () => {
    const result = await api.adminActionCustomer(2, 'suspend');
    expect(result.action).toBe('suspend');
    expect(result.status).toBe('suspended');
  });

  it('ban action returns status=banned', async () => {
    const result = await api.adminActionCustomer(3, 'ban');
    expect(result.action).toBe('ban');
    expect(result.status).toBe('banned');
  });

  it('throws when unauthenticated', async () => {
    localStorageMock.removeItem('access_token');
    await expect(api.adminActionCustomer(1, 'warn')).rejects.toThrow('Authentication required');
  });
});

describe('api.adminActionVenue (mock)', () => {
  beforeEach(() => {
    localStorageMock.setItem('access_token', 'mock-admin-token');
  });

  it('warn action returns status=warned', async () => {
    const result = await api.adminActionVenue(1, 'warn');
    expect(result.action).toBe('warn');
    expect(result.status).toBe('warned');
  });

  it('suspend action returns status=suspended', async () => {
    const result = await api.adminActionVenue(1, 'suspend');
    expect(result.status).toBe('suspended');
  });

  it('ban action returns status=banned', async () => {
    const result = await api.adminActionVenue(1, 'ban');
    expect(result.status).toBe('banned');
  });
});
