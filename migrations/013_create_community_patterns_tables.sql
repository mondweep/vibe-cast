-- Migration 013: Community Pattern Repository (ADR-016, P1)
-- Schema: ruflo_demo
-- Creates pattern read models, ratings, RLS policies, indexes, and seeds patterns

SET search_path TO ruflo_demo, public;

-- ============================================================
-- 1. Pattern read model
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_pattern_read_model (
  pattern_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         UUID,
  title             TEXT          NOT NULL,
  category          VARCHAR(32),
  difficulty        VARCHAR(16),
  problem           TEXT          NOT NULL,
  solution          TEXT          NOT NULL,
  code_example      TEXT,
  production_context TEXT,
  performance_notes TEXT,
  known_limitations TEXT,
  status            VARCHAR(16)   DEFAULT 'published',
  stars             NUMERIC(3,2)  DEFAULT 0,
  rating_count      INT           DEFAULT 0,
  created_at        TIMESTAMPTZ   DEFAULT now(),
  updated_at        TIMESTAMPTZ   DEFAULT now()
);

-- ============================================================
-- 2. Pattern rating read model
-- ============================================================
CREATE TABLE IF NOT EXISTS ruflo_demo.ruflo_demo_pattern_rating_read_model (
  rating_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id   UUID        NOT NULL REFERENCES ruflo_demo.ruflo_demo_pattern_read_model(pattern_id) ON DELETE CASCADE,
  learner_id   UUID        NOT NULL,
  stars        INT         CHECK (stars BETWEEN 1 AND 5),
  review_text  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pattern_id, learner_id)
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pattern_category
  ON ruflo_demo.ruflo_demo_pattern_read_model (category);

CREATE INDEX IF NOT EXISTS idx_pattern_status
  ON ruflo_demo.ruflo_demo_pattern_read_model (status);

CREATE INDEX IF NOT EXISTS idx_pattern_stars
  ON ruflo_demo.ruflo_demo_pattern_read_model (stars DESC);

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE ruflo_demo.ruflo_demo_pattern_read_model ENABLE ROW LEVEL SECURITY;
ALTER TABLE ruflo_demo.ruflo_demo_pattern_rating_read_model ENABLE ROW LEVEL SECURITY;

-- Patterns: public read for published rows
DROP POLICY IF EXISTS pattern_public_read ON ruflo_demo.ruflo_demo_pattern_read_model;
CREATE POLICY pattern_public_read
  ON ruflo_demo.ruflo_demo_pattern_read_model
  FOR SELECT
  USING (status = 'published');

-- Patterns: service role can do anything
DROP POLICY IF EXISTS pattern_service_all ON ruflo_demo.ruflo_demo_pattern_read_model;
CREATE POLICY pattern_service_all
  ON ruflo_demo.ruflo_demo_pattern_read_model
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Patterns: authenticated users can insert (submit for moderation)
DROP POLICY IF EXISTS pattern_auth_insert ON ruflo_demo.ruflo_demo_pattern_read_model;
CREATE POLICY pattern_auth_insert
  ON ruflo_demo.ruflo_demo_pattern_read_model
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Ratings: owner can read their own ratings
DROP POLICY IF EXISTS rating_owner_read ON ruflo_demo.ruflo_demo_pattern_rating_read_model;
CREATE POLICY rating_owner_read
  ON ruflo_demo.ruflo_demo_pattern_rating_read_model
  FOR SELECT
  TO authenticated
  USING (learner_id = auth.uid());

-- Ratings: authenticated users can insert
DROP POLICY IF EXISTS rating_auth_insert ON ruflo_demo.ruflo_demo_pattern_rating_read_model;
CREATE POLICY rating_auth_insert
  ON ruflo_demo.ruflo_demo_pattern_rating_read_model
  FOR INSERT
  TO authenticated
  WITH CHECK (learner_id = auth.uid());

-- Ratings: service role full access
DROP POLICY IF EXISTS rating_service_all ON ruflo_demo.ruflo_demo_pattern_rating_read_model;
CREATE POLICY rating_service_all
  ON ruflo_demo.ruflo_demo_pattern_rating_read_model
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5. Grants
-- ============================================================
GRANT SELECT ON ruflo_demo.ruflo_demo_pattern_read_model TO anon, authenticated;
GRANT INSERT, SELECT ON ruflo_demo.ruflo_demo_pattern_rating_read_model TO authenticated;

-- ============================================================
-- 6. Seed patterns
-- ============================================================
INSERT INTO ruflo_demo.ruflo_demo_pattern_read_model
  (title, category, difficulty, problem, solution, code_example, production_context, performance_notes, known_limitations, status, stars)
