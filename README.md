# Microsoft Integration Exploration

> Exploring Microsoft Graph, Business Central, Dynamics 365, Dataverse, Fabric, SharePoint, and Copilot

## Overview

This repository documents the exploration of Microsoft's integration ecosystem, focusing on how to create unified experiences across M365, Business Central (ERP), and Dynamics 365 (CRM).

## The Problem We're Solving

**Common complaints from Sales & Marketing teams:**
- "I closed a deal in Dynamics but can't see if the invoice was paid in Business Central"
- "Customer credit limits in BC don't reflect in Dynamics - we keep selling to customers on hold"
- "I have to log into two systems to get a complete customer picture"
- "I can't find the document I need in SharePoint"
- "Everyone stores and tags things differently"

**Root Cause:** Business Central (Finance/ERP), Dynamics 365 (Sales/CRM), and SharePoint (Documents) are separate systems that need to work together.

## Documentation

### 1. [Microsoft Graph API Guide](./microsoft-graph-api-guide.md)
**Start here** - Comprehensive guide to Microsoft Graph API.
- Simple to enterprise use cases
- Sample queries for Graph Explorer
- Python and Node.js code examples
- Query parameters and capabilities matrix

### 2. [Business Central & Dynamics 365 Integration](./business-central-dynamics-graph-integration.md)
How BC, D365, and Graph APIs relate to each other.
- BC API endpoints and examples
- Dynamics 365 Dataverse API
- Cross-system code examples
- Authentication setup

### 3. [Dataverse Explained](./dataverse-explained.md)
**Key concept** - The unified data platform that ties everything together.
- What Dataverse is and why it matters
- How D365 is built ON Dataverse
- Virtual Tables for BC integration
- Step-by-step setup guide

### 4. [Microsoft Fabric Explained](./microsoft-fabric-explained.md)
**Analytics layer** - When and how to use Fabric.
- Operational vs Analytical data
- OneLake, Lakehouse, Data Warehouse
- ML and Data Science capabilities
- When you need Fabric vs when you don't
- Cost comparison and implementation phases

### 5. [SharePoint Optimization Guide](./sharepoint-optimization-guide.md)
**Content management** - Catalog, discover, and manage documents across departments.
- Information architecture and taxonomy
- Microsoft Syntex for AI-powered classification
- Microsoft Search configuration
- Microsoft Purview for governance
- Integration with D365 and Business Central

### 6. [Integrated Experiences Guide](./integrated-experiences-m365-bc-dynamics.md)
**Practical solutions** - Real-world use cases with implementations.
- 360° Customer View
- Quote-to-Cash Process
- Marketing Campaign ROI
- Credit Management Alerts
- Solutions with and without Fabric/Copilot

### 7. [Microsoft Skills Evaluation](./microsoft-skills-evaluation.md)
**AI coding skills** - Evaluation of microsoft/skills repository for our use cases.
- 130+ skills analyzed for relevance
- Gap analysis: What's covered vs missing
- Useful skills: mcp-builder, azure-identity, azure-search-documents
- Strategy for building custom MCP servers

### 8. [Skillsmith MCP Guide](./skillsmith-mcp-guide.md)
**Skill discovery** - Using Skillsmith to find and create skills for AI agents.
- What Skillsmith MCP is and how it works
- Setup instructions for Claude Code
- Available tools: search, recommend, install_skill, validate
- Practical examples for Microsoft integration projects

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE MICROSOFT STACK                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  EXPERIENCE LAYER                                                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ D365    │ │ Power   │ │ Teams   │ │ Power   │ │ Copilot │          │
│  │ Apps    │ │ Apps    │ │         │ │ BI      │ │         │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│       │          │          │          │          │                    │
│  OPERATIONAL     │     COMMUNICATION   │     ANALYTICAL                │
│       │          │          │          │          │                    │
│       ▼          ▼          ▼          │          │                    │
│  ┌──────────────────────┐ ┌─────┐     │          │                    │
│  │      DATAVERSE       │ │Graph│     │          │                    │
│  │ • D365 native tables │ │ API │     │          │                    │
│  │ • BC virtual tables  │ └─────┘     │          │                    │
│  │ • Custom tables      │             │          │                    │
│  └──────────┬───────────┘             │          │                    │
│             │                         │          │                    │
│             │    Sync to Fabric       │          ▼                    │
│             │                         │    ┌───────────┐              │
│             └─────────────────────────┼───►│  FABRIC   │              │
│                                       │    │ • OneLake │              │
│  ┌──────────────────────┐            │    │ • ML      │              │
│  │   BUSINESS CENTRAL   │────────────┼───►│ • History │              │
│  │   (Own database)     │            │    └───────────┘              │
│  └──────────────────────┘            │          │                    │
│                                       └──────────┘                    │
│                                                                         │
│  SUMMARY:                                                               │
│  • Graph      = M365 data (emails, calendar, files, SharePoint)        │
│  • Dataverse  = Operational data (run the business)                    │
│  • BC         = Finance data (connects via Virtual Tables)             │
│  • SharePoint = Documents (accessed via Graph, enhanced by Syntex)     │
│  • Fabric     = Analytics data (analyze the business, ML, history)     │
│  • Copilot    = Works with ALL of them via natural language            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Technologies

