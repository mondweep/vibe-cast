-- Ticket table
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  priority TEXT,
  status TEXT DEFAULT 'new',
  current_agent_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  resolution TEXT
);

-- Agent logs table
CREATE TABLE IF NOT EXISTS agent_logs (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reasoning TEXT,
  tokens_used INTEGER,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

-- Cost tracking table
CREATE TABLE IF NOT EXISTS cost_tracking (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  month TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  budget_limit REAL,
  UNIQUE(agent_id, month)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_agent_logs_ticket ON agent_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id);
