# Pix Demo Project

A sample React + Tailwind project set up for learning the `/pix` Figma-to-code workflow.

## Prerequisites

Before using `/pix`, you need:

1. **Claude Code** v2.0.73+ with `--chrome` flag
2. **Claude in Chrome** extension v1.0.36+ - [Install here](https://claude.com/chrome)
3. **Figma MCP** configured (see below)
4. **Paid Claude plan** (Pro, Team, or Enterprise)

## Setup Figma MCP

### Step 1: Get Your Figma Personal Access Token

1. Open [Figma](https://figma.com) and log in
2. Click your **profile icon** (top-right) → **Settings**
3. Scroll down to **Personal access tokens**
4. Click **Generate new token**
5. Give it a name like "Claude Code"
6. **Copy the token** (it won't be shown again!)

### Step 2: Configure Figma MCP

**Option A: Use the setup script**
```bash
./setup-figma-mcp.sh YOUR_FIGMA_TOKEN
```

**Option B: Manual configuration**

Add Figma MCP to Claude Code:
```bash
claude mcp add figma -- npx -y figma-developer-mcp --figma-api-key="YOUR_TOKEN"
```

Or manually edit `~/.claude/settings.json` and add under `mcpServers`:
```json
"figma": {
  "command": "npx",
  "args": ["-y", "figma-developer-mcp", "--figma-api-key=YOUR_TOKEN"]
}
```

### Step 3: Install Chrome Extension

1. Install the Claude Chrome extension from [claude.com/chrome](https://claude.com/chrome)
2. Make sure it's enabled and connected

## Using /pix

### Start Claude Code with Chrome
```bash
cd pix-demo
claude --dangerously-skip-permissions --chrome
```

### Run the pix command
```
/pix
```

### Workflow

1. **Paste a Figma link** when prompted (use "Copy link to selection" in Figma)
2. **Watch** as Claude:
   - Detects your stack (Vite + React + Tailwind)
   - Extracts design tokens from Figma
   - Implements the component
   - Takes screenshots of both Figma and your app
   - Compares them pixel-by-pixel
   - Auto-fixes any discrepancies
3. **Review** the final result

## Project Stack

- **Vite** - Build tool
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling (with @theme tokens)
- **Lucide React** - Icon library

## Sample Figma Designs

To test `/pix`, you can use:
- Any Figma community template
- Your own Figma designs
- Sample UI component libraries in Figma

Just copy the link to any selection and paste it when `/pix` asks!

## Troubleshooting

### MCP not connecting
- Restart Claude Code after adding the MCP
- Check that your Figma token is valid
- Run `/mcp` to see available MCP tools

### Chrome extension not detected
- Make sure the extension is installed and enabled
- Try restarting Chrome
- Ensure you're using `--chrome` flag

### Dev server issues
- Make sure port 5173 is available
- Run `npm run dev` manually to check for errors

## Learn More

- [Pix Plugin Repository](https://github.com/skobak/pix)
- [Figma MCP Setup Guide](https://help.figma.com/hc/en-us/articles/32132100833559)
- [Claude Code Documentation](https://claude.ai/code)
