# Getting Started with Claude Flow in Antigravity

This guide provides instructions on how to replicate the **Claude Flow V3** integration within **Google Antigravity**, enabling a "Hybrid Swarm" architecture that leverages multiple AI models (Anthropic, Gemini, Ollama) directly from your coding environment.

## 📂 Project Structure

We have included three key directories in this branch (`claude-flow-with-antigravity`) to help you get started:

1.  **`test-claude-flow-in-antigravity/`**:
    *   Contains the core **Course Material** and **Guide**.
    *   **Start Here:** Read `CLAUDE_FLOW_ANTIGRAVITY_COURSE.md` for a deep dive into the architecture.
    *   Includes the critical `mcp-proxy.js` script required to bridge Antigravity's MCP client with the Claude Flow CLI.

2.  **`test-LLM-models/`**:
    *   A proof-of-concept workspace demonstrating how to switch between models.
    *   Check `.swarm` for agent configurations.
    *   See `ModelUsageEvidence.md` for verified output from different providers.

3.  **`test-hybrid-models/`**:
    *   Advanced configuration examples for running specialized agents (e.g., Gemini for reasoning, Llama for coding).
    *   Contains `HybridSwarmLog.md` showing a live execution log of a multi-agent swarm.

## 🚀 Quick Start Guide

### Prerequisites
*   **Node.js** (v20 or higher)
*   **Google Antigravity** (Claude Desktop Environment) installed.
*   **Claude Flow CLI**: Install globally or use via `npx`.
    ```bash
    npm install -g @claude-flow/cli
    ```

### Step 1: Configure Antigravity (MCP)

To let Antigravity control the swarm, you need to register the Claude Flow MCP server.

1.  Locate your `claude_desktop_config.json` (usually in `~/Library/Application Support/Claude/`).
2.  Add the following entry. **IMPORTANT:** Update the paths to match your system!

    ```json
    {
      "mcpServers": {
        "claude-flow": {
          "command": "/usr/local/bin/node", 
          "args": [
            "/ABSOLUTE/PATH/TO/test-claude-flow-in-antigravity/mcp-proxy.js",
            "/usr/local/bin/npx",
            "-y",
            "@claude-flow/cli@latest",
            "mcp",
            "start"
          ]
        }
      }
    }
    ```
    *Note: The `mcp-proxy.js` script is found in the `test-claude-flow-in-antigravity` folder of this repo.*

### Step 2: Initialize a Swarm

Open Antigravity and verify the connection (you should see the 🔌 icon). Then, you can issue natural language commands:

> "Initialize a hierarchical swarm with 3 agents: An Architect (using Gemini), a Coder (using Claude 3.5), and a Tester (using Llama 3)."

### Step 3: Managing Providers

You can configure which models are available to your swarm using the CLI tools included in the dependencies.

**List Providers:**
```bash
npx @claude-flow/cli config providers
```

**Enable a Local Model (Ollama):**
```bash
npx @claude-flow/cli config providers --enable ollama --model llama3
```

## 🛠 Troubleshooting

*   **MCP Connection Failed:** basic stdout logs often break the JSON-RPC protocol. Ensure you are using the `mcp-proxy.js` wrapper.
*   **Model Not Found:** Verify you have the API keys set in your environment (`ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`) or in the `~/.claude-flow/config.yaml` file.

## 🔗 Resources

*   [Claude Flow Documentation](https://claudeflow.ai) (Fake URL for context)
*   [Antigravity MCP Guide](https://modelcontextprotocol.io)

---
*Created by the Antigravity Team*
