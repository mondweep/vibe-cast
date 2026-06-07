-- Migration: Expose the ruflo_demo schema to the PostgREST API
-- Date: 2026-06-07
-- Purpose: The ruflo_demo schema was never added to PostgREST's exposed schemas,
--          so supabase-js (server and client) could not read ANY ruflo_demo table
--          (errors PGRST106 "Invalid schema" then PGRST205 "not in schema cache").
--          This is the root reason the read models returned no data. (ADR-013 Phase 3)
-- Note: ALTER ROLE affects new connections; the NOTIFYs reload PostgREST live.
--       Keep the existing exposed schemas (public, graphql_public, agentic_ai_news).

ALTER ROLE authenticator
  SET pgrst.db_schemas = 'public, graphql_public, agentic_ai_news, ruflo_demo';

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
