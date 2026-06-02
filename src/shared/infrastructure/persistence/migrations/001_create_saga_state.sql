-- SAGA State Table
-- Tracks the execution state of each SAGA instance
-- Implements optimistic locking via version column
-- Phase 2 implementation per SagaRepository specifications

CREATE TABLE IF NOT EXISTS saga_state (
  -- Primary key: unique saga instance identifier
  id UUID PRIMARY KEY,

  -- Workflow and status tracking
  workflow_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'COMPENSATED')),
  current_step VARCHAR(255) NOT NULL,

  -- Correlations and context
  learner_id UUID NOT NULL,
  enrollment_id UUID NOT NULL,
  certification_id UUID,
  correlation_id UUID NOT NULL,

  -- SAGA state data (serialized context)
  saga_data JSONB NOT NULL DEFAULT '{}',

  -- Optimistic locking
  version INT NOT NULL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices for query performance
CREATE INDEX idx_saga_state_workflow ON saga_state(workflow_type);
CREATE INDEX idx_saga_state_status ON saga_state(status);
CREATE INDEX idx_saga_state_enrollment ON saga_state(enrollment_id, current_step);
CREATE INDEX idx_saga_state_correlation ON saga_state(correlation_id);

-- SAGA Step History Table
-- Audit trail of all steps executed in each SAGA
CREATE TABLE IF NOT EXISTS saga_steps (
  id BIGSERIAL PRIMARY KEY,
  saga_id UUID NOT NULL REFERENCES saga_state(id) ON DELETE CASCADE,
  step_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  result JSONB,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  compensating_step VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_saga_steps_saga ON saga_steps(saga_id);
CREATE INDEX idx_saga_steps_created ON saga_steps(created_at ASC);

-- SAGA Processed Events Table
-- Tracks which events have been processed by each SAGA for idempotency
CREATE TABLE IF NOT EXISTS saga_processed_events (
  id BIGSERIAL PRIMARY KEY,
  saga_id UUID NOT NULL REFERENCES saga_state(id) ON DELETE CASCADE,
  event_id UUID NOT NULL,
  processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(saga_id, event_id)
);

CREATE INDEX idx_saga_processed_events_saga ON saga_processed_events(saga_id);
CREATE INDEX idx_saga_processed_events_event ON saga_processed_events(event_id);

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
