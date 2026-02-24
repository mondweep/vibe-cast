export interface UserConfig {
  id: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  search_radius_miles: number;
  budget_min: number;
  budget_max: number;
  outbound_email: string;
  user_name: string;
  adults: DriverProfile[];
  learner_age: number | null;
  openclaw_webhook_url: string | null;
  tracking_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile {
  age: number;
  ncb_years: number;
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
  location_lat: number | null;
  location_lng: number | null;
  distance_miles: number | null;
  description: string | null;
  image_urls: string[];
  alternative_urls: string[];
  composite_score: number | null;
  insurance_estimate: number | null;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  listing_id: string;
  price: number;
  recorded_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  seller_email: string | null;
  status: 'awaiting_approval' | 'sent' | 'replied' | 'closed';
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  template_used: string | null;
  approved_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
}

export interface InsuranceQuote {
  id: string;
  listing_id: string;
  is_actual_quote: boolean;
  provider: string | null;
  annual_premium: number;
  cover_type: string;
  base_premium: number | null;
  young_driver_loading: number | null;
  ncb_discount: number | null;
  postcode_factor: number | null;
  age_factor: number | null;
  created_at: string;
}

export interface ShortlistSnapshot {
  id: string;
  snapshot_date: string;
  listings: ShortlistEntry[];
  created_at: string;
}

export interface ShortlistEntry {
  rank: number;
  listing_id: string;
  title: string;
  price: number;
  mileage: number;
  year: number;
  composite_score: number;
  insurance_estimate: number | null;
}

export interface ScrapedListing {
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
  description: string | null;
  image_urls: string[];
}

export interface ScrapeRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  listings_found: number;
  listings_new: number;
  listings_updated: number;
  price_drops: number;
  errors: string[];
  created_at: string;
}

export interface WebhookEvent {
  event: 'new_shortlist_entry' | 'price_drop' | 'listing_removed' | 'seller_reply' | 'daily_digest';
  timestamp: string;
  data: Record<string, unknown>;
}
