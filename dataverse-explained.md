# Dataverse: The Central Data Platform

> Understanding how Dataverse connects Microsoft 365, Dynamics 365, Business Central, and Power Platform

## What is Dataverse?

**Dataverse** (formerly Common Data Service / CDS) is Microsoft's **unified data platform** that sits at the heart of the Power Platform and Dynamics 365.

Think of it as a **managed database-as-a-service** with built-in business logic, security, and integration capabilities.

---

## Where Dataverse Fits

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WHERE DATAVERSE FITS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Microsoft 365 (Graph)          Dynamics 365              Power Platform
│   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐│
│   │ Outlook, Teams  │      │  Sales, Service │      │ Power Apps      ││
│   │ SharePoint      │      │  Marketing, F&O │      │ Power Automate  ││
│   │ OneDrive        │      │  Field Service  │      │ Power BI        ││
│   └────────┬────────┘      └────────┬────────┘      └────────┬────────┘│
│            │                        │                        │         │
│            │               ┌────────▼────────┐               │         │
│            │               │                 │               │         │
│            └──────────────►│   DATAVERSE     │◄──────────────┘         │
│                            │                 │                         │
│                            │  • Tables       │                         │
│                            │  • Relationships│                         │
│                            │  • Security     │                         │
│                            │  • Business     │                         │
│                            │    Logic        │                         │
│                            │  • APIs         │                         │
│                            └────────┬────────┘                         │
│                                     │                                  │
│                    ┌────────────────┼────────────────┐                 │
│                    ▼                ▼                ▼                 │
│             Business Central    External APIs    Azure Services        │
│             (via Virtual Tables) (via Connectors) (via Dataverse)     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Insight: Dynamics 365 IS Dataverse

**Dynamics 365 Sales/Service/Marketing is built ON TOP of Dataverse.**

```
Dynamics 365 Sales   = Dataverse + Sales App   + Account/Contact/Opportunity tables
Dynamics 365 Service = Dataverse + Service App + Case/Entitlement tables
Custom Power App     = Dataverse + Your custom tables + Your app
```

When you use Dynamics 365, you're already using Dataverse.

---

## Dataverse vs Other Systems

| System | What It Is | Data Type | Relationship to Dataverse |
|--------|-----------|-----------|---------------------------|
| **Microsoft Graph** | API to access M365 data | Emails, files, calendar, users | Separate - connects via APIs |
| **Business Central** | ERP system with own database | Finance, inventory, orders | Separate - connects via Virtual Tables |
| **Dynamics 365 CRM** | CRM **built ON Dataverse** | Accounts, contacts, opportunities | **IS Dataverse** |
| **Dataverse** | Database platform | Structured business data | The foundation |
| **Fabric** | Analytics platform | Big data, ML, BI | Consumes data from Dataverse |

---

## What Dataverse Provides

### 1. Standard Tables (Pre-built)

These tables come out-of-the-box with Dynamics 365:

```
Account          Contact          Lead
Opportunity      Case             Activity
Product          Quote            Order
Invoice          Campaign         Team
User             Business Unit    Currency
```

### 2. Custom Tables

You can create your own tables for any business data.

### 3. Built-in Features

| Feature | Description |
|---------|-------------|
| **Security** | Row-level, field-level, role-based access |
| **Relationships** | 1:N, N:N, lookups between tables |
| **Business Rules** | No-code validation and automation |
| **Calculated Fields** | Formulas that auto-calculate |
| **Rollup Fields** | Aggregations from related records |
| **Auditing** | Track all changes automatically |
| **Workflows** | Background automation |
| **Plugins** | Custom C# code execution |
| **Web API** | REST/OData access to all data |

---

## The Reconciliation Problem Solved

### Before: Disconnected Systems

