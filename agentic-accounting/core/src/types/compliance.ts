/**
 * Compliance rule types
 */
export enum RuleType {
  WASH_SALE = 'WASH_SALE',
  TRADING_LIMIT = 'TRADING_LIMIT',
  SEGREGATION_DUTY = 'SEGREGATION_DUTY',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
}

/**
 * Logical operators for compound rules
 */
export enum Logic {
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
}

/**
 * Rule condition for evaluation
 */
export interface RuleCondition {
  /** Field to check (e.g., 'quantity', 'amount', 'frequency') */
  field: string;

  /** Comparison operator (e.g., '>', '<', '==', '!=', 'contains') */
  operator: string;

  /** Threshold or comparison value */
  value: unknown;

  /** Optional logical operator for compound rules */
  logic?: Logic;

  /** Optional nested conditions for complex rules */
  conditions?: RuleCondition[];
}

/**
 * Actions to take when a rule is triggered
 */
export enum RuleAction {
  ALERT = 'ALERT',                     // Notify but allow
  BLOCK = 'BLOCK',                     // Prevent transaction
  FLAG = 'FLAG',                       // Mark for review
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL', // Human review required
}

/**
 * Severity levels for alerts
 */
export enum Severity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Compliance rule model for validation and enforcement
 */
export interface ComplianceRule {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Human-readable rule name */
  name: string;

  /** Rule category */
  type: RuleType;

  /** Evaluation logic */
  condition: RuleCondition;

  /** Action to take if triggered */
  action: RuleAction;

  /** Alert severity level */
  severity: Severity;

  /** Whether rule is currently active */
  enabled: boolean;

  /** Applicable jurisdictions (e.g., ['US', 'EU', 'UK']) */
  jurisdiction: string[];

  /** Additional configuration metadata */
  metadata: Record<string, unknown>;
}
