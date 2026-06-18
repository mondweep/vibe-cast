-- Migration 019: Grant anon SELECT on coupon tables
--
-- Problem: ruflo_demo_coupon and ruflo_demo_coupon_redemption were created in
-- migration 015, AFTER the broad "GRANT SELECT ON ALL TABLES TO anon" in
-- migration 002. That broad grant does not retroactively cover tables created
-- later, so the anon role had no SELECT on these tables.
--
-- Symptom: GET /api/v1/coupons/my-access returned 500 for new users because the
-- server-side Supabase client (when falling back from service-role to anon key)
-- could not execute the inner join on ruflo_demo_coupon. PostgREST returned a
-- permission error which the controller re-threw as 500.
--
-- Fix: grant SELECT to anon so the join succeeds regardless of which key the
-- server uses. RLS still applies (anon has no SELECT policy on these tables, so
-- no coupon data is actually leaked — anon gets empty results, not row data).

GRANT SELECT ON ruflo_demo.ruflo_demo_coupon            TO anon;
GRANT SELECT ON ruflo_demo.ruflo_demo_coupon_redemption TO anon;
