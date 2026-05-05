// DeFi Learning Knowledge Graph Ontology
// Defines entities and relationships for structured knowledge

export type NodeType =
  | "Protocol"      // DeFi protocol (Uniswap, Aave, Curve)
  | "Concept"       // Core concept (AMM, Slippage, Impermanent Loss)
  | "Strategy"      // Trading/LP strategy (Yield farming, Hedging)
  | "Token"         // ERC-20 token or asset class
  | "Risk"          // Risk type (Smart contract, Liquidity, Oracle)
  | "Metric"        // Key metric (APY, TVL, Sharpe Ratio)
  | "Phase"         // Learning phase (Week 1-2, 3-4, etc)
  | "Skill";        // Learnable skill (Reading code, Risk calc)

export type RelationType =
  | "ENABLES"           // A enables understanding of B
  | "USES"              // A protocol uses B concept
  | "MITIGATES"         // A mitigates risk B
  | "REQUIRES"          // A requires prerequisite B
  | "COMPARED_TO"       // A compared to B
  | "PART_OF"           // A is component of B
  | "MEASURED_BY"       // A is measured by metric B
  | "EXAMPLE_OF"        // A is example of B
  | "IMPROVES_YIELD"    // A improves yield metric B
  | "INCREASES_RISK";   // A increases risk B

export interface KGNode {
  label: string;
  type: NodeType;
  description: string;
  phase_ids: string[];
  properties?: Record<string, unknown>;
}

export interface KGEdge {
  from: string;
  to: string;
  relation: RelationType;
  weight?: number;
}

// ── DeFi NODES ────────────────────────────────────────────────
export const DEFI_NODES: KGNode[] = [
  // Protocols
  { label: "Uniswap", type: "Protocol", description: "Decentralized exchange using Automated Market Maker (AMM) model", phase_ids: ["1", "2", "3"] },
  { label: "Aave", type: "Protocol", description: "Lending protocol allowing deposits and borrowing with variable/stable rates", phase_ids: ["1", "2", "3"] },
  { label: "Curve", type: "Protocol", description: "Stablecoin-focused DEX optimized for low-slippage trades", phase_ids: ["2", "3"] },
  { label: "Balancer", type: "Protocol", description: "AMM with customizable pool weights for algorithmic portfolio management", phase_ids: ["2", "3"] },
  { label: "Compound", type: "Protocol", description: "Lending protocol with autonomous interest rate protocol (AIR)", phase_ids: ["1", "2"] },
  { label: "Lido", type: "Protocol", description: "Liquid staking derivative protocol enabling staking while maintaining capital mobility", phase_ids: ["2", "4"] },

  // Core Concepts
  { label: "Automated Market Maker", type: "Concept", description: "Exchange mechanism using liquidity pools and constant product formula", phase_ids: ["1", "2"] },
  { label: "Liquidity Pool", type: "Concept", description: "Smart contract holding paired tokens for trading with algorithmic pricing", phase_ids: ["1", "2"] },
  { label: "Slippage", type: "Concept", description: "Price difference between expected and actual execution price due to pool impact", phase_ids: ["1", "2"] },
  { label: "Impermanent Loss", type: "Concept", description: "Temporary loss of LP capital due to price divergence from entry point", phase_ids: ["2", "3"] },
  { label: "Yield Farming", type: "Concept", description: "Staking LP tokens or assets to earn protocol rewards and trading fees", phase_ids: ["2", "3"] },
  { label: "Flash Loan", type: "Concept", description: "Uncollateralized loan that must be repaid within same transaction block", phase_ids: ["3", "4"] },
  { label: "Arbitrage", type: "Concept", description: "Exploiting price differences across venues for risk-free profit", phase_ids: ["2", "3"] },
  { label: "Gas Optimization", type: "Concept", description: "Techniques to reduce computational cost of transactions on blockchain", phase_ids: ["3", "4"] },
  { label: "MEV", type: "Concept", description: "Miner/validator extractable value from transaction ordering and inclusion", phase_ids: ["3", "4"] },
  { label: "Oracle Problem", type: "Concept", description: "Challenge of bringing real-world price data onto-chain securely", phase_ids: ["2", "3"] },

  // Strategies
  { label: "Stable LP Strategy", type: "Strategy", description: "Providing liquidity for stablecoin pairs to capture fees with minimal IL", phase_ids: ["2", "3"] },
  { label: "Concentrated Liquidity", type: "Strategy", description: "Deploying capital in tight price ranges to maximize fee generation", phase_ids: ["3", "4"] },
  { label: "Leveraged Farming", type: "Strategy", description: "Using borrowed capital to increase yield but with liquidation risk", phase_ids: ["3", "4"] },
  { label: "Hedging Strategy", type: "Strategy", description: "Using derivatives or options to protect against downside risk", phase_ids: ["3", "4"] },

  // Risk Types
  { label: "Smart Contract Risk", type: "Risk", description: "Bugs or vulnerabilities in protocol code leading to loss of funds", phase_ids: ["1", "3"] },
  { label: "Liquidation Risk", type: "Risk", description: "Risk of collateral being liquidated if loan-to-value falls below threshold", phase_ids: ["2", "3"] },
  { label: "Oracle Risk", type: "Risk", description: "Outdated or manipulated price feeds leading to incorrect protocol behavior", phase_ids: ["2", "3"] },
  { label: "Liquidity Risk", type: "Risk", description: "Inability to exit position quickly without significant price impact", phase_ids: ["2", "3"] },
  { label: "Governance Risk", type: "Risk", description: "Harm from token holder voting decisions or governance takeover", phase_ids: ["3", "4"] },

  // Metrics
  { label: "APY", type: "Metric", description: "Annual Percentage Yield accounting for compounding effects", phase_ids: ["1", "2"] },
  { label: "TVL", type: "Metric", description: "Total Value Locked - aggregate value of assets in a protocol", phase_ids: ["1", "2"] },
  { label: "Sharpe Ratio", type: "Metric", description: "Risk-adjusted return metric comparing return to volatility", phase_ids: ["3", "4"] },

  // Learning Phases
  { label: "Phase 1", type: "Phase", description: "Foundation - Core DeFi concepts and protocol mechanics", phase_ids: ["1"] },
  { label: "Phase 2", type: "Phase", description: "Intermediate - Yield strategies and risk management", phase_ids: ["2"] },
  { label: "Phase 3", type: "Phase", description: "Advanced - Complex strategies and smart contract analysis", phase_ids: ["3"] },
  { label: "Phase 4", type: "Phase", description: "Mastery - Portfolio management and thought leadership", phase_ids: ["4"] },
];

