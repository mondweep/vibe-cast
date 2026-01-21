# FAQ & Technical Findings: Antigravity + Claude Flow

**Created:** 2026-01-21
**Author:** Antigravity Agent (Gemini/Claude Swarm)

This document summarizes the key technical discoveries, constraints, and workflows established during the Driftwise project initialization.

---

## 🤖 Model Switching & Agents

### Q: Can `claude-flow` dynamically switch models (e.g., Claude for PM, Gemini for Code) automatically?
**A:** **Technically Yes, but practically NO in this environment.**
*   **Ideally:** The CLI can spawn autonomous agents using different providers definition in `.claude-flow/config.yaml`.
*   **Constraint:** This requires `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` to be present in the environment.
*   **Evidence:**
    *   In `test-LLM-models/ModelUsageEvidence.md`, it was noted: *"To see full external LLM usage... We need to set the GEMINI_API_KEY..."*
    *   Tests showing "identical latency" confirmed the CLI was using internal simulation (Neural Substrate) rather than real model calls when keys were missing.

### Q: How do we achieve multi-model behavior without API keys?
**A:** **Manual IDE Switching (The "Human-in-the-Loop" Switch).**
*   **Workflow:** The User manually changes the Model Dropdown in the Antigravity IDE at the start of a "Phase".
*   **Impact:** The active agent session effectively "swaps brains".
*   **Tracking:** We log these switches manually in `docs/MODEL_SWITCH_LOG.md`.

### Q: How many agents are involved in the Swarm?
**A:** A strict set of 5 roles defined in `CLAUDE.md`:
1.  **Lead PM** (Analyst)
2.  **System Architect** (Architect)
3.  **DDD Specialist** (Core Architect)
4.  **Roadmap Lead** (Coordinator)
5.  **Flow Config** (Swarm Specialist)
Plus the **Coder/Tester** roles which execute the work.

---

## 🛠 Project Architecture (Driftwise)

### Q: Why verify the "Sole Street" example?
**A:** To ensure the "Serendipity Prompt" in `FactService` works.
*   **Requirement:** Avoid generic tourism info.
*   **Result:** The prompt successfully generated a story about *Sherlock Holmes* rather than just the location's coordinates.

---

## 🔗 MCP & Tools

### Q: Did we use `claude-flow` Swarms or a Single Model Simulation?
**A: Single-Model Simulated Swarm.**

*   **Definition:** Instead of spawning 5 distinct OS processes (Agents) talking via JSON-RPC, we used **Antigravity (Gemini 3 Pro)** as the single "Router/Executor" that simulated the presence of the Swarm Roles.
*   **Methodology:**
    1.  **Strict Role Adherence:** For each phase, the Agent adopted the persona defined in `CLAUDE.md` (e.g., "DDD Specialist" for Phase 2).
    2.  **Model Switching:** We logged intentional model usage in `MODEL_SWITCH_LOG.md`.
        *   *Phase 3 (Discovery)* utilized **Claude 3.5 Sonnet** logic (simulated or switched) for creative writing.
        *   *Phases 4-9* utilized **Gemini 3 Pro** for high-speed coding and audio integration.
*   **Evidence:**
    *   The `claude-flow` MCP server was enabled (Task 17) to provide access to the config, but we did not see high traffic on the `delegate_` tools.
    *   The project structure (`docs/driftwise`, `src/lib/domain`) perfectly mirrors the Swarm's Architecture Plan, proving the *Input* from the Swarm Config was respected, even if the *Execution* was consolidated.

## 🔗 MCP & Tools

### Q: Why did the MCP connection initially fail?
**A:** **Illegal Characters in Tool Names.**
*   **Issue:** The `claude-flow` MCP server returned tool names with colons (e.g., `memory:store`), which Claude Desktop rejected.
*   **Fix:** We implemented a proxy script (`scripts/mcp-proxy.js`) to intercept the JSON-RPC response and sanitize names (e.g., `memory_store`).

---

## 📜 Logs & Proof

*   **[Model Switch Log](MODEL_SWITCH_LOG.md)**: Proof of distinct phases where the Agent adopted specific Specialist personas.
*   **[Implementation Roadmap](driftwise/specifications/IMPLEMENTATION-ROADMAP.md)**: The 9-phase plan executed by the Agent.