| Technology | Purpose | Documentation |
|------------|---------|---------------|
| **Microsoft Graph** | Access M365 data (emails, calendar, files) | [Guide](./microsoft-graph-api-guide.md) |
| **Business Central** | ERP - Finance, inventory, orders | [Integration Guide](./business-central-dynamics-graph-integration.md) |
| **Dynamics 365** | CRM - Sales, service, marketing | [Integration Guide](./business-central-dynamics-graph-integration.md) |
| **Dataverse** | Unified data platform (D365 is built on this) | [Explained](./dataverse-explained.md) |
| **Fabric** | Analytics, big data, ML | [Explained](./microsoft-fabric-explained.md) |
| **SharePoint** | Document management, content collaboration | [Optimization Guide](./sharepoint-optimization-guide.md) |
| **Copilot** | AI-powered natural language queries | [Use Cases](./integrated-experiences-m365-bc-dynamics.md) |
| **Microsoft Skills** | AI coding agent knowledge files | [Evaluation](./microsoft-skills-evaluation.md) |
| **Skillsmith MCP** | Skill discovery for AI agents | [Guide](./skillsmith-mcp-guide.md) |

## Quick Start

### 1. Explore Graph API (No Code)
1. Go to [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
2. Sign in with your Microsoft account
3. Try: `https://graph.microsoft.com/v1.0/me`

### 2. Enable BC Data in D365 (Via Dataverse)
1. Go to Power Platform Admin Center
2. Enable Business Central Virtual Table Provider
3. Connect to your BC environment
4. Add BC fields to D365 Account form

### 3. Create Unified Dashboard
1. Use Power BI to connect to both Dataverse and BC
2. Create relationships between Account and bc_customers
3. Build dashboard showing unified customer view

## Recommended Reading Order

1. **[Microsoft Graph API Guide](./microsoft-graph-api-guide.md)** - Understand the M365 API
2. **[Dataverse Explained](./dataverse-explained.md)** - Understand the central platform
3. **[BC & D365 Integration](./business-central-dynamics-graph-integration.md)** - Understand the APIs
4. **[Microsoft Fabric Explained](./microsoft-fabric-explained.md)** - Understand the analytics layer
5. **[SharePoint Optimization Guide](./sharepoint-optimization-guide.md)** - Manage content effectively
6. **[Integrated Experiences](./integrated-experiences-m365-bc-dynamics.md)** - Build solutions
7. **[Microsoft Skills Evaluation](./microsoft-skills-evaluation.md)** - Evaluate AI coding skills
8. **[Skillsmith MCP Guide](./skillsmith-mcp-guide.md)** - Find and create skills for AI agents

## Implementation Phases

### Phase 1: Quick Wins (No Fabric)
- [ ] Enable Virtual Tables for BC in Dataverse
- [ ] Add BC fields to D365 Account form
- [ ] Create Business Rule for credit warnings
- [ ] Set up Power Automate for Teams alerts

### Phase 2: Enhanced Integration
- [ ] Build Quote-to-Cash automation
- [ ] Create unified Power BI dashboard
- [ ] Implement webhook-based real-time sync
- [ ] Add custom PCF controls in D365

### Phase 3: Fabric + Copilot
- [ ] Set up Fabric Lakehouse
- [ ] Create unified semantic model
- [ ] Enable Copilot natural language queries
- [ ] Build predictive analytics

## Resources

### Microsoft Documentation
- [Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [Business Central API](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/)
- [Dataverse](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/)
- [Dynamics 365 Web API](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)
- [Microsoft Fabric](https://learn.microsoft.com/en-us/fabric/)
- [SharePoint Online](https://learn.microsoft.com/en-us/sharepoint/)
- [Microsoft Syntex](https://learn.microsoft.com/en-us/microsoft-365/syntex/)
- [Microsoft Search](https://learn.microsoft.com/en-us/microsoftsearch/)
- [Microsoft Purview](https://learn.microsoft.com/en-us/purview/)

### AI Agent Development
- [Microsoft Skills Repository](https://github.com/microsoft/skills) - AI coding skills for Azure SDKs
- [Skillsmith](https://skillsmith.app) - Skill discovery and management for AI agents
- [MCP Protocol](https://modelcontextprotocol.io) - Model Context Protocol for AI tools

### Tools
- [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
- [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
- [Azure Portal](https://portal.azure.com)
- [SharePoint Admin Center](https://admin.microsoft.com/sharepoint)
- [Microsoft Search Admin](https://admin.microsoft.com/Adminportal/Home#/MicrosoftSearch)
- [Purview Compliance Portal](https://compliance.microsoft.com)

---

*Last updated: February 2026*
