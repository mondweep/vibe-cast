-- SAGA State Table
-- Tracks the execution state of each SAGA instance
-- Provides idempotency guarantees and audit trail
-- 
-- IMPLEMENTATION STATUS: Awaiting architect-w10 specifications
-- Phase 2 will finalize:
-- - Exact column names and types
-- - Indexing strategy
-- - Retention policy
-- - Partitioning strategy

CREATE TABLE IF NOT EXISTS saga_state (
  -- Primary key: unique saga instance identifier
  saga_id UUID PRIMARY KEY,
  
  -- Saga status tracking
  state VARCHAR(50) NOT NULL,
  current_step VARCHAR(255),
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Context data
  saga_type VARCHAR(100) NOT NULL,
  correlation_id UUID NOT NULL,
  
  -- Idempotency tracking
  processed_event_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Error tracking and compensation
  error_message TEXT,
  is_compensated BOOLEAN DEFAULT FALSE,
  compensation_attempts INT DEFAULT 0,
  
  -- Audit trail
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  metadata JSONB
);

-- Indices for query performance
CREATE INDEX idx_saga_state_type ON saga_state(saga_type);
CREATE INDEX idx_saga_state_state ON saga_state(state);
CREATE INDEX idx_saga_state_correlation ON saga_state(correlation_id);
CREATE INDEX idx_saga_state_started ON saga_state(started_at DESC);

-- SAGA Step History Table
-- Audit trail of all steps executed in each SAGA
CREATE TABLE IF NOT EXISTS saga_step_history (
  id BIGSERIAL PRIMARY KEY,
  saga_id UUID NOT NULL REFERENCES saga_state(saga_id) ON DELETE CASCADE,
  step_name VARCHAR(255) NOT NULL,
  step_status VARCHAR(50) NOT NULL,
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  result_data JSONB,
  error_message TEXT,
  execution_time_ms INT,
  
  FOREIGN KEY (saga_id) REFERENCES saga_state(saga_id) ON DELETE CASCADE
);

CREATE INDEX idx_saga_history_saga ON saga_step_history(saga_id);
CREATE INDEX idx_saga_history_executed ON saga_step_history(executed_at DESC);

-- Dead Letter Queue Table
-- Events that failed all handler attempts
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  correlation_id UUID,
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempted_at TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_dlq_event_type ON dead_letter_queue(event_type);
CREATE INDEX idx_dlq_correlation ON dead_letter_queue(correlation_id);
CREATE INDEX idx_dlq_unresolved ON dead_letter_queue(resolved_at) WHERE resolved_at IS NULL;

-- Idempotency Key Table
-- Prevents duplicate event handler execution
CREATE TABLE IF NOT EXISTS event_idempotency (
  id BIGSERIAL PRIMARY KEY,
  event_id UUID NOT NULL UNIQUE,
  handler_id VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(event_id, handler_id)
);

CREATE INDEX idx_idempotency_event ON event_idempotency(event_id);
CREATE INDEX idx_idempotency_handler ON event_idempotency(handler_id);
