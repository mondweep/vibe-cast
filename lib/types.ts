// Ticket input for API creation
export interface TicketInput {
  customerName: string;
  email: string;
  subject: string;
  description: string;
}

// Ticket classification output from Intake Agent
export interface TicketClassification {
  ticketId: string;
  category: 'billing' | 'technical' | 'account' | 'feature-request';
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  confidence: number; // 0-1
  nextAgent: string;
}

// Agent resolution outputs
export interface BillingResolution {
  ticketId: string;
  resolution: string;
  actionsTaken: string[];
  customerImpact: 'refund' | 'credit' | 'explanation' | 'no-action';
  amount?: number;
  escalationRequired: boolean;
  escalationReason?: string;
}

export interface TechnicalResolution {
  ticketId: string;
  diagnosis: string;
  steps: string[];
  resourceLinks: string[];
  isKnownIssue: boolean;
  escalationRequired: boolean;
  escalationReason?: string;
}

export interface AccountResolution {
  ticketId: string;
  actionTaken: string;
  accountUpdated: boolean;
  securityIssueDetected: boolean;
  escalationRequired: boolean;
}

export interface EscalationReview {
  ticketId: string;
  originalAgentId: string;
  escalationReason: string;
  isJustified: boolean;
  reviewedAt: string;
  humanNotificationSent: boolean;
  status: 'pending-human' | 'rejected-reassign';
}

// Full ticket record from database
export interface Ticket {
  id: string;
  customer_name: string;
  email: string;
  subject: string;
  description: string;
  category: string | null;
  priority: string | null;
  status: string;
  current_agent_id: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution: string | null;
  transcript?: AgentLog[];
}

// Agent log entry
export interface AgentLog {
  id: string;
  ticket_id: string;
  agent_id: string;
  action: string;
  reasoning: string | null;
  tokens_used: number | null;
  timestamp: string;
}

// Cost tracking
export interface CostTracking {
  agent_id: string;
  month: string;
  tokens_used: number;
  estimated_cost: number;
  budget_limit: number | null;
}

// API responses
export interface ListTicketsResponse {
  tickets: Ticket[];
  total: number;
  pending: number;
  resolved: number;
  escalated: number;
}

export interface AgentStatus {
  id: string;
  status: 'idle' | 'processing';
  currentTicketId: string | null;
  tokensUsed: number;
  monthlyBudget: number;
  percentBudgetUsed: number;
  avgResponseTimeMs: number;
}

export interface AgentsStatusResponse {
  agents: AgentStatus[];
  timestamp: string;
}
