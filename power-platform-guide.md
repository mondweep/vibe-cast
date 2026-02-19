# Power Platform: The Integration & Low-Code Layer

> Understanding how Power Platform connects Microsoft 365, Dynamics 365, Business Central, and the entire Microsoft ecosystem

## What is Power Platform?

**Power Platform** is Microsoft's unified low-code/no-code suite that serves as both the **experience layer** (building apps, dashboards, portals) and the **integration layer** (connecting systems, automating workflows) for the Microsoft ecosystem.

### The Five Components

| Component | Purpose | Typical Users |
|-----------|---------|---------------|
| **Power Apps** | Build custom applications without coding | Business analysts, citizen developers |
| **Power Automate** | Workflow automation between systems | Business users, IT |
| **Power BI** | Business intelligence and dashboards | Analysts, managers |
| **Power Pages** | External-facing portals and websites | Web developers, IT |
| **Copilot Studio** | Build custom AI agents and copilots | AI developers, business users |

### The Data Foundation: Dataverse

**Critical insight:** Dataverse is NOT separate from Power Platform—it IS Power Platform's data foundation.

```
┌─────────────────────────────────────────────────────────────────┐
│                      POWER PLATFORM                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Power   │ │ Power   │ │ Power   │ │ Power   │ │ Copilot │   │
│  │ Apps    │ │ Automate│ │ BI      │ │ Pages   │ │ Studio  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │          │          │          │          │             │
│       └──────────┴──────────┴──────────┴──────────┘             │
│                              │                                   │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │                      DATAVERSE                             │  │
│  │  • Standard tables (Account, Contact, etc.)                │  │
│  │  • D365 tables (Opportunity, Case, etc.)                   │  │
│  │  • BC Virtual Tables (Customers, Invoices, etc.)           │  │
│  │  • Custom tables (your business data)                      │  │
│  │  • Security, relationships, business rules                 │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Where Power Platform Fits in the Microsoft Stack

### Complete Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXPERIENCE LAYER                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ D365    │ │ Power   │ │ Teams   │ │ Power   │ │ Copilot │          │
│  │ Apps    │ │ Apps    │ │         │ │ BI      │ │         │          │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │
│       │          │          │          │          │                    │
├───────┴──────────┴──────────┴──────────┴──────────┴────────────────────┤
│                                                                         │
│                    POWER PLATFORM (Integration Layer)                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Power Automate        │  Copilot Studio    │  AI Builder        │   │
│  │  (Workflows)           │  (AI Agents)       │  (AI Models)       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                    1,000+ CONNECTORS                             │   │
│  │  M365 │ D365 │ BC │ SharePoint │ Azure │ SQL │ SAP │ Salesforce  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         DATAVERSE (Data Platform)                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  D365 Native Tables  │  BC Virtual Tables  │  Custom Tables      │   │
│  │  (Account, Contact,  │  (Customers,        │  (Your business     │   │
│  │   Opportunity, Case) │   Invoices, Items)  │   entities)         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         DATA SOURCES                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │  Business   │  │  Microsoft  │  │  SharePoint │  │   Fabric    │   │
│  │  Central    │  │    Graph    │  │             │  │  (Analytics)│   │
│  │   (ERP)     │  │   (M365)    │  │  (Docs)     │  │             │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Relationships

| System | Relationship to Power Platform |
|--------|-------------------------------|
| **Dynamics 365** | Built ON Dataverse (which is part of Power Platform) |
| **Business Central** | Connected via Virtual Tables and BC Connector |
| **Microsoft Graph** | Accessed via connectors for M365 data |
| **SharePoint** | Direct integration for lists and documents |
| **Fabric** | Dataverse syncs to Fabric for analytics |
| **Copilot** | Copilot Studio is part of Power Platform |

---

## Power Platform Components Deep Dive

### 1. Power Apps

**What it is:** Low-code platform for building custom business applications.

**Types of Apps:**

| Type | Best For | Runs On |
|------|----------|---------|
| **Canvas Apps** | Custom UI, mobile-first | Browser, mobile, Teams |
| **Model-Driven Apps** | Data-centric, form-based | Browser |
| **Power Pages** | External portals | Web |

**Common Use Cases:**

```
┌─────────────────────────────────────────────────────────────┐
│  USE CASE                    │  APP TYPE        │  DATA     │
├─────────────────────────────────────────────────────────────┤
│  Mobile expense submission   │  Canvas App      │  Dataverse│
│  Customer service dashboard  │  Model-Driven    │  D365 CE  │
│  Partner portal              │  Power Pages     │  Dataverse│
│  Inventory lookup            │  Canvas App      │  BC API   │
│  Approval workflows          │  Canvas + Flow   │  SharePoint│
└─────────────────────────────────────────────────────────────┘
```

**Code Example - Canvas App connecting to BC:**

```javascript
// Power Fx formula to get BC customers
ClearCollect(
    BCCustomers,
    BusinessCentral.GetItems(
        "production",
        "CRONUS USA, Inc.",
        "customers"
    )
);

