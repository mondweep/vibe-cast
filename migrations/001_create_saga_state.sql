/**
 * SAGA State Persistence Schema (ruflo_demo project)
 *
 * Tables in ruflo_demo schema with ruflo_demo_ prefix:
 * - ruflo_demo_saga_state: Persistent state for long-running sagas
 * - ruflo_demo_saga_steps: Step-by-step execution history
 * - ruflo_demo_saga_idempotency: Idempotency tracking for event deduplication
 * - ruflo_demo_dlq_events: Dead Letter Queue for failed events
 * - ruflo_demo_event_processing: Event processing tracking
 *
 * PHASE 2 IMPLEMENTATION: Optimistic locking with version field
 */

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS ruflo_demo;

-- Create saga_state table
-- Stores the current state of each saga orchestration
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_saga_state (
  id UUID PRIMARY KEY,
  saga_id UUID NOT NULL UNIQUE,
  workflow_type VARCHAR(50) NOT NULL,
  current_step VARCHAR(50) NOT NULL,
  state VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  correlation_id UUID NOT NULL,
  learner_id UUID NOT NULL,
  enrollment_id UUID NOT NULL,
  saga_data JSONB DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_enrollment_id (enrollment_id),
  INDEX idx_learner_id (learner_id),
  INDEX idx_state (state),
  INDEX idx_correlation_id (correlation_id)
);

-- Create saga_steps table
-- Stores the history of step execution
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_saga_steps (
  id UUID PRIMARY KEY,
  saga_id UUID NOT NULL,
  step_name VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  result_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  INDEX idx_saga_id (saga_id),
  INDEX idx_status (status),
  FOREIGN KEY (saga_id) REFERENCES ruflo_demo.ruflo_demo_saga_state(saga_id)
);

-- Create saga_idempotency table
-- Tracks processed events to prevent duplicate processing
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_saga_idempotency (
  id UUID PRIMARY KEY,
  saga_id UUID NOT NULL,
  event_id UUID NOT NULL UNIQUE,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_saga_id (saga_id),
  INDEX idx_event_id (event_id),
  FOREIGN KEY (saga_id) REFERENCES ruflo_demo.ruflo_demo_saga_state(saga_id)
);

-- Create dlq_events table
-- Dead Letter Queue for events that failed all handler attempts
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_dlq_events (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  correlation_id UUID,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMP NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_event_id (event_id),
  INDEX idx_next_retry_at (next_retry_at),
  INDEX idx_correlation_id (correlation_id)
);

-- Create event_processing table
-- Tracks processed events across all handlers for idempotency
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_event_processing (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  handler_name VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_event_id (event_id),
  INDEX idx_handler_name (handler_name)
);

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all SAGA tables
ALTER TABLE ruflo_demo.ruflo_demo_saga_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo.ruflo_demo_saga_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo.ruflo_demo_saga_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo.ruflo_demo_dlq_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo.ruflo_demo_event_processing ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Service role only (backend operations)
CREATE POLICY saga_state_service_read
  ON ruflo_demo.ruflo_demo_saga_state FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY saga_state_service_insert
  ON ruflo_demo.ruflo_demo_saga_state FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY saga_state_service_update
  ON ruflo_demo.ruflo_demo_saga_state FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY saga_steps_service_select
  ON ruflo_demo.ruflo_demo_saga_steps FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY saga_steps_service_insert
  ON ruflo_demo.ruflo_demo_saga_steps FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY saga_steps_service_update
  ON ruflo_demo.ruflo_demo_saga_steps FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY saga_steps_service_delete
  ON ruflo_demo.ruflo_demo_saga_steps FOR DELETE
  USING (auth.role() = 'service_role');

CREATE POLICY saga_idempotency_service_select
  ON ruflo_demo.ruflo_demo_saga_idempotency FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY saga_idempotency_service_insert
  ON ruflo_demo.ruflo_demo_saga_idempotency FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY saga_idempotency_service_delete
  ON ruflo_demo.ruflo_demo_saga_idempotency FOR DELETE
  USING (auth.role() = 'service_role');

CREATE POLICY dlq_events_service_select
  ON ruflo_demo.ruflo_demo_dlq_events FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY dlq_events_service_insert
  ON ruflo_demo.ruflo_demo_dlq_events FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY dlq_events_service_update
  ON ruflo_demo.ruflo_demo_dlq_events FOR UPDATE
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY event_processing_service_select
  ON ruflo_demo.ruflo_demo_event_processing FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY event_processing_service_insert
  ON ruflo_demo.ruflo_demo_event_processing FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Grant Permissions
-- ============================================================
GRANT USAGE ON SCHEMA ruflo_demo TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA ruflo_demo TO service_role;
