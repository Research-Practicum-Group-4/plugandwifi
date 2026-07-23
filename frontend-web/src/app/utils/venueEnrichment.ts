import { Venue } from "../../types/api";

export interface BusynessDisplay {
  label: string;
  color: string;
}

const BUSYNESS_LEVELS: BusynessDisplay[] = [
  { label: "You'll be the only one", color: "bg-emerald-100 text-emerald-700" },
  { label: "It's a tiny group today", color: "bg-teal-100 text-teal-700" },
  { label: "It's a normal day", color: "bg-blue-100 text-blue-700" },
  { label: "It's a busy day", color: "bg-orange-100 text-orange-700" },
  { label: "It's a full house!", color: "bg-red-100 text-red-700" },
];

function scoreToIndex(score: number): number {
  if (score <= 20) return 0;
  if (score <= 30) return 1;
  if (score <= 60) return 2;
  if (score <= 90) return 3;
  return 4;
}

export function busynessDisplay(venueId: string, busynessScore?: number | null): BusynessDisplay {
  if (busynessScore != null) {
    return BUSYNESS_LEVELS[scoreToIndex(busynessScore)];
  }
  return BUSYNESS_LEVELS[hashString(venueId) % BUSYNESS_LEVELS.length];
}

const PHOTO_POOLS: Record<string, string[]> = {
  coffee: [
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&fit=crop&auto=format",
  ],
  library: [
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1568667256549-094345857637?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1574340849735-52d5c2e13a95?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=600&fit=crop&auto=format",
  ],
  hotel: [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1519167758481-83f29da8c851?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1540304453527-62f979142a17?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600&fit=crop&auto=format",
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600&fit=crop&auto=format",
  ],
  cowork: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=600&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1600508774634-4e11d34730e2?w=600&fit=crop&auto=format",
  ],
};

const PHOTO_POOL_DEFAULT = PHOTO_POOLS.cowork;

function categoryPool(cuisineType: string): string[] {
  const t = (cuisineType || "").toLowerCase();
  if (t.includes("coffee") || t.includes("cafe") || t.includes("tea")) return PHOTO_POOLS.coffee;
  if (t.includes("library") || t.includes("study")) return PHOTO_POOLS.library;
  if (t.includes("hotel") || t.includes("lounge")) return PHOTO_POOLS.hotel;
  if (t.includes("restaurant") || t.includes("food") || t.includes("bar")) return PHOTO_POOLS.restaurant;
  if (t.includes("cowork") || t.includes("office") || t.includes("workspace")) return PHOTO_POOLS.cowork;
  return PHOTO_POOL_DEFAULT;
}

export function venueImage(venueId: string, cuisineType: string): string {
  const pool = categoryPool(cuisineType);
  return pool[hashString(venueId) % pool.length];
}

export function venueImages(venueId: string, cuisineType: string, width = 800): string[] {
  const pool = categoryPool(cuisineType);
  const h = hashString(venueId);
  const primary = h % pool.length;
  const secondary = (h + 3) % pool.length;
  const tertiary = (h + 6) % pool.length;
  const imgs = [pool[primary]];
  if (pool[secondary] !== pool[primary]) imgs.push(pool[secondary]);
  else imgs.push(pool[(primary + 1) % pool.length]);
  if (pool[tertiary] !== imgs[0] && pool[tertiary] !== imgs[1]) imgs.push(pool[tertiary]);
  else imgs.push(pool[(primary + 2) % pool.length]);
  return imgs.map((url) => url.replace("w=600", `w=${width}`));
}

export interface EnrichedVenue extends Venue {
  enrichedPrice: number;
  certifications: string[];
  isAccessible: boolean;
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(1664525, s) + 1013904223;
    s = s >>> 0;
    return s / 0x100000000;
  };
}

const PRICES = [3, 4, 5, 6, 7];
const PRICE_WEIGHTS = [1, 2, 3, 2, 1];
const PRICE_WEIGHT_TOTAL = 9;

function pickPrice(rand: () => number): number {
  const r = rand() * PRICE_WEIGHT_TOTAL;
  let cumulative = 0;
  for (let i = 0; i < PRICES.length; i++) {
    cumulative += PRICE_WEIGHTS[i];
    if (r < cumulative) return PRICES[i];
  }
  return 5;
}

export function enrichVenue(venue: Venue): EnrichedVenue {
  const rand = seededRandom(hashString(venue.venue_id));
  const enrichedPrice = pickPrice(rand);

  const certifications: string[] = [];
  if (venue.wbe_certified) certifications.push("WBE-Certified");
  if (venue.mbe_certified) certifications.push("MBE-Certified");
  if (venue.lgbt_friendly) certifications.push("LGBT+ Friendly");
  if (venue.bcorp_certified) certifications.push("B-Corp Certified");
  if (venue.vbe_certified) certifications.push("VBE-Certified");

  return {
    ...venue,
    enrichedPrice,
    certifications,
    isAccessible: Boolean(venue.accessibility_friendly),
  };
}