```
Dynamics 365 CRM (Dataverse)          Business Central
┌─────────────────────┐              ┌─────────────────────┐
│ Account: Contoso    │              │ Customer: Contoso   │
│ - Revenue: £500k    │   ← NO      │ - Balance: £45,000  │
│ - Owner: John       │   SYNC →    │ - Credit: £50,000   │
│ - Opportunities: 3  │              │ - Invoices: 5 open  │
└─────────────────────┘              └─────────────────────┘
        ↑                                      ↑
   Sales uses this               Finance uses this
   Can't see financials          Can't see pipeline
```

### After: Connected via Dataverse

```
┌─────────────────────────────────────────────────────────────┐
│                        DATAVERSE                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Account: Contoso (UNIFIED)                          │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ CRM Data (Native):          │ BC Data (Virtual):    │   │
│  │ - Revenue: £500k            │ - Balance: £45,000    │   │
│  │ - Owner: John               │ - Credit Limit: £50k  │   │
│  │ - Opportunities: 3          │ - Open Invoices: 5    │   │
│  │ - Activities: 12            │ - Payment Terms: Net30│   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│              ┌────────────┴────────────┐                   │
│              ▼                         ▼                   │
│     Virtual Table                Real-time Sync            │
│     (BC Customers)              (Power Automate)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    Business Central
                    (Source of truth for finance)
```

---

## Three Ways to Connect Business Central to Dataverse

### Option 1: Virtual Tables (Read-Only, Real-Time)

Virtual Tables make BC data appear as if it's in Dataverse, but data stays in BC.

```
Dataverse                              Business Central
┌─────────────────┐                   ┌─────────────────┐
│ bc_customers    │ ──── API Call ──► │ /customers      │
│ (Virtual Table) │ ◄─── Response ─── │                 │
└─────────────────┘                   └─────────────────┘
```

**Pros:**
- ✅ Always up-to-date (real-time)
- ✅ No data duplication
- ✅ No sync logic to maintain

