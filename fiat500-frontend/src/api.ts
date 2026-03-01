const API_BASE = import.meta.env.VITE_API_URL || 'https://fiat500-tracker-83829553594.europe-west2.run.app';
const API_KEY = import.meta.env.VITE_API_KEY || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Listing {
  id: string;
  platform: string;
  platform_listing_id: string;
  url: string;
  title: string;
  price: number;
  year: number;
  mileage: number;
  engine_size: string;
  fuel_type: string;
  transmission: string;
  colour: string | null;
  mot_expiry: string | null;
  seller_name: string | null;
  seller_type: 'dealer' | 'private';
  seller_rating: number | null;
  location_postcode: string | null;
  distance_miles: number | null;
  description: string | null;
  image_urls: string[];
  composite_score: number | null;
  insurance_estimate: number | null;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export interface ShortlistEntry {
  rank: number;
  id: string;
  title: string;
  price: number;
  mileage: number;
  year: number;
  engine_size: string;
  location_postcode: string | null;
  distance_miles: number | null;
  composite_score: number;
  insurance_estimate: number | null;
  url: string;
  platform: string;
  image_urls: string[];
}

export interface ScrapeStatus {
  status: string;
  last_run: {
    id: string;
    started_at: string;
    completed_at: string | null;
    listings_found: number;
    listings_new: number;
    listings_updated: number;
    price_drops: number;
    errors: string[];
  } | null;
}

export interface UserConfig {
  id: string;
  postcode: string;
  search_radius_miles: number;
  budget_min: number;
  budget_max: number;
  user_name: string;
  tracking_active: boolean;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  listing_id: string;
  price: number;
  recorded_at: string;
}

export interface ListingDetail extends Listing {
  price_history: PriceHistory[];
}

export const api = {
  getListings: () => apiFetch<Listing[]>('/api/listings'),
  getListing: (id: string) => apiFetch<ListingDetail>(`/api/listings/${id}`),
  getShortlist: () => apiFetch<ShortlistEntry[]>('/api/shortlist'),
  getScrapeStatus: () => apiFetch<ScrapeStatus>('/api/scrape/status'),
  triggerScrape: () => apiFetch<{ status: string }>('/api/scrape/trigger', { method: 'POST' }),
  getConfig: () => apiFetch<UserConfig>('/api/config'),
};
