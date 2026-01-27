#!/bin/bash

# Figma MCP Setup Script for /pix
# Run this script after getting your Figma Personal Access Token

echo "=== Figma MCP Setup for /pix ==="
echo ""
echo "This will configure the Figma MCP server for Claude Code."
echo ""

# Check if token is provided as argument
if [ -z "$1" ]; then
    echo "Please enter your Figma Personal Access Token:"
    echo "(Get it from Figma -> Settings -> Personal access tokens)"
    read -s FIGMA_TOKEN
else
    FIGMA_TOKEN=$1
fi

if [ -z "$FIGMA_TOKEN" ]; then
    echo "Error: No token provided. Exiting."
    exit 1
fi

echo ""
echo "Adding Figma MCP to Claude Code..."

# Add Figma MCP server using claude mcp add command
claude mcp add figma -- npx -y figma-developer-mcp --figma-api-key="$FIGMA_TOKEN" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Figma MCP configured successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Restart Claude Code to load the MCP server"
    echo "2. Start with: claude --dangerously-skip-permissions --chrome"
    echo "3. Navigate to pix-demo directory"
    echo "4. Run /pix and paste a Figma link"
else
    echo ""
    echo "⚠ Could not add via 'claude mcp add'."
    echo ""
    echo "Manual setup required. Add this to ~/.claude/settings.json under 'mcpServers':"
    echo ""
    echo '    "figma": {'
    echo '      "command": "npx",'
    echo '      "args": ["-y", "figma-developer-mcp", "--figma-api-key='$FIGMA_TOKEN'"]'
    echo '    }'
fi

echo ""
echo "=== Setup Complete ==="
