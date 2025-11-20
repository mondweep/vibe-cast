/**
 * Change record for audit trail
 */
export interface Change {
  /** Field that was changed */
  field: string;

  /** Value before change */
  before: unknown;

  /** Value after change */
  after: unknown;
}

/**
 * Audit entry model for immutable logging
 */
export interface AuditEntry {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Event timestamp */
  timestamp: Date;

  /** ID of the acting agent */
  agentId: string;

  /** Role/type of the agent */
  agentType: string;

  /** Action performed */
  action: string;

  /** Type of entity affected (e.g., 'Transaction', 'TaxLot') */
  entityType: string;

  /** ID of affected entity */
  entityId: string;

  /** Before/after values for all changes */
  changes: Change[];

  /** Rationale for the decision/action */
  reason: string;

  /** SHA-256 hash of entry content */
  hash: string;

  /** Ed25519 signature for verification */
  signature: string;

  /** Previous entry hash for blockchain-like chaining */
  previousHash?: string;

  /** Merkle tree root for batch verification */
  merkleRoot?: string;

  /** Additional context metadata */
  metadata: Record<string, unknown>;
}
