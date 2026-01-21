#!/usr/bin/env node
const { spawn } = require('child_process');

// Usage: node mcp-proxy.js <command> [args...]
const [, , command, ...args] = process.argv;

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
      try {
        const msg = JSON.parse(trimmed);

        // Intercept tools/list response to fix illegal characters
        if (msg.result && msg.result.tools) {
          msg.result.tools = msg.result.tools.map(tool => {
            // Replace colons and other illegal chars with underscores
            // Claude Desktop requires tool names to match ^[a-zA-Z0-9_-]{1,64}$
            tool.name = tool.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            return tool;
          });
          console.log(JSON.stringify(msg));
        } else {
          // Pass through other messages unchanged
          console.log(trimmed);
        }
      } catch (e) {
        // If JSON parse fails, just pass it through (shouldn't happen with valid JSON-RPC)
        console.log(trimmed);
      }
    }
    // Ignore [INFO], [WARN] logs
  }
});

child.on('close', (code) => process.exit(code));