**Cons:**
- ❌ Read-only (can't write back easily)
- ❌ Performance depends on BC API
- ❌ Limited offline capability

**Setup Steps:**
1. Go to Power Platform Admin Center
2. Enable BC Virtual Table Provider
3. Create connection to your BC environment
4. Select which BC entities to expose
5. They appear as tables in Dataverse

### Option 2: Data Sync (Read/Write, Near Real-Time)

Copy BC data to Dataverse tables, keep in sync via Power Automate or Azure.

```
Dataverse                              Business Central
┌─────────────────┐   Sync every      ┌─────────────────┐
│ bc_customers    │ ◄─── 15 min ───── │ /customers      │
│ (Real Table)    │                   │                 │
│ - Can write     │ ──── Webhook ───► │ (Triggers on    │
│ - Can extend    │                   │  change)        │
└─────────────────┘                   └─────────────────┘
```

**Pros:**
- ✅ Full read/write capability
- ✅ Can add custom columns
- ✅ Works offline
- ✅ Better performance (local data)

**Cons:**
- ❌ Data can be stale between syncs
- ❌ Sync logic to maintain
- ❌ Potential conflicts to resolve

### Option 3: Dual-Write (For D365 Finance & Operations Only)

```
Dataverse                              D365 Finance & Operations
┌─────────────────┐   Real-time       ┌─────────────────┐
│ Account         │ ◄──── Sync ─────► │ Customer        │
│                 │   bidirectional   │                 │
└─────────────────┘                   └─────────────────┘
```

**Note:** Dual-write is specifically for D365 F&O, not Business Central. For BC, use Virtual Tables or Data Sync.

---

## Complete Architecture with Dataverse

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER LAYER                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  D365     │  │  Power    │  │  Teams    │  │  Copilot  │           │
│  │  Sales    │  │  Apps     │  │  (Graph)  │  │           │           │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           │
└────────┼──────────────┼──────────────┼──────────────┼───────────────────┘
         │              │              │              │
         ▼              ▼              │              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATAVERSE                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     NATIVE TABLES                                │   │
│  │  Account │ Contact │ Opportunity │ Lead │ Case │ Activity       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    VIRTUAL TABLES (BC)                           │   │
│  │  bc_customers │ bc_invoices │ bc_payments │ bc_items            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    CUSTOM TABLES                                 │   │
│  │  Your business-specific data                                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │                                           │
         │ Virtual Table                             │ Power Automate
         │ Provider                                  │ / Azure Functions
         ▼                                           ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│    Business Central     │              │    Microsoft Graph      │
│    (Finance Data)       │              │    (M365 Data)          │
│    - Own Database       │              │    - Emails             │
│    - Own API            │              │    - Calendar           │
└─────────────────────────┘              │    - Files              │
                                         └─────────────────────────┘
```

---

## Dataverse in Each Use Case

### Use Case 1: 360° Customer View

| Component | Role |
|-----------|------|
| Account (Dataverse) | Native CRM data - owner, revenue, activities |
| bc_customers (Virtual Table) | BC data - balance, credit limit, blocked |
| Relationship | Link Account to bc_customers by email |
| Result | One unified view in D365 form |

**Query Example:**
```sql
SELECT
    a.name,
    a.revenue,
    a.ownerid,
    bc.balance,
    bc.creditLimit,
    bc.blocked
FROM account a
LEFT JOIN bc_customers bc ON a.emailaddress1 = bc.email
WHERE a.accountid = '{id}'
```

### Use Case 2: Quote-to-Cash

```
Quote (Dataverse) ──► Integration Record (Dataverse) ──► Sales Order (BC)
      │                      │
      │                      └── Stores: BC Order Number, Sync Status
      └── Native D365 entity
```

### Use Case 3: Marketing Campaign ROI

| Component | Role |
|-----------|------|
| Campaign (Dataverse) | Marketing campaign data |
| Lead (Dataverse) | Leads attributed to campaign |
| Opportunity (Dataverse) | Converted leads |
| bc_invoices (Virtual Table) | Actual revenue from BC |
| bc_payments (Virtual Table) | Payment confirmation |

### Use Case 4: Credit Management

| Component | Role |
|-----------|------|
| Account (Dataverse) | Add custom field: bc_creditstatus |
| Business Rule | Show warning when blocked |
| Power Automate | Read bc_customers, update Account, send Teams alert |

---

## Dataverse vs Fabric

| Aspect | Dataverse | Fabric |
|--------|-----------|--------|
| **Purpose** | Transactional business data | Analytics & big data |
| **Data Type** | Structured, relational | All types (structured, unstructured) |
| **Scale** | Millions of records | Billions of records |
| **Use Case** | Apps, workflows, CRM | BI, ML, data science |
| **Query** | Web API, FetchXML | SQL, Spark, KQL |
| **Real-time** | Yes (for transactions) | Yes (for streaming analytics) |
| **Best For** | Running the business | Analyzing the business |

**They Work Together:**
```
Dataverse (Operational)     ───────►    Fabric (Analytical)
- Daily transactions                    - Historical analysis
- Current state                         - Trends & patterns
- User interactions                     - ML predictions
```

---

## Dataverse API Access

### Web API Endpoint

```
https://{org}.crm.dynamics.com/api/data/v9.2
```

### Example Queries

```bash
# Get all accounts
GET /accounts

# Get account with related contacts
GET /accounts({id})?$expand=contact_customer_accounts

# Get accounts with BC data (if virtual table enabled)
GET /accounts?$select=name,emailaddress1,bc_balance,bc_creditlimit

# Create a new account
POST /accounts
{
    "name": "New Customer",
    "emailaddress1": "contact@newcustomer.com"
}

# Update account
PATCH /accounts({id})
{
    "revenue": 500000
}
```

### Python Example

```python
import requests

DATAVERSE_URL = "https://{org}.crm.dynamics.com/api/data/v9.2"

def get_unified_customer(account_id, token):
    """Get account with BC financial data via virtual table"""

    response = requests.get(
        f"{DATAVERSE_URL}/accounts({account_id})",
        headers={
            "Authorization": f"Bearer {token}",
            "OData-MaxVersion": "4.0",
            "OData-Version": "4.0"
        },
        params={
            "$select": "name,emailaddress1,revenue,bc_balance,bc_creditlimit,bc_blocked",
            "$expand": "contact_customer_accounts($select=fullname,emailaddress1)"
        }
    )

    return response.json()

# Result includes both CRM and BC data in one call
customer = get_unified_customer("account-guid", token)
print(f"Customer: {customer['name']}")
print(f"CRM Revenue: {customer['revenue']}")
print(f"BC Balance: {customer['bc_balance']}")
print(f"BC Credit Limit: {customer['bc_creditlimit']}")
print(f"BC Blocked: {customer['bc_blocked']}")
```

---

## Practical Steps to Enable Virtual Tables for BC

### Step 1: Power Platform Admin Center

1. Go to https://admin.powerplatform.microsoft.com
2. Select your environment
3. Go to Settings → Features
4. Enable "Business Central Virtual Table"

### Step 2: Create Connection

1. In Power Platform Admin Center
2. Go to Data → Connections
3. Add new connection: "Business Central"
4. Authenticate with your BC credentials
5. Select your BC environment and company

### Step 3: Enable Virtual Tables

1. Go to Tables in your environment
2. Find "Virtual Table" category
3. Enable tables you need:
   - bc_customers
   - bc_salesInvoices
   - bc_salesOrders
   - bc_items
   - bc_vendors

### Step 4: Add to D365 Forms

1. Open D365 Sales → Settings → Customizations
2. Edit Account form
3. Add fields from virtual table:
   - bc_balance
   - bc_creditlimit
   - bc_blocked
4. Save and publish

### Step 5: Create Business Rule

1. On Account table, create new Business Rule
2. Condition: bc_blocked is not empty
3. Action: Show error message "Customer is blocked in Business Central"
4. Activate the rule

---

## Summary: How It All Connects

```
┌─────────────────────────────────────────────────────────────────┐
│                      COMPLETE PICTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   Copilot   │     │   Teams     │     │  Power BI   │      │
│  │ (NL Queries)│     │  (Alerts)   │     │ (Dashboards)│      │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘      │
│         │                   │                   │              │
│         │            ┌──────▼──────┐            │              │
│         │            │   Graph     │            │              │
│         │            │   (M365)    │            │              │
│         │            └──────┬──────┘            │              │
│         │                   │                   │              │
│         ▼                   ▼                   ▼              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                      DATAVERSE                           │  │
│  │  ┌─────────────────────────────────────────────────┐    │  │
│  │  │ Native: Account, Contact, Opportunity, Lead     │    │  │
│  │  │ Virtual: bc_customers, bc_invoices, bc_payments │    │  │
│  │  │ Custom: Your business tables                    │    │  │
│  │  └─────────────────────────────────────────────────┘    │  │
│  └───────────────────────────┬─────────────────────────────┘  │
│                              │                                 │
│         ┌────────────────────┼────────────────────┐           │
│         ▼                    ▼                    ▼           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │
│  │  Business   │     │   Power     │     │   Fabric    │     │
│  │  Central    │     │  Automate   │     │ (Analytics) │     │
│  │  (Finance)  │     │  (Workflow) │     │             │     │
│  └─────────────┘     └─────────────┘     └─────────────┘     │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resources

- **Dataverse Documentation:** https://learn.microsoft.com/en-us/power-apps/maker/data-platform/
- **Virtual Tables:** https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-virtual-tables-using-connectors
- **BC Virtual Table Provider:** https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/power-platform-virtual-tables
- **Dataverse Web API:** https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview
- **Dual-Write (F&O):** https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/dual-write/

---

*Last updated: February 2026*