// ── EDGES: Relationships ──────────────────────────────────────
export const DEFI_EDGES: KGEdge[] = [
  // Protocols use concepts
  { from: "Uniswap", to: "Automated Market Maker", relation: "USES", weight: 1 },
  { from: "Uniswap", to: "Liquidity Pool", relation: "USES", weight: 1 },
  { from: "Aave", to: "Liquidation Risk", relation: "INCREASES_RISK", weight: 1 },
  { from: "Curve", to: "Stable LP Strategy", relation: "EXAMPLE_OF", weight: 1 },

  // Concepts enable learning
  { from: "Automated Market Maker", to: "Slippage", relation: "ENABLES", weight: 0.9 },
  { from: "Liquidity Pool", to: "Impermanent Loss", relation: "ENABLES", weight: 0.9 },
  { from: "Flash Loan", to: "Arbitrage", relation: "ENABLES", weight: 0.8 },

  // Strategies require concepts
  { from: "Stable LP Strategy", to: "Liquidity Pool", relation: "REQUIRES", weight: 1 },
  { from: "Yield Farming", to: "APY", relation: "MEASURED_BY", weight: 1 },
  { from: "Concentrated Liquidity", to: "Impermanent Loss", relation: "MITIGATES", weight: 0.7 },

  // Risk relationships
  { from: "Leveraged Farming", to: "Liquidation Risk", relation: "INCREASES_RISK", weight: 1 },
  { from: "Aave", to: "Oracle Risk", relation: "INCREASES_RISK", weight: 0.6 },

  // Phase progression
  { from: "Phase 1", to: "Phase 2", relation: "REQUIRES", weight: 1 },
  { from: "Phase 2", to: "Phase 3", relation: "REQUIRES", weight: 1 },
  { from: "Phase 3", to: "Phase 4", relation: "REQUIRES", weight: 1 },
];

// ── Helper: Find related nodes by type or relation
export function getRelatedNodes(
  nodeLabel: string,
  relationTypes?: RelationType[]
): KGNode[] {
  const relatedLabels = DEFI_EDGES
    .filter(e => e.from === nodeLabel && (!relationTypes || relationTypes.includes(e.relation)))
    .map(e => e.to);

  return DEFI_NODES.filter(n => relatedLabels.includes(n.label));
}

export function getNodesByType(type: NodeType): KGNode[] {
  return DEFI_NODES.filter(n => n.type === type);
}
