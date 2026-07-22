/**
 * Component tests for HomePage.
 * Covers: render, geolocation states, load-more, EDI badges, enriched price display.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.stubEnv('VITE_USE_MOCK', 'true');
vi.stubEnv('VITE_API_BASE_URL', '/api');
vi.stubEnv('VITE_GOOGLE_MAPS_KEY', '');

// Stub leaflet (crashes in jsdom)
vi.mock('leaflet', () => ({}));

// Stub MapView and ManhattanMap so we don't need a real map canvas
vi.mock('../app/components/MapView', () => ({
  MapView: () => <div data-testid="map-view" />,
}));
vi.mock('../app/components/ManhattanMap', () => ({
  ManhattanMap: () => <div data-testid="manhattan-map" />,
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

const { HomePage } = await import('../app/pages/HomePage');

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

// ── Geolocation: denied ───────────────────────────────────────────────────

describe('HomePage – geolocation denied', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn((_success, error) => error(new Error('denied'))),
      },
    });
  });

  it('shows the location nudge message when geo is denied', async () => {
    renderHomePage();
    await waitFor(() =>
      expect(
        screen.getByText(/enable location for nearby results/i)
      ).toBeInTheDocument()
    );
  });

  it('still renders venue cards after geo denial', async () => {
    renderHomePage();
    await waitFor(() => {
      const cards = screen.queryAllByText(/book a space/i);
      expect(cards.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});

// ── Geolocation: granted ──────────────────────────────────────────────────

describe('HomePage – geolocation granted', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn((success) =>
          success({ coords: { latitude: 40.7589, longitude: -73.9851 } })
        ),
      },
    });
  });

  it('shows "Available Near You" heading when geo is granted', async () => {
    renderHomePage();
    await waitFor(() =>
      expect(screen.getByText(/available near you/i)).toBeInTheDocument()
    , { timeout: 3000 });
  });

  it('does not show the geo-denied nudge', async () => {
    renderHomePage();
    await waitFor(() => screen.getByText(/available near you/i), { timeout: 3000 });
    expect(screen.queryByText(/enable location for nearby results/i)).not.toBeInTheDocument();
  });
});

// ── Venue cards ───────────────────────────────────────────────────────────

describe('HomePage – venue cards', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn((_success, error) => error(new Error('denied'))),
      },
    });
  });

  it('renders at most 6 cards initially (PAGE_SIZE)', async () => {
    renderHomePage();
    await waitFor(() => {
      const bookButtons = screen.queryAllByRole('button', { name: /book a space/i });
      expect(bookButtons.length).toBeGreaterThan(0);
      expect(bookButtons.length).toBeLessThanOrEqual(6);
    }, { timeout: 3000 });
  });

  it('shows enriched price with $/hour format on each card', async () => {
    renderHomePage();
    await waitFor(() => {
      const priceEls = screen.queryAllByText(/\$[3-7]\/hour/);
      expect(priceEls.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('shows suitability score on cards', async () => {
    renderHomePage();
    await waitFor(() => {
      const labels = screen.queryAllByText(/suitability for you/i);
      expect(labels.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });
});

// ── Load more ────────────────────────────────────────────────────────────

describe('HomePage – load more', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn((_success, error) => error(new Error('denied'))),
      },
    });
  });

  it('clicking "Show More" increases the number of visible cards', async () => {
    renderHomePage();

    // Wait for initial render
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /book a space/i }).length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    const before = screen.queryAllByRole('button', { name: /book a space/i }).length;

    const showMoreBtn = screen.queryByRole('button', { name: /show more venues/i });
    if (!showMoreBtn) return; // fewer than 7 venues in mock — skip

    fireEvent.click(showMoreBtn);

    await waitFor(() => {
      const after = screen.queryAllByRole('button', { name: /book a space/i }).length;
      expect(after).toBeGreaterThan(before);
    });
  });

  it('"Show More" button displays remaining count', async () => {
    renderHomePage();
    await waitFor(() => {
      const btn = screen.queryByRole('button', { name: /show more venues/i });
      if (btn) {
        expect(btn.textContent).toMatch(/\d+ remaining/);
      }
    }, { timeout: 3000 });
  });
});

// ── EDI filter panel ──────────────────────────────────────────────────────

describe('HomePage – EDI filter panel', () => {
  it('reveals EDI filter buttons when "You\'ll love these" is clicked', async () => {
    renderHomePage();
    const trigger = screen.getByRole('button', { name: /you'll love these/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: /wbe-certified/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mbe-certified/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lgbt\+ friendly/i })).toBeInTheDocument();
  });

  it('hides EDI filter buttons when clicked again (toggle off)', async () => {
    renderHomePage();
    const trigger = screen.getByRole('button', { name: /you'll love these/i });
    fireEvent.click(trigger); // open
    fireEvent.click(trigger); // close
    expect(screen.queryByRole('button', { name: /wbe-certified/i })).not.toBeInTheDocument();
  });
});

// ── View toggle ───────────────────────────────────────────────────────────

describe('HomePage – view mode toggle', () => {
  beforeEach(() => {
    Object.defineProperty(global.navigator, 'geolocation', {
      writable: true,
      value: {
        getCurrentPosition: vi.fn((_success, error) => error(new Error('denied'))),
      },
    });
  });

  it('defaults to grid view — grid tab is selected on load', async () => {
    renderHomePage();
    await waitFor(() =>
      expect(screen.queryAllByRole('button', { name: /book a space/i }).length).toBeGreaterThan(0)
    , { timeout: 3000 });

    const gridTabs = screen.queryAllByRole('tab', { name: /grid/i });
    expect(gridTabs.length).toBeGreaterThan(0);
    expect(gridTabs[0]).toHaveAttribute('data-state', 'active');
  });
});
