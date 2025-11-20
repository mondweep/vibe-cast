# Agentic Accounting System Implementation Plan

## Goal
Create a functional "Agentic Accounting System" demo within the `vibe-cast` repository, leveraging the capabilities found in `neural-trader`'s `agentic-accounting-core`.

The system will:
1.  **Process Natural Language**: Use an AI agent to parse unstructured transaction descriptions (e.g., "Bought 1.5 BTC at $45k").
2.  **Perform Accounting**: Use the ported `agentic-accounting-core` logic to calculate tax lots and cost basis.
3.  **Report**: Generate a simple financial report.

## User Review Required
> [!IMPORTANT]
> This plan involves copying code from the `neural-trader` repository (specifically `packages/core`) into `vibe-cast` to simulate a "fork" or "usage" of the capability.

## Proposed Changes

### `vibe-cast` Repository

#### [NEW] `agentic-accounting/`
Create a new directory to house the system.

#### [NEW] `agentic-accounting/core/`
Port the `agentic-accounting-core` logic from `neural-trader`.
- Copy `src/` (DecimalMath, types, etc.)
- Copy `package.json` (adjust dependencies if needed)

#### [NEW] `agentic-accounting/agent.ts`
Create a simple `AccountantAgent` that:
- Accepts natural language input.
- Uses a mock LLM (or real if configured) to extract `Transaction` objects.
- Calls `core` functions to process them.

#### [NEW] `agentic-accounting/demo.ts`
A script to demonstrate the workflow:
1.  Initialize Agent.
2.  Feed it a list of natural language trades.
3.  Agent converts them to structured data.
4.  Core calculates FIFO/LIFO results.
5.  Print Report.

## Verification Plan

### Automated Tests
- Run `npm test` in the ported `core` directory (if tests are copied).
- Run `ts-node agentic-accounting/demo.ts` and verify output matches expected tax calculations.

### Manual Verification
- Execute the demo script and check if "Bought 1.5 BTC" results in a correct Tax Lot creation.

## Enhancements (Phase 2)

### Goal
Extend the system to support multiple accounting methods (FIFO, LIFO, HIFO) and generate comparative reports.

### Proposed Changes
#### [NEW] `agentic-accounting/engine.ts`
Create an `AccountingEngine` class that:
- Manages a pool of `TaxLot`s.
- Implements `processTransaction(tx, method)`.
- Supports FIFO, LIFO, HIFO lot selection strategies.

#### [MODIFY] `agentic-accounting/demo.ts`
Update to:
- Run the same set of transactions through FIFO, LIFO, and HIFO.
- Print a comparative table of Realized Gains.

#### [NEW] `agentic-accounting/report.md`
Output of the demo script saved to a file.

