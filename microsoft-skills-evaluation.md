# Microsoft Skills Repository Evaluation

> Evaluating how [microsoft/skills](https://github.com/microsoft/skills) can help solve the integration problems we've explored

## What is microsoft/skills?

**Microsoft Skills** is a repository of **130+ domain-specific knowledge files** designed to enhance AI coding agents (like GitHub Copilot, Claude, etc.) when working with Azure SDKs and Microsoft services.

**Key Concept:** These are not traditional APIs or libraries - they are **context files** that teach AI agents about SDK patterns, best practices, and implementation approaches.

```
Skills = Knowledge files that make AI agents smarter about specific domains
```

---

## Relevance to Our Problems

### Quick Assessment

| Our Problem Area | Relevant Skills | Applicability |
|------------------|-----------------|---------------|
| Microsoft Graph integration | `m365-agents-py/ts/dotnet` | **Medium** - Agents SDK, not Graph directly |
| Business Central API | None available | **None** - Gap in the repository |
| Dynamics 365 / Dataverse | None available | **None** - Gap in the repository |
| SharePoint optimization | None available | **None** - Not covered |
| Fabric analytics | None available | **None** - Not covered |
| Azure AI Search (for content discovery) | `azure-search-documents-py/ts/dotnet` | **High** - Useful for SharePoint-like search |
| Building custom integrations | `mcp-builder`, `copilot-sdk` | **High** - Build custom MCP servers |
| Authentication | `azure-identity-py/ts/dotnet` | **High** - Entra ID patterns |

### Gap Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 MICROSOFT/SKILLS COVERAGE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  COVERED (Azure-focused):                                               │
│  ├── Azure AI Services (OpenAI, Vision, Speech, Search)                │
│  ├── Azure Data (Cosmos DB, Storage, Event Hubs)                       │
│  ├── Azure Identity & Security                                         │
│  ├── Azure Monitoring                                                   │
│  ├── M365 Agents SDK (Teams/Copilot bots)                              │
│  └── MCP Server building                                                │
│                                                                         │
│  NOT COVERED (Our focus areas):                                         │
│  ├── ❌ Microsoft Graph API                                             │
│  ├── ❌ Dynamics 365 CRM / Dataverse                                    │
│  ├── ❌ Business Central API                                            │
│  ├── ❌ SharePoint / Syntex                                             │
│  ├── ❌ Power Platform (Power Automate, Power Apps)                     │
│  ├── ❌ Microsoft Fabric                                                │
│  └── ❌ Purview                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Skills That ARE Useful for Our Problems

### 1. M365 Agents SDK (`m365-agents-py`, `m365-agents-ts`, `m365-agents-dotnet`)

**What it enables:** Build AI agents that work within Microsoft Teams and Copilot Studio.

**Relevant to our problems:**
- Building a Teams bot that queries D365 and BC data
- Creating a Copilot Studio agent for customer service
- Implementing conversational interfaces for business data

**Use Case Example:**
```
User in Teams: "What's the credit status for Contoso?"
        ↓
M365 Agent (built with this skill)
        ↓
Calls Graph API + BC API → Returns unified answer
```

**Applicability: MEDIUM**
- Helps with the *interface* layer (Teams bots, Copilot)
- Does NOT help with the *data* layer (Graph, BC, D365 APIs)

---

### 2. Azure AI Search (`azure-search-documents-py`, `azure-search-documents-ts`)

**What it enables:** Build intelligent search across any content with vector search, hybrid search, and semantic ranking.

**Relevant to our problems:**
- **SharePoint optimization:** Index SharePoint content in Azure AI Search for better discovery
- **Unified search:** Create a single search experience across D365, BC, and SharePoint

**Use Case Example:**
```
Problem: "I can't find documents in SharePoint"
        ↓
Solution: Azure AI Search with SharePoint connector
        ↓
Result: Unified, intelligent search across all content
```

**Code Pattern from Skill:**
```python
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

# Hybrid search (text + vector)
results = client.search(
    search_text="customer contract",
    vector_queries=[
        VectorizedQuery(
            vector=query_embedding,  # From Azure OpenAI
            k_nearest_neighbors=50,
            fields="content_vector"
        )
    ],
    select=["title", "content", "source_system"],  # Can include D365, BC, SharePoint
    top=10
)
```

**Applicability: HIGH** for the SharePoint discovery problem

---

### 3. MCP Builder (`mcp-builder`)

**What it enables:** Build custom MCP (Model Context Protocol) servers that let AI agents interact with ANY external API.

**Relevant to our problems:**
- Build a **Graph API MCP server** for AI agents
- Build a **Business Central MCP server** for AI agents
- Build a **Dynamics 365 MCP server** for AI agents

**This is the MOST RELEVANT skill** because it teaches you how to wrap any API for AI agent consumption.

**Use Case Example:**
```
Build custom MCP servers:
├── graph-mcp-server (access emails, calendar, SharePoint)
├── bc-mcp-server (access customers, invoices, payments)
└── d365-mcp-server (access accounts, opportunities)
        ↓
AI Agent can now query all systems via natural language
        ↓
"Show me Contoso's open invoices and recent emails"
```

**Applicability: HIGH** - enables building what doesn't exist in the repo

---

### 4. Copilot SDK (`copilot-sdk`)

**What it enables:** Programmatically integrate with GitHub Copilot, including custom tools and MCP server integration.

**Relevant to our problems:**
- Build coding agents that understand D365/BC/Graph patterns
- Create development tools that help your team write integration code
- Implement custom tools for Copilot that query business systems

**Use Case Example:**
```python
from copilot import CopilotClient

client = CopilotClient()
session = await client.createSession({
    "model": "gpt-4.1",
    "mcpServers": [
        {"name": "graph-server", "command": "npx graph-mcp"},
        {"name": "bc-server", "command": "npx bc-mcp"}
    ]
})

# Now Copilot can query your business systems
response = await session.sendAndWait({
    "prompt": "Find all customers with overdue invoices in BC"
})
```

**Applicability: MEDIUM** - useful for development workflow, not end-user solutions

---

### 5. Azure Identity (`azure-identity-py`, `azure-identity-ts`, `azure-identity-dotnet`)

**What it enables:** Authenticate to any Microsoft service using Entra ID (Azure AD).

**Relevant to our problems:**
- All our integrations need authentication
- `DefaultAzureCredential` pattern works with Graph, BC, D365, and Fabric

**Code Pattern from Skill:**
```python
from azure.identity import DefaultAzureCredential, ClientSecretCredential

# For development (uses your VS Code / CLI login)
credential = DefaultAzureCredential()

# For production (uses service principal)
credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)

# Use same credential for all services
graph_token = credential.get_token("https://graph.microsoft.com/.default")
bc_token = credential.get_token("https://api.businesscentral.dynamics.com/.default")
d365_token = credential.get_token("https://org.crm.dynamics.com/.default")
```

**Applicability: HIGH** - essential for any integration

---

## What's MISSING (Opportunity for Contribution)

The microsoft/skills repository has significant gaps in Microsoft 365 and Dynamics 365 areas:

### Skills That Should Exist But Don't

| Missing Skill | Would Cover | Impact |
|---------------|-------------|--------|
| `msgraph-py` | Microsoft Graph API patterns | HIGH |
| `msgraph-ts` | Microsoft Graph API patterns | HIGH |
| `dynamics365-dataverse-py` | Dataverse Web API patterns | HIGH |
| `business-central-py` | BC API integration | HIGH |
| `power-automate-sdk` | Power Automate custom connectors | MEDIUM |
| `sharepoint-syntex-py` | Syntex model integration | MEDIUM |
| `microsoft-fabric-py` | Fabric SDK patterns | MEDIUM |

### Contribution Opportunity

You could create and contribute these skills:

```
microsoft/skills/
└── .github/skills/
    ├── msgraph-py/                    # NEW
    │   ├── SKILL.md
    │   └── references/
    ├── dynamics365-dataverse-py/      # NEW
    │   ├── SKILL.md
    │   └── references/
    └── business-central-py/           # NEW
        ├── SKILL.md
        └── references/
```

---

## Practical Application: Building an MCP Server

The **best use** of microsoft/skills for our problems is using `mcp-builder` to create custom MCP servers that AI agents can use.

### Example: Build a Graph API MCP Server

Using the MCP Builder skill patterns:

```python
# graph_mcp_server.py
from fastmcp import FastMCP

mcp = FastMCP("Microsoft Graph")

@mcp.tool()
async def search_emails(query: str, top: int = 10) -> dict:
    """Search emails in user's mailbox"""
    async with get_graph_client() as client:
        results = await client.get(
            f"/me/messages?$search=\"{query}\"&$top={top}"
        )
        return {
            "emails": [
                {
                    "subject": m["subject"],
                    "from": m["from"]["emailAddress"]["address"],
                    "date": m["receivedDateTime"]
                }
                for m in results["value"]
            ]
        }

@mcp.tool()
async def get_sharepoint_files(site: str, query: str) -> dict:
    """Search files in a SharePoint site"""
    async with get_graph_client() as client:
        results = await client.post(
            "/search/query",
            json={
                "requests": [{
                    "entityTypes": ["driveItem"],
                    "query": {"queryString": f"site:{site} {query}"}
                }]
            }
        )
        return format_search_results(results)

@mcp.tool()
async def get_calendar_events(days: int = 7) -> dict:
    """Get upcoming calendar events"""
    # Implementation using Graph API
    pass
```

### Example: Build a Business Central MCP Server

```python
# bc_mcp_server.py
from fastmcp import FastMCP

mcp = FastMCP("Business Central")

@mcp.tool()
async def get_customer_financials(email: str) -> dict:
    """Get customer financial data from Business Central"""
    async with get_bc_client() as client:
        customer = await client.get(
            f"/companies({COMPANY_ID})/customers?$filter=email eq '{email}'"
        )
        if customer["value"]:
            c = customer["value"][0]
            return {
                "name": c["displayName"],
                "balance": c["balance"],
                "creditLimit": c["creditLimit"],
                "blocked": c["blocked"],
                "paymentTerms": c["paymentTermsCode"]
            }
        return {"error": "Customer not found"}

@mcp.tool()
async def get_open_invoices(customer_number: str) -> dict:
    """Get open invoices for a customer"""
    async with get_bc_client() as client:
        invoices = await client.get(
            f"/companies({COMPANY_ID})/salesInvoices"
            f"?$filter=customerNumber eq '{customer_number}' and status eq 'Open'"
        )
        return {
            "invoices": [
                {
                    "number": i["number"],
                    "amount": i["totalAmountIncludingTax"],
                    "dueDate": i["dueDate"],
                    "status": i["status"]
                }
                for i in invoices["value"]
            ]
        }

@mcp.tool()
async def check_credit_status(email: str) -> dict:
    """Check if customer has credit issues"""
    financials = await get_customer_financials(email)
    if "error" in financials:
        return financials

    issues = []
    if financials["blocked"]:
        issues.append(f"Customer is blocked: {financials['blocked']}")
    if financials["balance"] > financials["creditLimit"]:
        over_by = financials["balance"] - financials["creditLimit"]
        issues.append(f"Over credit limit by £{over_by:,.2f}")

    return {
        "customer": financials["name"],
        "status": "Issues Found" if issues else "Good Standing",
        "issues": issues,
        "balance": financials["balance"],
        "creditLimit": financials["creditLimit"]
    }
```

### Using Both MCP Servers Together

```python
# In your AI agent configuration
mcp_servers = [
    {"name": "graph", "command": "python graph_mcp_server.py"},
    {"name": "bc", "command": "python bc_mcp_server.py"}
]

# Now an AI agent can answer:
# "Find all emails from Contoso and check their credit status in BC"
```

---

## Recommendation Summary

### Should You Use microsoft/skills?

| Scenario | Recommendation |
|----------|----------------|
| Building Teams/Copilot bots | **Yes** - Use `m365-agents-*` skills |
| Implementing Azure AI Search | **Yes** - Use `azure-search-documents-*` skills |
| Building MCP servers for custom APIs | **Yes** - Use `mcp-builder` skill |
| Authentication patterns | **Yes** - Use `azure-identity-*` skills |
| Graph/D365/BC/SharePoint patterns | **No** - Not covered, but you can build MCP servers |

### Action Plan

1. **Use Existing Skills:**
   - `mcp-builder` - Learn to build custom MCP servers
   - `azure-identity-*` - Authentication patterns
   - `azure-search-documents-*` - If implementing enterprise search

2. **Build Custom MCP Servers:**
   - Graph API MCP server
   - Business Central MCP server
   - Dynamics 365 MCP server

3. **Consider Contributing:**
   - Create `msgraph-py` skill for the community
   - Create `business-central-py` skill
   - Create `dynamics365-dataverse-py` skill

---

## Quick Start: Installing Useful Skills

```bash
# Install the skills CLI
npx skills add microsoft/skills

# Or manually clone and copy specific skills:
git clone https://github.com/microsoft/skills.git
cp -r skills/.github/skills/mcp-builder your-project/.github/skills/
cp -r skills/.github/skills/azure-identity-py your-project/.github/skills/
cp -r skills/.github/skills/azure-search-documents-py your-project/.github/skills/
cp -r skills/.github/skills/m365-agents-py your-project/.github/skills/
```

---

## Conclusion

**The microsoft/skills repository is useful but incomplete for our specific problems.**

| What It's Good For | What It Lacks |
|--------------------|---------------|
| Azure AI services | Microsoft Graph patterns |
| Building MCP servers | D365/Dataverse patterns |
| Authentication | Business Central patterns |
| Teams/Copilot bot development | SharePoint/Syntex patterns |
| Azure Search | Power Platform patterns |

**The best strategy:** Use the `mcp-builder` skill to create your own MCP servers that wrap Graph, BC, and D365 APIs. This fills the gap and enables AI agents to query all your business systems.

---

*Evaluation performed: February 2026*
*Repository evaluated: https://github.com/microsoft/skills*
