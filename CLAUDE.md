# Claude Flow Configuration

> **Note**: This file defines the behavior of the Agentic Swarm for this repository.

## 🧠 Swarm Topology
*   **Type**: `hierarchical-mesh`
*   **Max Agents**: 5
*   **Strategy**: `specialized`
*   **Consensus**: `raft` (Leader-based decision making)

## 🕵️‍♂️ Agent Roles

### 1. Product Manager (`lead-pm`)
*   **Focus**: Requirements, User Stories, README.
*   **Tools**: `read_file`, `write_to_file`
*   **Directive**: "Keep it simple. Focus on value for the driver."

### 2. System Architect (`system-architect`)
*   **Focus**: System Design, Security, AFD.
*   **Tools**: `view_file_outline`, `grep_search`
*   **Directive**: "Ensure separation of concerns. Thick client, thin backend."

### 3. Domain Expert (`ddd-specialist`)
*   **Focus**: Bounded Contexts, Data Models.
*   **Directive**: "Strict adherence to DDD. Define the Ubiquitous Language."

### 4. Roadmap Lead (`roadmap-lead`)
*   **Focus**: Timeline, Dependencies, Phasing.
*   **Directive**: "Iterative delivery. Get to 'Hello World' fast."

### 5. Flow Config (`flow-config`)
*   **Focus**: maintaining `CLAUDE.md`, `.mcp.json` and tool definitions.

## 🔄 Workflows

### New Feature Workflow (TDD)
1.  **PM** defines the User Story.
2.  **Architect** updates AFD/DDD.
3.  **TESTER (Role)**: Writes the failing test (Red).
4.  **CODER**: Writes the minimal code to pass the test (Green).
5.  **CODER**: Refactors for clarity and performance (Refactor).

### TDD Guidelines 🔴🟢🔵
*   **Red**: Always write a failing test first.
*   **Green**: Write only enough code to pass the test.
*   **Refactor**: Clean up the code without changing behavior.
*   **Coverage**: Aim for 100% unit coverage on Domain Logic.

### "Spawn Swarm" Command
To activate this swarm manually:
```bash
npx @claude-flow/cli@latest swarm init --topology hierarchical-mesh --max-agents 5
```