VALUES
  (
    'Leader Election Pattern',
    'Consensus',
    'intermediate',
    'In a multi-agent swarm, multiple agents may try to act as coordinator simultaneously, causing conflicting decisions and duplicated work.',
    'Use Ruflo''s hive-mind consensus mechanism to elect a single leader agent that coordinates task distribution. All other agents become workers and wait for instructions from the elected leader.',
    E'# Initialize hive-mind with consensus\nnpx @claude-flow/cli@latest hive-mind init --mode consensus --strategy leader-election\n\n# Spawn agents — leader is auto-elected\nnpx @claude-flow/cli@latest agent spawn --type coordinator --name "leader-candidate-1"\nnpx @claude-flow/cli@latest agent spawn --type coordinator --name "leader-candidate-2"\n\n# Check elected leader\nnpx @claude-flow/cli@latest hive-mind status --show-leader',
    'Used in production swarms with 8+ agents where task ordering matters. Especially effective for sequential pipeline tasks where parallel execution causes ordering issues.',
    'Leader election adds 50-200ms latency on startup. Negligible for long-running swarms, significant for short-lived tasks under 5 seconds.',
    'Leader re-election on agent failure can take 2-5 seconds during which tasks are queued. Not suitable for hard real-time systems.',
    'published',
    4.7
  ),
  (
    'Mesh Coordination Topology',
    'Topology',
    'advanced',
    'A hierarchical coordinator becomes a single point of failure, and agents need to share intermediate results without routing everything through a central node.',
    'Configure a mesh topology where every agent can communicate directly with any other agent. Use Ruflo''s memory bridge for shared state and direct message routing for inter-agent communication.',
    E'# Initialize mesh swarm\nnpx @claude-flow/cli@latest swarm init --topology mesh --max-agents 12 --strategy balanced\n\n# Agents in mesh can message each other directly\nnpx @claude-flow/cli@latest memory store --namespace "swarm/mesh" --key "shared-context" --value "..." \n\n# Each agent reads shared context\nnpx @claude-flow/cli@latest memory search --namespace "swarm/mesh" --query "shared context"\n\n# Monitor mesh health\nnpx @claude-flow/cli@latest swarm health --topology-check',
    'Ideal for research swarms where multiple specialist agents independently gather findings and need to share results without bottlenecking through a coordinator.',
    'Memory reads scale linearly with agent count. For 12 agents, expect ~150ms for a full mesh context sync via the memory bridge.',
    'Mesh topology requires all agents to handle partial failures gracefully. If one agent crashes mid-coordination, other agents must detect the silence and proceed.',
    'published',
    4.5
  ),
  (
    'Memory Consolidation Pattern',
    'Memory',
    'beginner',
    'Agents accumulate large amounts of context in memory over long sessions, causing slower searches and higher token costs on memory retrieval.',
    'Schedule periodic memory consolidation using Ruflo''s neural compress tool. This clusters related memories, removes redundant entries, and produces concise summary nodes that retain key information.',
    E'# Store memories during work\nnpx @claude-flow/cli@latest memory store --namespace "project/research" --key "finding-001" --value "..."\n\n# Consolidate after significant accumulation (e.g., every 50 entries)\nnpx @claude-flow/cli@latest memory consolidate --namespace "project/research" --strategy semantic\n\n# Verify consolidation\nnpx @claude-flow/cli@latest memory stats --namespace "project/research"\n\n# Search consolidated memory (faster after consolidation)\nnpx @claude-flow/cli@latest memory search --namespace "project/research" --query "key findings"',
    'Applied in knowledge graph ingestion pipelines where the tutor accumulates 500+ memory entries per learning session. Consolidation runs nightly via a cron loop worker.',
    'Consolidation reduces memory entry count by 60-80% while retaining 95%+ of semantically distinct information. Search latency drops from 800ms to 120ms post-consolidation.',
    'Consolidation is not reversible. Run a memory export before consolidating critical namespaces. Consolidation may merge distinct entries that share vocabulary but differ in meaning.',
    'published',
    4.2
  ),
  (
    'Pipeline Orchestration with Hooks',
    'Pipeline',
    'intermediate',
    'Multi-step pipelines where each step depends on the previous one are hard to coordinate reliably — steps may run out of order or skip on failure.',
    'Use Ruflo hooks (pre-task, post-edit, post-task) to enforce pipeline sequencing. Each agent signals completion via a memory key that the next agent polls as a pre-task condition.',
    E'# Agent 1: researcher — signals completion via memory\nnpx @claude-flow/cli@latest hooks pre-task --description "Research phase" --auto-spawn-agents false\n# ... do research work ...\nnpx @claude-flow/cli@latest memory store --key "pipeline/research-done" --value "true"\nnpx @claude-flow/cli@latest hooks post-task --task-id "research" --analyze-performance true\n\n# Agent 2: coder — waits for research signal\nnpx @claude-flow/cli@latest hooks pre-task --description "Implementation phase"\nnpx @claude-flow/cli@latest memory search --query "pipeline/research-done"\n# ... implement based on research ...\nnpx @claude-flow/cli@latest hooks post-edit --file "src/feature.ts" --memory-key "pipeline/impl"\n\n# Monitor pipeline progress\nnpx @claude-flow/cli@latest hooks worker-status --pipeline "feature-pipeline"',
    'Standard pattern for feature development swarms: researcher → architect → coder → tester → reviewer. Each transition is guarded by a memory key check.',
    'Hook overhead per step is ~30ms. Full 5-step pipeline adds ~150ms overhead. Memory key checks add ~50ms latency between steps.',
    'If an agent crashes without writing its completion key, downstream agents will wait indefinitely. Implement a timeout in the pre-task hook: add --timeout 300 to abort stuck pipelines.',
    'published',
    4.6
  ),
  (
    'Security Audit Swarm',
    'Security',
    'advanced',
    'Security reviews done by a single agent miss context-specific vulnerabilities that require cross-file analysis and understanding of data flows across the codebase.',
    'Deploy a specialized security swarm with dedicated agents for different threat categories: injection, auth, secrets, and dependency vulnerabilities. Each agent scans its domain and reports to a coordinator that aggregates findings.',
    E'# Initialize security-focused swarm\nnpx @claude-flow/cli@latest swarm init --topology hierarchical --strategy specialized\nnpx @claude-flow/cli@latest agent spawn --type security-architect --name "security-lead"\nnpx @claude-flow/cli@latest agent spawn --type security-auditor --name "injection-scanner"\nnpx @claude-flow/cli@latest agent spawn --type security-auditor --name "auth-scanner"\n\n# Run AIDefence scan across codebase\nnpx @claude-flow/cli@latest security scan --deep --output security-report.json\n\n# Check for PII in outputs\nnpx @claude-flow/cli@latest security check-pii --path ./src\n\n# Aggregate findings\nnpx @claude-flow/cli@latest memory store --namespace "security/audit" --key "findings" --value "$(cat security-report.json)"',
    'Run as a pre-deployment gate in CI/CD pipelines. The security swarm runs in parallel with tests and blocks deployment if critical issues are found.',
    'A full security swarm scan of a 50k LOC TypeScript project takes 8-12 minutes. Dependency vulnerability scan adds 2-3 minutes. Run on PR creation, not on every commit.',
    'The swarm detects syntactic patterns but cannot reason about business logic vulnerabilities. Always combine with manual review for authentication flows and financial calculations.',
    'published',
    4.8
  ),
  (
    'Adaptive Topology Selection',
    'Coordination',
    'beginner',
    'Choosing the wrong swarm topology for a task leads to inefficiency: hierarchical is too rigid for exploratory tasks, mesh is too expensive for simple linear tasks.',
    'Use Ruflo''s autopilot topology prediction to automatically select the optimal topology based on task description. The neural model is trained on past swarm performance data to recommend the best configuration.',
    E'# Let autopilot predict the best topology\nnpx @claude-flow/cli@latest autopilot predict --task "Refactor authentication module for OAuth2 support"\n# Output: Recommended: hierarchical, agents: 5, strategy: specialized\n\n# Or use auto-topology optimization\nnpx @claude-flow/cli@latest optimization auto-topology --task "Refactor authentication module"\n\n# Enable autopilot for continuous optimization\nnpx @claude-flow/cli@latest autopilot enable --mode adaptive\nnpx @claude-flow/cli@latest autopilot status\n\n# After task, train the model on the outcome\nnpx @claude-flow/cli@latest autopilot learn --task-id "refactor-auth" --outcome success --duration 1200',
    'New teams use this as their entry point to Ruflo swarms. The autopilot learns from the team''s specific codebase and task patterns over 2-4 weeks.',
    'Topology prediction takes 200-400ms. The model improves with usage — prediction accuracy increases from ~60% to ~85% after 50 training examples.',
    'Autopilot predictions are probabilistic. For critical production deployments, manually verify the recommended topology matches your intuition about the task structure.',
    'published',
    4.3
  )
ON CONFLICT (pattern_id) DO NOTHING;