// Filter customers over credit limit
Filter(BCCustomers, balance > creditLimit)
```

---

### 2. Power Automate

**What it is:** Workflow automation tool connecting systems and automating tasks.

**Flow Types:**

| Type | Trigger | Use Case |
|------|---------|----------|
| **Automated** | Event-based | When email arrives, when record created |
| **Instant** | Button/manual | On-demand report, approval request |
| **Scheduled** | Time-based | Daily sync, weekly cleanup |
| **Desktop** | UI automation | Legacy app automation (RPA) |

**Key Connectors for Our Stack:**

| Connector | Premium? | What It Does |
|-----------|----------|--------------|
| Dataverse | Yes | Full CRUD on Dataverse tables |
| Business Central | Yes | Access BC data and trigger events |
| SharePoint | No | Document and list automation |
| Outlook/Teams | No | Email and chat automation |
| Microsoft Graph | Yes | Full M365 API access |
| HTTP | Yes | Call any REST API |

**Example Flow: Quote-to-Cash**

```yaml
Flow: D365 Quote Won → BC Sales Order

Trigger: When Quote status changes to "Won" (Dataverse)

Actions:
  1. Get Quote with all line items
     - Dataverse: Get row (Quote)
     - Dataverse: List rows (Quote Lines)

  2. Find or Create BC Customer
     - BC: Get customers (filter by email)
     - Condition: If not found
       - BC: Create customer

  3. Create BC Sales Order
     - BC: Create sales order
       - customerNumber: {BC Customer No}
       - externalDocumentNumber: {D365 Quote Number}

  4. For each Quote Line:
     - BC: Create sales order line
       - itemNumber: {Product mapping}
       - quantity: {Line quantity}
       - unitPrice: {Line price}

  5. Update D365 Quote
     - Dataverse: Update row
       - bc_ordernumber: {BC Order No}
       - integrationstatus: "Synced"

  6. Notify team
     - Teams: Post message to channel
     - Outlook: Send email to finance
```

---

### 3. Power BI

**What it is:** Business intelligence and data visualization platform.

**2025 Update:** Power BI is now deeply integrated with Microsoft Fabric:
- Power BI Premium (P-SKUs) being retired → migrating to Fabric (F-SKUs)
- OneLake storage unifies data across BI, data engineering, and data science
- Copilot generates DAX queries automatically

**Integration with Our Stack:**

```
┌─────────────────────────────────────────────────────────────┐
│                      POWER BI                                │
│                         │                                    │
│    ┌────────────────────┼────────────────────┐              │
│    │                    │                    │              │
│    ▼                    ▼                    ▼              │
│ ┌──────────┐      ┌──────────┐        ┌──────────┐         │
│ │ Dataverse│      │ Business │        │  Fabric  │         │
│ │ (D365)   │      │ Central  │        │ Lakehouse│         │
│ └──────────┘      └──────────┘        └──────────┘         │
│                                                              │
│ Use Cases:                                                   │
│ • D365 pipeline dashboard                                    │
│ • BC financial reports                                       │
│ • Unified customer analytics (via Fabric)                    │
│ • Cross-system KPIs                                          │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Power Pages

**What it is:** Platform for building secure, data-driven external websites.

**Use Cases:**
- Customer self-service portals
- Partner collaboration sites
- Public-facing forms and applications
- Knowledge bases

**Integration:**
- Data: Dataverse tables
- Authentication: Azure AD B2C, social logins
- Documents: SharePoint

---

### 5. Copilot Studio

**What it is:** Platform for building custom AI agents and copilots.

**Key Capabilities (2025):**

| Feature | Description |
|---------|-------------|
| **Autonomous Agents** | AI agents that execute tasks without human intervention |
| **MCP Support** | Connect to MCP servers for extended capabilities |
| **Multi-channel** | Deploy to Teams, web, mobile, custom apps |
| **Enterprise Data** | Access Dataverse, SharePoint, Graph via connectors |
| **Agent 365** | Pre-built agents for M365 scenarios |

