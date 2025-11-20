/**
 * Core data types for agentic accounting system
 */

// Transaction types
export type {
  Transaction,
  Income,
} from './transaction.js';

export {
  TransactionType,
  IncomeType,
} from './transaction.js';

// Tax lot types
export type {
  TaxLot,
} from './tax-lot.js';

export {
  AccountingMethod,
  LotStatus,
} from './tax-lot.js';

// Disposal types
export type {
  Disposal,
} from './disposal.js';

export {
  CapitalGainTerm,
} from './disposal.js';

// Position types
export type {
  Position,
} from './position.js';

// Compliance types
export type {
  ComplianceRule,
  RuleCondition,
} from './compliance.js';

export {
  RuleType,
  RuleAction,
  Severity,
  Logic,
} from './compliance.js';

// Audit types
export type {
  AuditEntry,
  Change,
} from './audit.js';

// Tax summary types
export type {
  TaxSummary,
  TaxForm,
} from './tax-summary.js';

export {
  TaxFormType,
} from './tax-summary.js';
