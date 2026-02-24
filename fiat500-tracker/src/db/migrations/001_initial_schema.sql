-- Fiat 500 Tracker: Initial Schema
-- Run this against your Supabase database

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- User Configuration (single-row table)
-- =============================================
CREATE TABLE IF NOT EXISTS user_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  postcode TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  search_radius_miles INTEGER NOT NULL DEFAULT 50,
  budget_min INTEGER NOT NULL DEFAULT 200000,   -- in pence
  budget_max INTEGER NOT NULL DEFAULT 600000,   -- in pence
  outbound_email TEXT,
  user_name TEXT NOT NULL DEFAULT 'User',
  adults JSONB NOT NULL DEFAULT '[]'::jsonb,     -- array of { age, ncb_years }
  learner_age INTEGER,
  openclaw_webhook_url TEXT,
  tracking_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Listings
-- =============================================
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  platform_listing_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,                        -- in pence
  year INTEGER NOT NULL,
  mileage INTEGER NOT NULL,
  engine_size TEXT,
  fuel_type TEXT NOT NULL DEFAULT 'petrol',
  transmission TEXT NOT NULL DEFAULT 'manual',
  colour TEXT,
  mot_expiry DATE,
  seller_name TEXT,
  seller_type TEXT NOT NULL DEFAULT 'private',   -- 'dealer' or 'private'
  seller_rating DOUBLE PRECISION,
  location_postcode TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,
  description TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  alternative_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  composite_score DOUBLE PRECISION,
  insurance_estimate INTEGER,                     -- in pence
  is_active BOOLEAN NOT NULL DEFAULT true,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_platform_id
  ON listings (platform, platform_listing_id);

CREATE INDEX IF NOT EXISTS idx_listings_active_score
  ON listings (is_active, composite_score DESC);

-- =============================================
-- Price History
-- =============================================
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  price INTEGER NOT NULL,                         -- in pence
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing
  ON price_history (listing_id);

-- =============================================
-- Seller Conversations
-- =============================================
CREATE TABLE IF NOT EXISTS seller_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  seller_email TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_approval',  -- awaiting_approval, sent, replied, closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_listing
  ON seller_conversations (listing_id);

-- =============================================
-- Conversation Messages
-- =============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES seller_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,                        -- 'outbound' or 'inbound'
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  template_used TEXT,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Insurance Quotes
-- =============================================
CREATE TABLE IF NOT EXISTS insurance_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  is_actual_quote BOOLEAN NOT NULL DEFAULT false,
  provider TEXT,
  annual_premium INTEGER NOT NULL,                -- in pence
  cover_type TEXT NOT NULL DEFAULT 'comprehensive',
  base_premium INTEGER,
  young_driver_loading DOUBLE PRECISION,
  ncb_discount DOUBLE PRECISION,
  postcode_factor DOUBLE PRECISION,
  age_factor DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Shortlist Snapshots
-- =============================================
CREATE TABLE IF NOT EXISTS shortlist_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  listings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_date
  ON shortlist_snapshots (snapshot_date);

-- =============================================
-- Scrape Runs
-- =============================================
CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running',          -- running, completed, failed
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  listings_found INTEGER NOT NULL DEFAULT 0,
  listings_new INTEGER NOT NULL DEFAULT 0,
  listings_updated INTEGER NOT NULL DEFAULT 0,
  price_drops INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortlist_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so no policies needed for now.
-- If you add anon/authenticated access later, add policies here.