**Example: Sales Assistant Agent**

```yaml
Agent: Sales Assistant

Knowledge Sources:
  - Dataverse: Accounts, Opportunities, Quotes
  - BC Virtual Tables: Customer financials
  - SharePoint: Sales playbooks, proposals

Capabilities:
  - Answer questions about customer status
  - Check credit limits before quoting
  - Summarize opportunity history
  - Draft follow-up emails

Actions (via Power Automate):
  - Create follow-up tasks
  - Send notifications
  - Update opportunity stage
```

---

## Connecting Power Platform to Our Stack

### Business Central Integration

**Option 1: BC Connector (Power Automate/Power Apps)**

```
Power Apps/Automate ──BC Connector──► BC API ──► BC Data
```

- Direct API access to BC entities
- Real-time data (no sync needed)
- Premium connector (requires license)

**Option 2: Virtual Tables (via Dataverse)**

```
Power Apps/Automate ──► Dataverse ──Virtual Table──► BC Data
```

- BC data appears as Dataverse tables
- Consistent data model with D365
- Better for complex relationships

**Code Example - Power Automate BC Actions:**

```json
// Get customer from BC
{
  "action": "BusinessCentral.GetItem",
  "inputs": {
    "environment": "production",
    "company": "CRONUS",
    "entity": "customers",
    "id": "{{customerId}}"
  }
}

// Create sales order in BC
{
  "action": "BusinessCentral.CreateItem",
  "inputs": {
    "environment": "production",
    "company": "CRONUS",
    "entity": "salesOrders",
    "body": {
      "customerNumber": "{{bcCustomerNo}}",
      "externalDocumentNumber": "{{d365QuoteNo}}",
      "requestedDeliveryDate": "{{deliveryDate}}"
    }
  }
}
```

### Microsoft Graph Integration

**Via Connectors:**
- Office 365 Outlook
- Office 365 Users
- SharePoint
- Microsoft Teams
- OneDrive for Business

**Via HTTP Connector (for full Graph access):**

```json
// Power Automate HTTP action to Graph
{
  "method": "GET",
  "uri": "https://graph.microsoft.com/v1.0/me/messages",
  "headers": {
    "Authorization": "Bearer @{outputs('Get_Token')}"
  },
  "queries": {
    "$filter": "from/emailAddress/address eq '@{variables('CustomerEmail')}'",
    "$top": "10"
  }
}
```

### SharePoint Integration

**Direct Integration (2025):**
- SharePoint lists as primary data source in Power Apps
- Intelligent local caching for offline
- Document library automation

**Example - Document Automation:**

```yaml
Flow: Auto-file Customer Documents

Trigger: When file created in SharePoint "Incoming" folder

Actions:
  1. Get file properties

  2. AI Builder: Extract text from document

  3. AI Builder: Classify document type
     - Contract, Invoice, Proposal, Correspondence

  4. Parse extracted data
     - Customer name
     - Document date
     - Amount (if applicable)

  5. Find customer in Dataverse

  6. Move to correct folder:
     /Customers/{CustomerName}/{DocumentType}/{Year}/

  7. Update SharePoint metadata

  8. Create activity in D365 (if needed)
```

### Fabric Integration

**Dataverse → Fabric Sync:**
- Admins control which tables sync
- Near real-time with Fast Fabric (<15 min latency)
- Enables analytics across operational data

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Dataverse                          Fabric                   │
│  ┌──────────┐                      ┌──────────┐             │
│  │ Accounts │ ─────Sync─────────► │ Lakehouse│             │
│  │ Contacts │                      │          │             │
│  │ BC Data  │                      │ • SQL    │             │
│  └──────────┘                      │ • Spark  │             │
│                                    │ • ML     │             │
│                                    └──────────┘             │
│                                          │                   │
│                                          ▼                   │
│                                    ┌──────────┐             │
│                                    │ Power BI │             │
│                                    │ Reports  │             │
│                                    └──────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Power Automate vs Azure Logic Apps

