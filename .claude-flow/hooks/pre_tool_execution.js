#!/usr/bin/env node
/**
 * Claude Flow Hook: pre-tool-execution
 * 
 * This hook runs before any tool is executed by the swarm. 
 * We use it to log the current activity to the MODEL_SWITCH_LOG.
 */
const fs = require('fs');
const path = require('path');

// Usage: node hook.js <event_payload_json_string>
// Payload: { tool, args, agentId, timestamp }
const payloadArg = process.argv[2];

if (!payloadArg) {
    process.exit(0);
}

try {
    //   const payload = JSON.parse(payloadArg);
    const logPath = path.resolve(process.cwd(), 'docs/MODEL_SWITCH_LOG.md');

    // We can't actually detect the *Model* here because that's on the client side (Antigravity).
    // But we can log that an action was taken.
    // const entry = `| ${new Date().toISOString()} | Hook | Tool Call | ${payload.tool} | - | Auto-logged by Hook |\n`;

    // fs.appendFileSync(logPath, entry);

} catch (e) {
    // Silent fail
}
