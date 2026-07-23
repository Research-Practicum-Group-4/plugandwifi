import { describe, it, expect } from "vitest";
import { busynessDisplay, enrichVenue, venueImage } from "../app/utils/venueEnrichment";
import type { Venue } from "../types/api";

const BASE_VENUE: Venue = {
  venue_id: "osm_12345",
  name: "Starbucks Ranelagh",
  osm_type: "cafe",
  cuisine_type: "Coffee/Tea",
  distance_km: 0.8,
  has_wifi: true,
  wifi_free: true,
  opening_now: true,
  noise_score: 0.44,
  noise_level: "moderate",
  seats_avail: 12,
  total_seats: 20,
  hourly_price: 3.5,
  rating: 4.6,
  lat: 53.309,
  lon: -6.255,
  accessibility_friendly: false,
  calls_allowed: false,
  wbe_certified: false,
  mbe_certified: false,
  vbe_certified: false,
  bcorp_certified: false,
  lgbt_friendly: true,
};

describe("enrichVenue enrichedPrice", () => {
  it("always falls within the $3-7 range", () => {
    const { enrichedPrice } = enrichVenue(BASE_VENUE);
    expect(enrichedPrice).toBeGreaterThanOrEqual(3);
    expect(enrichedPrice).toBeLessThanOrEqual(7);
  });

  it("is always a whole dollar (integer)", () => {
    const { enrichedPrice } = enrichVenue(BASE_VENUE);
    expect(Number.isInteger(enrichedPrice)).toBe(true);
  });

  it("is deterministic for the same venue_id", () => {
    const a = enrichVenue(BASE_VENUE).enrichedPrice;
    const b = enrichVenue(BASE_VENUE).enrichedPrice;
    expect(a).toBe(b);
  });

  it("produces different prices for different venue_ids", () => {
    const prices = new Set(
      Array.from({ length: 50 }, (_, i) => `id_${i}`).map((id) =>
        enrichVenue({ ...BASE_VENUE, venue_id: id }).enrichedPrice,
      ),
    );
    expect(prices.size).toBeGreaterThan(1);
  });

  it("$5 is the most common outcome over many distinct IDs", () => {
    const counts: Record<number, number> = { 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    for (let i = 0; i < 1000; i++) {
      const price = enrichVenue({ ...BASE_VENUE, venue_id: `id_${i}` }).enrichedPrice;
      counts[price]++;
    }
    expect(counts[5]).toBeGreaterThan(counts[3]);
    expect(counts[5]).toBeGreaterThan(counts[7]);
    expect(counts[4]).toBeGreaterThan(counts[3]);
    expect(counts[6]).toBeGreaterThan(counts[7]);
  });
});

const VALID_CERTS = new Set([
  "WBE-Certified",
  "MBE-Certified",
  "LGBT+ Friendly",
  "B-Corp Certified",
  "VBE-Certified",
]);

describe("enrichVenue certifications", () => {
  it("returns only recognised EDI flags", () => {
    const { certifications } = enrichVenue(BASE_VENUE);
    certifications.forEach((cert) => expect(VALID_CERTS.has(cert)).toBe(true));
  });

  it("is deterministic for the same venue_id", () => {
    const a = enrichVenue(BASE_VENUE).certifications;
    const b = enrichVenue(BASE_VENUE).certifications;
    expect(a).toEqual(b);
  });

  it("preserves original venue fields", () => {
    const enriched = enrichVenue(BASE_VENUE);
    expect(enriched.venue_id).toBe(BASE_VENUE.venue_id);
    expect(enriched.name).toBe(BASE_VENUE.name);
    expect(enriched.rating).toBe(BASE_VENUE.rating);
    expect(enriched.hourly_price).toBe(BASE_VENUE.hourly_price);
  });

  it("WBE appears within a reasonable range across many venues", () => {
    let wbeCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (enrichVenue({ ...BASE_VENUE, venue_id: `id_${i}` }).certifications.includes("WBE-Certified")) {
        wbeCount++;
      }
    }
    expect(wbeCount).toBeGreaterThan(100);
    expect(wbeCount).toBeLessThan(350);
  });

  it("B-Corp appears less often than LGBT+ Friendly", () => {
    let bcorp = 0;
    let lgbt = 0;
    for (let i = 0; i < 1000; i++) {
      const { certifications } = enrichVenue({ ...BASE_VENUE, venue_id: `id_${i}` });
      if (certifications.includes("B-Corp Certified")) bcorp++;
      if (certifications.includes("LGBT+ Friendly")) lgbt++;
    }
    expect(lgbt).toBeGreaterThan(bcorp);
  });
});

describe("busynessDisplay", () => {
  it("prefers backend busyness_label when present", () => {
    const busyness = busynessDisplay(BASE_VENUE.venue_id, 10, "busy");
    expect(busyness.label).toBe("It's a busy day");
  });

  it("falls back to score buckets when backend label is absent", () => {
    const busyness = busynessDisplay(BASE_VENUE.venue_id, 95, null);
    expect(busyness.label).toBe("It's a full house!");
  });
});

describe("venueImage", () => {
  it("uses osm_type to choose the image pool", () => {
    const bakeryImage = venueImage("osm_bakery", "bakery");
    const officeImage = venueImage("osm_bakery", "workspace");
    expect(bakeryImage).not.toBe(officeImage);
  });
});
