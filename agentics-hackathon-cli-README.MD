# Agentics Hackathon CLI Reference

This document details the capabilities and usage of the **Agentics Hackathon CLI** (`agentics-hackathon`), verified as of November 2025.

## 📦 Package Details
*   **Package Name:** `agentics-hackathon`
*   **Current Version:** `1.2.0`
*   **Registry:** npm (public)

## 🚀 Installation

We recommend running the CLI via `npx` to ensure you are always using the latest version without polluting your global namespace.

```bash
# Run directly
npx agentics-hackathon <command>

# Or install globally
npm install -g agentics-hackathon
```

## 🛠️ Command Reference

### `init`
Initializes a new hackathon project. This command is **interactive** and will guide you through:
*   Selecting a hackathon track.
*   Choosing a starter template (e.g., React, Python Agent, etc.).
*   Setting up your project configuration.

```bash
npx agentics-hackathon init
```

### `status`
Checks the current status of your project, including:
*   Verification of required files.
*   Submission readiness.
*   Connection to the hackathon platform.

```bash
npx agentics-hackathon status
```

### `tools`
Manages development tools specific to the hackathon. This can list, check, or install recommended utilities for building agentic AI.

```bash
npx agentics-hackathon tools
```

### `mcp`
Starts the **Model Context Protocol (MCP)** server.
*   **Purpose:** Allows your local AI agent (e.g., in Claude Desktop or an IDE) to communicate with the hackathon platform and your project context.
*   **Usage:** Essential for the "Agentic" part of the challenge.

```bash
npx agentics-hackathon mcp
```

### `discord` & `website`
Quick shortcuts to open the official community channels and resources.

```bash
npx agentics-hackathon discord
npx agentics-hackathon website
```

## 📝 Notes for Participants
*   **Interactive Mode:** Most commands are interactive. If you are scripting this in a CI/CD pipeline, check for non-interactive flags (usually `--yes` or `-y`).
*   **Updates:** The package is actively updated. Always check `npx agentics-hackathon --version` if you encounter issues.
