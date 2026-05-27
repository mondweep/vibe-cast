-- ============================================================
-- Agentic AI News Digest Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS agentic_ai_news;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Digests table: one row per newsletter edition
-- ============================================================
CREATE TABLE IF NOT EXISTS agentic_ai_news.digests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    publication_date DATE NOT NULL,
    executive_summary TEXT,
    footer TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate editions for same date
    UNIQUE (publication_date)
);

-- ============================================================
-- News items table: one row per categorized news item
-- ============================================================
CREATE TABLE IF NOT EXISTS agentic_ai_news.news_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    digest_id UUID NOT NULL REFERENCES agentic_ai_news.digests(id) ON DELETE CASCADE,

    headline TEXT NOT NULL,
    summary TEXT,
    source TEXT,
    region TEXT,
    url TEXT,
    date DATE,

    -- Category: enterprise_adoption | challenges | opportunities | evolving_trends
    category TEXT NOT NULL,

    -- Scoring fields (nullable based on category)
    impact_score INTEGER,
    severity TEXT,
    market_potential TEXT,
    trend_indicator TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_news_items_digest_id ON agentic_ai_news.news_items(digest_id);
CREATE INDEX IF NOT EXISTS idx_news_items_category ON agentic_ai_news.news_items(category);
CREATE INDEX IF NOT EXISTS idx_digests_publication_date ON agentic_ai_news.digests(publication_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_date ON agentic_ai_news.news_items(date DESC);

-- ============================================================
-- Grants for public access
-- ============================================================
GRANT USAGE ON SCHEMA agentic_ai_news TO anon;
GRANT USAGE ON SCHEMA agentic_ai_news TO authenticated;
GRANT USAGE ON SCHEMA agentic_ai_news TO service_role;

GRANT SELECT ON agentic_ai_news.digests TO anon;
GRANT SELECT ON agentic_ai_news.news_items TO anon;
GRANT INSERT ON agentic_ai_news.digests TO anon;
GRANT INSERT ON agentic_ai_news.news_items TO anon;

-- ============================================================
-- Row Level Security (with open policies for append)
-- ============================================================
ALTER TABLE agentic_ai_news.digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentic_ai_news.news_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read digests" ON agentic_ai_news.digests;
DROP POLICY IF EXISTS "Public read news_items" ON agentic_ai_news.news_items;
DROP POLICY IF EXISTS "Public insert digests" ON agentic_ai_news.digests;
DROP POLICY IF EXISTS "Public insert news_items" ON agentic_ai_news.news_items;

CREATE POLICY "Public read digests" ON agentic_ai_news.digests FOR SELECT USING (true);
CREATE POLICY "Public read news_items" ON agentic_ai_news.news_items FOR SELECT USING (true);
CREATE POLICY "Public insert digests" ON agentic_ai_news.digests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert news_items" ON agentic_ai_news.news_items FOR INSERT WITH CHECK (true);