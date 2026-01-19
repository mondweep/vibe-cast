# How to Integarte Claude Flow into Google Antigravity

This guide explains how to enable **Claude Flow**—an agent orchestration framework—within **Antigravity**, Google's advanced coding agent.

Antigravity supports the **Model Context Protocol (MCP)**, and essentially "reads" the standard configuration file used by other tools (like Claude Desktop) to discover available tools. By adding Claude Flow as an MCP server, we give Antigravity access to its capabilities.

## The Concept

We are not using Anthropic's models here. Instead, we are using **Google's Antigravity models** to drive the orchestration. Antigravity acts as the "brain," and `claude-flow` acts as the "toolbelt" (providing structure for swarms, memory, and workflows).

## Step 1: Create the Proxy Script

The `claude-flow` CLI logs information to `stdout`, which interferes with the strict JSON-RPC protocol required by MCP. We need a proxy to filter this.

Create `mcp-proxy.js`:

```javascript
#!/usr/bin/env node
const { spawn } = require('child_process');

// Usage: node mcp-proxy.js <command> [args...]
const [,, command, ...args] = process.argv;

if (!command) {
  process.exit(1);
}

const child = spawn(command, args, {
  stdio: ['inherit', 'pipe', 'inherit'], 
  shell: false
});

let buffer = '';

child.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); 

  for (const line of lines) {
    const trimmed = line.trim();
    // Only pass through valid JSON (MCP protocol)
    if (trimmed.startsWith('{')) {
      console.log(line);
    }
    // Ignore [INFO], [WARN] logs
  }
});

child.on('close', (code) => process.exit(code));
```

## Step 2: Update Configuration

Antigravity respects the standard MCP configuration file location.
Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the server definition using **absolute paths**:

```json
{
  "mcpServers": {
    "claude-flow": {
      "command": "/ABSOLUTE/PATH/TO/node",
      "args": [
        "/ABSOLUTE/PATH/TO/scripts/mcp-proxy.js",
        "/ABSOLUTE/PATH/TO/npx",
        "-y",
        "@claude-flow/cli@latest",
        "mcp",
        "start"
      ]
    }
  }
}
```

## Step 3: Usage in Antigravity

Once configured, Antigravity detects the `claude-flow` tools automatically.

You can now ask Antigravity:
> *"Use the Claude Flow tools to initialize a swarm and plan a new project."*

Antigravity (Google's Model) will:
1.  Call `swam/init` to set up the structure.
2.  Call `agent/spawn` to define roles.
3.  **Execute the actual work** itself (writing code, creating files) while using the Flow framework to maintain state or organizational structure.
