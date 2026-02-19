# Skillsmith MCP: Skill Discovery for AI Agents

> Understanding how Skillsmith can help find and create skills for our Microsoft integration challenges

## What Your Colleague Meant

Your colleague is referring to **Skillsmith** - a tool that:

1. **Indexes 20,000+ skills** from GitHub (including microsoft/skills) in a vector database
2. **Recommends skills** based on your project context using semantic search
3. **Can help write new skills** where gaps exist

This is exactly what we need given the gaps we identified in microsoft/skills for Graph, D365, BC, etc.

---

## What is Skillsmith?

**Skillsmith** is an MCP (Model Context Protocol) server that acts as a **skill discovery and management system** for AI coding agents.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOW SKILLSMITH WORKS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Your Project (e.g., D365 + BC integration)                            │
│              │                                                          │
│              ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Skillsmith MCP Server                         │   │
│  │                                                                  │   │
│  │  1. Analyzes your project context                               │   │
│  │  2. Searches 20,000+ indexed skills (vector DB)                 │   │
│  │  3. Recommends relevant skills                                  │   │
│  │  4. Helps create new skills for gaps                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│              │                                                          │
│              ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Skill Sources (Indexed)                                        │   │
│  │  ├── microsoft/skills (130+ Azure/M365 skills)                  │   │
│  │  ├── Community skills from GitHub                               │   │
│  │  └── Verified/curated skills                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## How to Set It Up

### Step 1: Add Skillsmith MCP to Claude Code

Add this to your Claude Code MCP settings (`.claude/settings.json` or via CLI):

```json
{
  "mcpServers": {
    "skillsmith": {
      "command": "npx",
      "args": ["-y", "@skillsmith/mcp-server"]
    }
  }
}
```

Or via Claude Code CLI:
```bash
claude mcp add skillsmith npx -y @skillsmith/mcp-server
```

### Step 2: Restart Claude Code

After adding the MCP server, restart Claude Code for the changes to take effect.

### Step 3: Use Skillsmith Tools

Once configured, you can ask Claude Code to:

```
"Search for Microsoft Graph skills"
"Recommend skills for this project"
"Find skills for Dynamics 365 integration"
"Show me Business Central API skills"
```

---

## Skillsmith MCP Tools

| Tool | What It Does |
|------|--------------|
| `search` | Search skills using semantic search (not just keywords) |
| `recommend` | Get contextual recommendations based on your open project |
| `get_skill` | Get detailed information about a specific skill |
| `install_skill` | Install a skill to `~/.claude/skills/` |
| `uninstall_skill` | Remove an installed skill |
| `validate` | Check a skill's quality and structure |
| `compare` | Compare multiple skills side-by-side |

---

## How This Helps Our Problems

### Scenario 1: Finding Existing Skills

Open your vibe-cast repository in Claude Code, then ask:

```
"Search for skills related to Microsoft Graph API"
```

Skillsmith will:
1. Understand "Microsoft Graph API" semantically
2. Search its vector database of 20,000+ skills
3. Return relevant skills (including from microsoft/skills and community)
4. Show quality scores and trust levels

### Scenario 2: Getting Project-Specific Recommendations

With your integration project open:

```
"Recommend skills for this project"
```

Skillsmith will:
1. Analyze your project files (package.json, imports, etc.)
2. Understand you're working with Microsoft integrations
3. Recommend relevant skills like:
   - `azure-identity-py` for authentication
   - `m365-agents-py` for Teams integration
   - `mcp-builder` for creating custom tools

### Scenario 3: Finding or Creating Missing Skills

```
"Find skills for Business Central API integration"
```

If Skillsmith doesn't find good matches:

```
"Help me create a skill for Business Central API"
```

Skillsmith can guide you through creating a new SKILL.md file following best practices.

---

## Practical Example: Our Integration Project

### Step 1: Search for What Exists

```
User: "Search for skills related to Dynamics 365 Dataverse"

Skillsmith Response:
┌─────────────────────────────────────────────────────────────────┐
│ Search Results: "Dynamics 365 Dataverse"                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. azure-identity-py (microsoft/skills)                         │
│    Score: 92 | Trust: Official                                  │
│    Relevance: Authentication for Dataverse                      │
│                                                                 │
│ 2. m365-agents-py (microsoft/skills)                            │
│    Score: 88 | Trust: Official                                  │
│    Relevance: M365 agent patterns                               │
│                                                                 │
│ 3. community/dynamics-crm-helper                                │
│    Score: 71 | Trust: Community                                 │
│    Relevance: Dataverse API patterns                            │
│                                                                 │
│ No direct Dataverse SDK skill found - consider creating one     │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Get Details on Promising Skills

```
User: "Get details for azure-identity-py"

