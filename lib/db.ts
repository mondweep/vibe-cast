import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Ticket, AgentLog } from './types';

// Path to SQLite database file - use /tmp for Netlify Functions
const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/tmp/demo.db'
  : path.join(process.cwd(), 'data', 'demo.db');

let db: Database.Database | null = null;

/**
 * Initialize database connection
 * Auto-seeds with schema and mock data if database is empty
 */
export function initDB(): Database.Database {
  if (db) return db;

  // Ensure directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Check if database is empty
  const tableCheck = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'`
  ).all();

  if (tableCheck.length === 0) {
    seedDatabase();
  }

  // Create agent_activity table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_activity (
      agent_id TEXT PRIMARY KEY,
      message TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

/**
 * Seed database with schema and mock data
 */
function seedDatabase(): void {
  if (!db) throw new Error('Database not initialized');

  // Load and execute schema
  const schemaPath = path.join(process.cwd(), 'public', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolon and execute each statement
  const statements = schema.split(';').filter(s => s.trim());
  for (const statement of statements) {
    db.exec(statement);
  }

  // Load mock data
  const ticketsPath = path.join(process.cwd(), 'mock-data', 'tickets.json');
  const customersPath = path.join(process.cwd(), 'mock-data', 'customers.json');

  const ticketsData = JSON.parse(fs.readFileSync(ticketsPath, 'utf-8'));
  const customersData = JSON.parse(fs.readFileSync(customersPath, 'utf-8'));

  const now = new Date().toISOString();
  const insertTicket = db.prepare(`
    INSERT INTO tickets (id, customer_name, email, subject, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Insert tickets
  for (const ticket of ticketsData.mockTickets) {
    insertTicket.run(
      ticket.id,
      ticket.customerName,
      ticket.email,
      ticket.subject,
      ticket.description,
      'new',
      now,
      now
    );
  }

  // Initialize cost tracking for all agents
  const insertCost = db.prepare(`
    INSERT INTO cost_tracking (id, agent_id, month, tokens_used, estimated_cost, budget_limit)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const agents = ['intake-agent', 'billing-specialist', 'technical-specialist', 'account-manager', 'escalation-manager'];
  const budgets: { [key: string]: number } = {
    'intake-agent': 100000,
    'billing-specialist': 50000,
    'technical-specialist': 50000,
    'account-manager': 50000,
    'escalation-manager': 30000
  };

  for (const agent of agents) {
    insertCost.run(
      `cost_${agent}_${month}`,
      agent,
      month,
      0,
      0,
      budgets[agent]
    );
  }

  console.log(`✅ Database seeded: ${ticketsData.mockTickets.length} tickets, ${agents.length} agents initialized`);
}

/**
 * Reset database to initial demo state
 */
export function resetDatabase(): void {
  const db = initDB();
  
  // Disable foreign key constraints during clear
  db.pragma('foreign_keys = OFF');
  
  // Clear all data
  db.prepare('DELETE FROM agent_logs').run();
  db.prepare('DELETE FROM cost_tracking').run();
  db.prepare('DELETE FROM agent_activity').run();
  db.prepare('DELETE FROM tickets').run();
  
  // Re-enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Re-seed with fresh mock data
  seedDatabase();
}

/**
 * Get database instance
 */
export function getDB(): Database.Database {
  return initDB();
}

/**
 * Execute a query
 */
export function query<T>(sql: string, params?: any[]): T[] {
  const db = initDB();
  const stmt = db.prepare(sql);
  if (params) {
    return stmt.all(...params) as T[];
  }
  return stmt.all() as T[];
}

/**
 * Execute a single row query
 */
export function queryOne<T>(sql: string, params?: any[]): T | undefined {
  const db = initDB();
  const stmt = db.prepare(sql);
  if (params) {
    return stmt.get(...params) as T | undefined;
  }
  return stmt.get() as T | undefined;
}

/**
 * Execute a statement with parameters
 */
export function run(sql: string, params?: any[]): Database.RunResult {
  const db = initDB();
  const stmt = db.prepare(sql);
  if (params) {
    return stmt.run(...params);
  }
  return stmt.run();
}

/**
 * Get a prepared statement for reuse
 */
export function prepare(sql: string): Database.Statement {
  const db = initDB();
  return db.prepare(sql);
}

/**
 * Execute multiple statements in a transaction
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const db = initDB();
  const t = db.transaction(fn);
  return t(db);
}

/**
 * Get all tickets with optional filtering
 */
export function getTickets(status?: string, limit = 100, offset = 0): Ticket[] {
  let sql = 'SELECT * FROM tickets';
  const params: any[] = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return query<Ticket>(sql, params);
}

/**
 * Get a single ticket with its transcript
 */
export function getTicket(ticketId: string): (Ticket & { transcript: AgentLog[] }) | undefined {
  const ticket = queryOne<Ticket>('SELECT * FROM tickets WHERE id = ?', [ticketId]);
  if (!ticket) return undefined;

  const transcript = query<AgentLog>(
    'SELECT * FROM agent_logs WHERE ticket_id = ? ORDER BY timestamp ASC',
    [ticketId]
  );

  return { ...ticket, transcript };
}

/**
 * Create a new ticket
 */
export function createTicket(input: {
  customerName: string;
  email: string;
  subject: string;
  description: string;
}): Ticket {
  const id = `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  run(
    `INSERT INTO tickets (id, customer_name, email, subject, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.customerName, input.email, input.subject, input.description, 'new', now, now]
  );

  return getTicket(id) as Ticket;
}

/**
 * Update ticket status and metadata
 */
export function updateTicket(ticketId: string, updates: Partial<Ticket>): Ticket {
  const now = new Date().toISOString();
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  fields.push('updated_at = ?');
  values.push(now);
  values.push(ticketId);

  run(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`, values);

  return getTicket(ticketId) as Ticket;
}

/**
 * Add agent log entry
 */
export function addAgentLog(log: {
  ticketId: string;
  agentId: string;
  action: string;
  reasoning?: string;
  tokensUsed?: number;
}): AgentLog {
  const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  run(
    `INSERT INTO agent_logs (id, ticket_id, agent_id, action, reasoning, tokens_used, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, log.ticketId, log.agentId, log.action, log.reasoning || null, log.tokensUsed || null, timestamp]
  );

  return queryOne<AgentLog>('SELECT * FROM agent_logs WHERE id = ?', [id]) as AgentLog;
}

/**
 * Set current activity for an agent (Heartbeat)
 */
export function setAgentActivity(agentId: string, message: string | null): void {
  const db = initDB();
  if (message) {
    db.prepare('INSERT OR REPLACE INTO agent_activity (agent_id, message, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(agentId, message);
  } else {
    db.prepare('DELETE FROM agent_activity WHERE agent_id = ?').run(agentId);
  }
}

/**
 * Get all current agent activities
 */
export function getAgentActivities(): { [id: string]: string } {
  const rows = query<{ agent_id: string; message: string }>('SELECT agent_id, message FROM agent_activity');
  const result: { [id: string]: string } = {};
  for (const row of rows) {
    result[row.agent_id] = row.message;
  }
  return result;
}

/**
 * Get agent status for dashboard
 */
export function getAgentStatus(agentId: string): {
  tokensUsed: number;
  monthlyBudget: number;
  percentBudgetUsed: number;
  avgResponseTimeMs: number;
} {
  const month = new Date().toISOString().slice(0, 7);

  const costData = queryOne<any>(
    'SELECT tokens_used, budget_limit FROM cost_tracking WHERE agent_id = ? AND month = ?',
    [agentId, month]
  );

  const tokensUsed = costData?.tokens_used || 0;
  const monthlyBudget = costData?.budget_limit || 100000;
  const percentBudgetUsed = (tokensUsed / monthlyBudget) * 100;

  // Calculate average response time from agent logs
  const logs = query<AgentLog>(
    `SELECT a.tokens_used, a.timestamp
     FROM agent_logs a
     WHERE a.agent_id = ?
     ORDER BY a.timestamp DESC
     LIMIT 10`,
    [agentId]
  );

  let avgResponseTimeMs = 0;
  if (logs.length > 0) {
    avgResponseTimeMs = 2500; // Default estimate, can be enhanced
  }

  return {
    tokensUsed,
    monthlyBudget,
    percentBudgetUsed,
    avgResponseTimeMs
  };
}

/**
 * Get ticket counts by status
 */
export function getTicketCounts(): { total: number; pending: number; resolved: number; escalated: number } {
  const total = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM tickets'
  )?.count || 0;

  const pending = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM tickets WHERE status IN ('new', 'classified', 'assigned', 'processing')`
  )?.count || 0;

  const resolved = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM tickets WHERE status = \'resolved\''
  )?.count || 0;

  const escalated = queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM tickets WHERE status IN ('pending-human', 'escalated')`
  )?.count || 0;

  return { total, pending, resolved, escalated };
}

/**
 * Update agent tokens for cost tracking
 */
export function updateAgentTokens(agentId: string, tokensUsed: number): void {
  const month = new Date().toISOString().slice(0, 7);
  // Gemini 2.5 Flash pricing (as of April 2026):
  // Input:  $0.0001875 / 1K tokens
  // Output: $0.0007500 / 1K tokens
  // Assume ~80% input / 20% output split for typical agentic prompts
  const inputTokens  = Math.round(tokensUsed * 0.8);
  const outputTokens = Math.round(tokensUsed * 0.2);
  const estimatedCostDelta = (inputTokens * 0.0001875 + outputTokens * 0.00075) / 1000;

  const existing = queryOne<any>(
    'SELECT tokens_used FROM cost_tracking WHERE agent_id = ? AND month = ?',
    [agentId, month]
  );

  if (existing) {
    const newTotal = (existing.tokens_used || 0) + tokensUsed;
    const newEstimatedCost = (existing.estimated_cost || 0) + estimatedCostDelta;

    run(
      'UPDATE cost_tracking SET tokens_used = ?, estimated_cost = ? WHERE agent_id = ? AND month = ?',
      [newTotal, newEstimatedCost, agentId, month]
    );
  }
}