| Criteria | Power Automate | Azure Logic Apps |
|----------|----------------|------------------|
| **Audience** | Business users, citizen devs | Developers, IT pros |
| **Interface** | Visual designer only | Visual + code (VS/VS Code) |
| **Best for** | M365/D365 workflows | Enterprise B2B, Azure-heavy |
| **Connectors** | 1,000+ (business focus) | Azure ecosystem + enterprise |
| **Custom code** | Limited (expressions) | Azure Functions integration |
| **Pricing** | Per-user or per-flow | Per-execution (consumption) |
| **Governance** | Power Platform admin | Azure governance |
| **RPA** | Desktop flows included | Separate (not included) |

### Decision Framework

**Use Power Automate when:**
- Automating within M365/D365 ecosystem
- Business users will build/maintain flows
- Need quick implementation
- Desktop automation (RPA) required

**Use Logic Apps when:**
- Heavy workload (millions of executions)
- Multi-cloud integration
- Strict enterprise governance
- Complex error handling needed
- Azure-first architecture

---

## Licensing Guide

### What's Included with M365

| Component | Included | Limitations |
|-----------|----------|-------------|
| Power Apps | Yes | Standard connectors only |
| Power Automate | Yes | Standard connectors only |
| Power BI | Limited | Consumer features only |
| Copilot Studio | No | Separate license required |

**Standard Connectors (included):**
- SharePoint
- Outlook
- Teams
- OneDrive
- Excel Online

### Premium Connectors (Require License)

Adding ONE premium connector means the ENTIRE solution needs premium licensing:

- Dataverse
- Business Central
- SQL Server
- Azure services
- HTTP/Webhook
- Salesforce, SAP, etc.

### License Types

| License | Cost (approx) | What You Get |
|---------|---------------|--------------|
| **Power Apps per app** | $5/user/month | 1 app + Dataverse |
| **Power Apps per user** | $20/user/month | Unlimited apps + Dataverse |
| **Power Automate per user** | $15/user/month | Unlimited cloud flows |
| **Power Automate per flow** | $100/flow/month | Unlimited users per flow |
| **Power BI Pro** | $10/user/month | Full BI capabilities |
| **Copilot Studio** | $200/month | 25,000 messages |

### D365 License Entitlements

D365 licenses include Power Platform rights within their context:

| D365 License | Power Apps | Power Automate | Dataverse |
|--------------|------------|----------------|-----------|
| Sales Enterprise | Included | Included | Included |
| Customer Service | Included | Included | Included |
| Field Service | Included | Included | Included |

**Caveat:** Only for licensed D365 users within their app scope.

### 2025 Enforcement

**Critical:** As of April 2025, Microsoft enforces in-product licensing:
- Apps/flows without proper licenses will fail or slow down
- API usage, Copilot access, and entitlements are audited
- Non-compliant solutions blocked at runtime

---

## Common Patterns and Solutions

### Pattern 1: 360° Customer View

**Problem:** Sales in D365 can't see BC financial data.

**Solution:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  D365 Account Form                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Customer: Contoso Ltd                                │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ CRM Data:                 │ BC Data (Virtual Table): │   │
│  │ • Annual Revenue          │ • Balance: £15,000       │   │
│  │ • Last Activity           │ • Credit Limit: £50,000  │   │
│  │ • Open Opportunities      │ • Payment Terms: Net 30  │   │
│  │                           │ • Status: Active         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Implementation:                                             │
│  1. Enable BC Virtual Table Provider                        │
│  2. Connect to BC environment                               │
│  3. Add BC fields to D365 form                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 2: Credit Alert System

**Problem:** Sales creates deals for customers on credit hold.

**Solution:**

```yaml
Flow: Credit Status Sync

Trigger: Scheduled (every 15 minutes)

Actions:
  1. Get BC customers with issues:
     BC: Get customers
     Filter: blocked ne '' or balance > creditLimit

  2. For each flagged customer:
     a. Find D365 Account (match by email)

     b. Update D365 Account:
        - bc_creditstatus = "Blocked" or "Over Limit"
        - bc_balance = {balance}
        - bc_creditlimit = {creditLimit}

     c. If status CHANGED to blocked:
        - Get Account Owner
        - Teams: Send adaptive card alert
        - Dataverse: Create Task for review

  3. Clear status for resolved customers
```

### Pattern 3: Document Auto-Classification

**Problem:** Users don't tag documents properly.

**Solution:**