Skillsmith Response:
┌─────────────────────────────────────────────────────────────────┐
│ Skill: azure-identity-py                                        │
├─────────────────────────────────────────────────────────────────┤
│ Source: microsoft/skills                                        │
│ Trust: Official                                                 │
│ Quality Score: 92/100                                           │
│                                                                 │
│ Description: Authentication for Azure services using            │
│ DefaultAzureCredential, managed identity, service principals.   │
│                                                                 │
│ Useful for:                                                     │
│ - Authenticating to Microsoft Graph                             │
│ - Authenticating to Dynamics 365 / Dataverse                    │
│ - Authenticating to Business Central                            │
│ - Authenticating to Azure services                              │
│                                                                 │
│ Install: npx skills install microsoft/azure-identity-py         │
└─────────────────────────────────────────────────────────────────┘
```

### Step 3: Install Useful Skills

```
User: "Install azure-identity-py and mcp-builder skills"

Skillsmith Response:
✓ Installed azure-identity-py to ~/.claude/skills/
✓ Installed mcp-builder to ~/.claude/skills/

These skills are now available to Claude Code for this project.
```

### Step 4: Create Missing Skills

```
User: "Help me create a skill for Microsoft Graph API"

Skillsmith Response:
I'll help you create a SKILL.md for Microsoft Graph. Based on
your project, here's a template:

---
name: msgraph-py
description: |
  Microsoft Graph API patterns for Python. Access M365 data
  including emails, calendar, files, SharePoint, and users.
  Triggers: "Microsoft Graph", "Graph API", "/me", "msgraph"
---

# Microsoft Graph API (Python)

## Installation
```bash
pip install msgraph-sdk azure-identity
```

## Authentication
[Code patterns...]

## Common Operations
[Code patterns...]

Would you like me to complete this skill with patterns from
your project's existing code?
```

---

## The Value for Our Problems

### What Skillsmith Solves

| Our Challenge | How Skillsmith Helps |
|---------------|---------------------|
| Finding relevant skills | Semantic search across 20,000+ skills |
| Gaps in microsoft/skills | Identifies gaps and helps create new skills |
| Learning best practices | Skills contain proven patterns and examples |
| Context-aware recommendations | Analyzes your project to suggest relevant skills |
| Quality assurance | Trust tiers and quality scores |

### What We'd Get from Skillsmith

1. **Immediate:** Find existing skills for Azure Identity, MCP Builder, Azure Search
2. **Discovery:** Find community skills for Graph/D365 that might exist outside microsoft/skills
3. **Creation:** Guidance to create our own skills for BC, D365, SharePoint
4. **Management:** Install/uninstall skills as needed per project

---

## Comparison: Manual vs Skillsmith

### Manual Approach (What We Did Earlier)

```
1. Go to github.com/microsoft/skills
2. Manually browse 130+ skills
3. Read READMEs to understand each
4. Identify gaps (no Graph, D365, BC skills)
5. Decide to build custom MCP servers
```

### Skillsmith Approach

```
1. Open project in Claude Code with Skillsmith MCP
2. Ask: "Recommend skills for Microsoft integration"
3. Skillsmith searches 20,000+ skills semantically
4. Get ranked results with quality scores
5. Install with one command
6. For gaps, Skillsmith helps create new skills
```

---

## Setting Up for Our Project

### 1. Add Skillsmith MCP

```bash
# In your terminal
claude mcp add skillsmith npx -y @skillsmith/mcp-server
```

### 2. Open Your Project

```bash
cd /Users/mondweep/DxSure2/CoPilot-tinker
claude
```

### 3. Ask for Recommendations

Once in Claude Code:

```
"Recommend skills for this Microsoft integration documentation project"
```

### 4. Search for Specific Needs

```
"Search for skills: Microsoft Graph SharePoint"
"Search for skills: Business Central API"
"Search for skills: Dynamics 365 Dataverse"
"Search for skills: MCP server builder"
```

### 5. Create Missing Skills

```
"Help me create a skill for Microsoft Graph API based on
the patterns in microsoft-graph-api-guide.md"
```

---

## Key Benefits for Your Work

### 1. Time Savings
Instead of manually searching GitHub, Skillsmith's semantic search finds relevant skills instantly.

### 2. Quality Assurance
Skills are scored (0-100) based on documentation, tests, and maintenance. Trust tiers (Official, Verified, Community) help assess reliability.

### 3. Project Context
Skillsmith analyzes your open project to recommend skills that match your tech stack.

### 4. Skill Creation Guidance
When gaps exist, Skillsmith helps you create properly structured skills following best practices.

### 5. Ecosystem Coverage
Searches beyond microsoft/skills to find community contributions that might fill gaps.

---

## Next Steps

1. **Install Skillsmith MCP** in your Claude Code setup
2. **Open your project** and ask for recommendations
3. **Search** for skills related to our problem areas
4. **Install** useful skills (azure-identity, mcp-builder)
5. **Create** new skills for gaps (Graph, BC, D365)
6. **Contribute** created skills back to the community

---

## Resources

- **Skillsmith Website:** https://skillsmith.app
- **Skillsmith GitHub:** https://github.com/smith-horn/skillsmith
- **Microsoft Skills:** https://github.com/microsoft/skills
- **MCP Protocol:** https://modelcontextprotocol.io

---

*Guide created: February 2026*
