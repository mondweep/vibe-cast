# Vibe Cast - Agentic Accounting System

This repository contains an **Agentic Accounting System** capable of processing natural language financial transactions and performing advanced accounting calculations (FIFO, LIFO, HIFO).

It was built by porting the core accounting logic from the `neural-trader` project and wrapping it in an agentic interface.

## 🚀 Features

- **Natural Language Processing**: Parses unstructured text (e.g., "Bought 1.5 BTC at 45000") into structured transactions.
- **Multi-Method Accounting**: Supports **FIFO** (First-In, First-Out), **LIFO** (Last-In, First-Out), and **HIFO** (Highest-In, First-Out).
- **High Precision**: Uses `decimal.js` for accurate financial arithmetic, avoiding floating-point errors.
- **Tax Lot Tracking**: Maintains detailed records of tax lots, cost basis, and realized gains.

## 📂 Project Structure

- `agentic-accounting/`
    - `agent.ts`: **AccountantAgent** - Parses natural language input.
    - `engine.ts`: **AccountingEngine** - Manages tax lots and calculates gains.
    - `demo.ts`: **Demo Script** - Runs a comparative analysis of accounting methods.
    - `core/`: Ported logic from `neural-trader` (Types, Utils, DecimalMath).
- `docs/`: Project documentation and artifacts.
    - `task.md`: Original task list.
    - `implementation_plan.md`: Detailed plan of the work.
    - `walkthrough.md`: Results and verification of the system.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/mondweep/vibe-cast.git
    cd vibe-cast
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Demo

Run the demo script to see the agent parse transactions and compare accounting methods:

```bash
npx tsx agentic-accounting/demo.ts
```

**Expected Output:**

```text
🤖 Agentic Accounting System Demo (Phase 2)
===========================================

📝 Processing Natural Language Input:
Bought 1.0 BTC at 40000
    Bought 0.5 BTC at 42000
    Bought 0.5 BTC at 38000
    Sold 0.8 BTC at 45000

...

📊 Comparative Analysis:
--------------------------------------------------
| Method | Realized Gain | Ending Balance | Note   |
|--------|---------------|----------------|--------|
| FIFO   | $4000.00      | 1.2000         | Sells oldest (40k) |
| LIFO   | $4400.00      | 1.2000         | Sells newest (38k) |
| HIFO   | $3000.00      | 1.2000         | Sells highest (42k+40k) |
--------------------------------------------------
```

## 📚 Documentation

For more details on the development process, check the `docs/` folder:
- [Implementation Plan](docs/implementation_plan.md)
- [Walkthrough & Verification](docs/walkthrough.md)
