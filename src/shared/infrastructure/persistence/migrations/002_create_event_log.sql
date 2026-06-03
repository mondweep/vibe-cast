-- Event Log Table
-- Append-only log of all domain events for event sourcing
-- Enables event replay and audit trail reconstruction

CREATE TABLE IF NOT EXISTS event_log (
  -- Primary key: auto-incrementing sequence number
  -- Ensures events are ordered even if timestamps are identical
  sequence_number BIGSERIAL PRIMARY KEY,

  -- Event identity
  id UUID NOT NULL UNIQUE,
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(100) NOT NULL,

  -- Source aggregate
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,

  -- Event data
  event_data JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',

  -- Causation tracking for distributed tracing
  correlation_id UUID NOT NULL,
  causation_id UUID,

  -- Timestamps (use UTC for consistency)
  occurred_at TIMESTAMP NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Learner context (for multi-tenant filtering if needed)
  learner_id UUID NOT NULL,

  -- Optimistic versioning for snapshots
  aggregate_version INT NOT NULL DEFAULT 1
);

-- Indexes for efficient querying
-- Primary access pattern: events for specific aggregate
CREATE INDEX idx_event_log_aggregate ON event_log(aggregate_id, sequence_number ASC);

-- Support replaying events for a specific aggregate type
CREATE INDEX idx_event_log_type ON event_log(aggregate_type, sequence_number ASC);

-- Support temporal queries (events in a time range)
CREATE INDEX idx_event_log_occurred_at ON event_log(occurred_at DESC);

-- Support correlation tracking across domains
CREATE INDEX idx_event_log_correlation ON event_log(correlation_id);

-- Support learner-scoped queries
CREATE INDEX idx_event_log_learner ON event_log(learner_id, recorded_at DESC);

-- Constraint: ensure monotonic sequence for event ordering
-- This prevents duplicate event IDs in the log
CREATE UNIQUE INDEX idx_event_log_id ON event_log(id);

-- Event Snapshots Table
-- Periodically snapshot aggregate state to optimize replay performance
-- Read the snapshot, replay only newer events
CREATE TABLE IF NOT EXISTS event_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Aggregate reference
  aggregate_id UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,

  -- Snapshot data
  snapshot_data JSONB NOT NULL,
  aggregate_version INT NOT NULL,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Causation: which event triggered this snapshot
  last_event_sequence BIGINT NOT NULL
);

-- Indexes for snapshot queries
CREATE INDEX idx_event_snapshots_aggregate ON event_snapshots(aggregate_id, aggregate_version DESC);
CREATE INDEX idx_event_snapshots_type ON event_snapshots(aggregate_type, created_at DESC);

-- Constraint: one snapshot per (aggregate_id, version)
CREATE UNIQUE INDEX idx_event_snapshots_version ON event_snapshots(aggregate_id, aggregate_version);
