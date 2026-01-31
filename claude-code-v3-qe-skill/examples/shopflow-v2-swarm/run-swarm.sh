#!/bin/bash
# Run the swarm build for this project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/SWARM-PROMPT.md"

echo "Starting swarm build..."
echo "Project: $(basename "$SCRIPT_DIR")"
echo "Prompt: $PROMPT_FILE"
echo ""

# Option 1: Use claude-flow directly
if command -v npx &> /dev/null; then
    echo "Running with Claude Flow V3..."
    npx claude-flow swarm \
        --topology hierarchical-mesh \
        --max-agents 13 \
        --prompt "$(cat "$PROMPT_FILE")"
fi

# Option 2: Use Claude Code CLI with MCP
# Uncomment below if you prefer Claude Code CLI:
# claude --mcp-server aqe -p "$(cat "$PROMPT_FILE")"