```yaml
Flow: AI Document Classification

Trigger: When file created (SharePoint - Incoming folder)

Actions:
  1. Get file content

  2. AI Builder: Document processing
     - Extract text
     - Classify type (Contract, Invoice, Proposal)
     - Extract metadata

  3. Parse results:
     - Customer name
     - Document date
     - Contract value
     - Expiry date

  4. Find related records:
     - Dataverse: Find Account
     - Dataverse: Find related Opportunity

  5. Move and tag:
     - SharePoint: Move to correct library
     - SharePoint: Update metadata columns

  6. Link to D365:
     - Dataverse: Create Document Location
     - Dataverse: Create Timeline activity
```

### Pattern 4: Quote-to-Cash Automation

**Problem:** Won quotes manually re-entered in BC.

**Solution:**

```yaml
Flow: Quote Won → BC Order

Trigger: When Quote status = "Won" (Dataverse)

Actions:
  1. Get Quote details:
     - Dataverse: Get Quote
     - Dataverse: List Quote Lines
     - Dataverse: Get Account

  2. Find/Create BC Customer:
     - BC: Get customers (filter by email)
     - If not found:
       - BC: Create customer
         - name, email, phone, address

  3. Create BC Sales Order:
     - BC: Create salesOrders
       - customerNumber
       - externalDocumentNumber = Quote.quotenumber
       - requestedDeliveryDate

  4. Create Order Lines:
     - For each Quote Line:
       - BC: Create salesOrderLines
         - Map D365 product → BC item
         - quantity, unitPrice

  5. Update D365:
     - Dataverse: Update Quote
       - bc_ordernumber = {BC Order No}
       - integrationstatus = "Synced"

  6. Notify:
     - Teams: Post to Sales channel
     - Outlook: Email to Finance
```

---

## Best Practices

### Development

1. **Start with Dataverse** - Use Dataverse as central data store when possible
2. **Use solutions** - Package apps, flows, tables into solutions for ALM
3. **Environment strategy** - Dev → Test → Production promotion
4. **Naming conventions** - Consistent prefixes for custom items

### Performance

1. **Minimize connector calls** - Batch operations where possible
2. **Use delegation** - Let data source filter, not Power Apps
3. **Cache data** - Use collections for frequently accessed data
4. **Concurrent flows** - Run independent actions in parallel

### Security

1. **Least privilege** - Grant minimum required permissions
2. **Connection references** - Don't hardcode credentials
3. **DLP policies** - Prevent data leakage between connectors
4. **Environment security** - Separate dev/test/prod

### Governance

1. **Center of Excellence** - Establish governance team
2. **Monitoring** - Use Power Platform admin center analytics
3. **Documentation** - Document all production solutions
4. **Training** - Invest in maker enablement

---

## Power Platform + AI (2025-2026)

### AI Builder

Pre-built AI models integrated into Power Platform:

| Model | Use Case |
|-------|----------|
| **Document Processing** | Extract data from invoices, receipts |
| **Text Classification** | Categorize support tickets |
| **Sentiment Analysis** | Analyze customer feedback |
| **Object Detection** | Identify products in images |
| **Prediction** | Forecast outcomes |

### Copilot Integration

- **Power Apps Copilot** - Describe app, AI builds it
- **Power Automate Copilot** - Describe flow, AI creates it
- **Power BI Copilot** - Natural language to DAX/visuals
- **Copilot Studio** - Build custom AI agents

### Dataverse MCP Server (2025)

New capability enabling LLM integration:
- Connect Dataverse to AI models via MCP
- Enable AI agents to query/update business data
- Part of the broader agent ecosystem

---

## Resources

### Microsoft Documentation
- [Power Platform Documentation](https://learn.microsoft.com/en-us/power-platform/)
- [Power Apps](https://learn.microsoft.com/en-us/power-apps/)
- [Power Automate](https://learn.microsoft.com/en-us/power-automate/)
- [Power BI](https://learn.microsoft.com/en-us/power-bi/)
- [Power Pages](https://learn.microsoft.com/en-us/power-pages/)
- [Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/)
- [Dataverse](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/)

### Admin Portals
- [Power Platform Admin Center](https://admin.powerplatform.microsoft.com)
- [Power Automate Portal](https://make.powerautomate.com)
- [Power Apps Portal](https://make.powerapps.com)
- [Copilot Studio](https://copilotstudio.microsoft.com)

### Licensing
- [Power Platform Licensing Guide](https://go.microsoft.com/fwlink/?linkid=2085130)
- [Licensing FAQ](https://learn.microsoft.com/en-us/power-platform/admin/powerapps-flow-licensing-faq)

---

*Last updated: February 2026*
