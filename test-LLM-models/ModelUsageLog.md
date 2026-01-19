# Model Usage Log

This document tracks the LLM models used during the `test-LLM-models` swarm experiment.

## Configuration
We explicitly configured the `claude-flow` runtime to prioritize **Google Gemini** over Anthropic's Claude.

**File:** `.claude-flow/config.yaml`
```yaml
providers:
  gemini:
    enabled: true
    model: gemini-2.0-flash
    priority: 1
  anthropic:
    enabled: true
    model: claude-3-5-sonnet-20241022
    priority: 2
  ollama:
    enabled: true
    model: llama3
    priority: 3
```

## Agent Execution Log

| Agent ID | Type | Task | Model Used (Orchestrator) | Status |
| :--- | :--- | :--- | :--- | :--- |
| `agent-1768688579491` | **Coder** | Create `index.html` | **Google (Antigravity)** | ✅ Completed |
| `swarm-1768688578588` | **Coordinator** | Init & Spawn | **Google (Antigravity)** | ✅ Completed |

## Observations

1.  **Antigravity as the Brain**: While the `claude-flow` CLI provides the structure (Agent IDs, database paths), the actual *intelligence* used to generate the HTML code came from the **Antigravity session** itself (powered by Google's models), which acted as the execution engine for the "Coder Agent".
2.  **Tool Abstraction**: The CLI acted as a state manager, tracking the existence of "Coder Agent `mkivii77`", but delegated the cognitive load to the primary active LLM session.
3.  **Cross-Ecosystem Proof**: We successfully used an Anthropic-ecosystem tool (`claude-flow`) driven entirely by Google's models to build code.
