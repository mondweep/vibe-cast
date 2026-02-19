# Integrated Experiences: M365, Business Central & Dynamics CRM

> Solving the reconciliation problem between Sales/Marketing (Dynamics) and Finance (Business Central)

## The Problem

**Common complaints from Sales & Marketing teams:**

- "I closed a deal in Dynamics but can't see if the invoice was paid in Business Central"
- "Customer credit limits in BC don't reflect in Dynamics - we keep selling to customers on hold"
- "I have to log into two systems to get a complete customer picture"
- "Marketing campaigns in Dynamics can't see actual revenue data from BC"
- "Our customer records are duplicated and out of sync"

**Root Cause:** Business Central (Finance/ERP) and Dynamics 365 (Sales/CRM) are separate systems with separate databases.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER EXPERIENCE LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Teams     │  │   Outlook   │  │  Power BI   │  │   Copilot   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION LAYER                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │  Power Automate │  │   Logic Apps    │  │  Azure Functions │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
│                              OR                                         │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │              Microsoft Fabric (Unified Data Layer)           │       │
│  └─────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │ Microsoft Graph │  │ Business Central│  │  Dynamics 365   │        │
│  │  (M365 Data)    │  │   (Finance)     │  │    (CRM)        │        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Use Case 1: 360° Customer View

### The Problem
Sales rep in Dynamics can't see:
- Outstanding invoices (BC)
- Payment history (BC)
- Credit status (BC)
- Recent email conversations (M365)

### Solution WITHOUT Fabric/Copilot

#### Architecture
```
Dynamics 365 CRM
       │
       ├── Virtual Table ──────────► Business Central (Customer financials)
       │
       └── Server-Side Sync ───────► Microsoft Graph (Emails, meetings)
```

#### Implementation

**Step 1: Create Virtual Table in Dataverse for BC Customer Data**

```javascript
// Power Platform solution - Virtual Table definition
{
  "name": "bc_customer_financials",
  "displayName": "BC Customer Financials",
  "externalName": "customers",
  "dataSource": "BusinessCentral",
  "columns": [
    { "name": "balance", "type": "Currency" },
    { "name": "creditLimit", "type": "Currency" },
    { "name": "blocked", "type": "String" },
    { "name": "paymentTermsCode", "type": "String" }
  ]
}
```

**Step 2: Power Automate Flow - Sync Customer Data**

```yaml
Trigger: When a record is created or updated (Dataverse - Account)

Actions:
  1. Get customer from Business Central:
     - Filter: email eq '{Account.emailaddress1}'

  2. If BC customer found:
     - Update Account in Dataverse:
       - bc_balance: BC.balance
       - bc_creditlimit: BC.creditLimit
       - bc_blocked: BC.blocked
       - bc_lastupdated: utcNow()

  3. Get recent emails from Graph:
     - Search: Account.emailaddress1
     - Top: 5

  4. Create Timeline activities for emails
```

**Step 3: Custom PCF Control for Unified View**

```typescript
// React component embedded in D365 form
import React, { useEffect, useState } from 'react';

interface CustomerUnifiedView {
  // CRM Data
  accountName: string;
  accountId: string;

  // BC Data (via virtual table or API)
  bcBalance: number;
  bcCreditLimit: number;
  bcBlocked: string;
  bcOpenInvoices: Invoice[];

  // Graph Data
  recentEmails: Email[];
  upcomingMeetings: Meeting[];
}

const Customer360View: React.FC<{ accountId: string }> = ({ accountId }) => {
  const [data, setData] = useState<CustomerUnifiedView | null>(null);

  useEffect(() => {
    // Fetch from all three sources
    Promise.all([
      fetchD365Account(accountId),
      fetchBCFinancials(accountId),
      fetchGraphCommunications(accountId)
    ]).then(([crm, bc, graph]) => {
      setData({ ...crm, ...bc, ...graph });
    });
  }, [accountId]);

  return (
    <div className="customer-360">
      <section className="financials">
        <h3>Financial Status (Business Central)</h3>
        <div className={data?.bcBlocked ? 'alert' : ''}>
          <p>Balance: £{data?.bcBalance.toLocaleString()}</p>
          <p>Credit Limit: £{data?.bcCreditLimit.toLocaleString()}</p>
          <p>Status: {data?.bcBlocked || 'Active'}</p>
        </div>
        <h4>Open Invoices</h4>
        <ul>
          {data?.bcOpenInvoices.map(inv => (
            <li key={inv.number}>
              {inv.number} - £{inv.amount} - Due: {inv.dueDate}
            </li>
          ))}
        </ul>
      </section>

      <section className="communications">
        <h3>Recent Communications (Outlook)</h3>
        <ul>
          {data?.recentEmails.map(email => (
            <li key={email.id}>
              {email.subject} - {email.receivedDateTime}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
```

**Step 4: Azure Function for Real-time Data Aggregation**

```python
import azure.functions as func
import requests
from concurrent.futures import ThreadPoolExecutor

def main(req: func.HttpRequest) -> func.HttpResponse:
    account_id = req.params.get('accountId')
    email = req.params.get('email')

    # Fetch from all sources in parallel
    with ThreadPoolExecutor(max_workers=3) as executor:
        d365_future = executor.submit(get_d365_account, account_id)
        bc_future = executor.submit(get_bc_customer, email)
        graph_future = executor.submit(get_graph_communications, email)

    unified_view = {
        "crm": d365_future.result(),
        "financials": bc_future.result(),
        "communications": graph_future.result(),
        "lastUpdated": datetime.utcnow().isoformat()
    }

    return func.HttpResponse(
        json.dumps(unified_view),
        mimetype="application/json"
    )

def get_bc_customer(email):
    """Fetch customer financials from Business Central"""
    response = requests.get(
        f"{BC_BASE_URL}/companies({COMPANY_ID})/customers?$filter=email eq '{email}'",
        headers={"Authorization": f"Bearer {get_bc_token()}"}
    )
    customer = response.json()["value"][0] if response.json()["value"] else None

    if customer:
        # Also get open invoices
        invoices = requests.get(
            f"{BC_BASE_URL}/companies({COMPANY_ID})/salesInvoices?$filter=customerNumber eq '{customer['number']}' and status eq 'Open'",
            headers={"Authorization": f"Bearer {get_bc_token()}"}
        ).json()["value"]

        return {
            "balance": customer["balance"],
            "creditLimit": customer["creditLimit"],
            "blocked": customer["blocked"],
            "openInvoices": invoices
        }
    return None
```

---

### Solution WITH Fabric + Copilot

#### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                     Microsoft Copilot                            │
│         "Show me customers with overdue invoices who have       │
│          open opportunities worth more than £50k"                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Microsoft Fabric                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    OneLake (Unified Storage)                │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │
│  │  │ BC Lakehouse │ │D365 Lakehouse│ │Graph Lakehouse│       │ │
│  │  │  Customers   │ │   Accounts   │ │   Emails     │       │ │
│  │  │  Invoices    │ │ Opportunities│ │  Meetings    │       │ │
│  │  │  Payments    │ │    Leads     │ │  Contacts    │       │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Unified Semantic Model                         │ │
│  │         (Customer = BC.Customer + D365.Account)             │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation

**Step 1: Set Up Fabric Workspace with Data Sources**

```python
# Fabric notebook - Data ingestion
from pyspark.sql import SparkSession
from pyspark.sql.functions import *

spark = SparkSession.builder.getOrCreate()

# Ingest Business Central data
bc_customers = spark.read.format("com.microsoft.azure.synapse.businesscentral") \
    .option("entity", "customers") \
    .option("companyId", COMPANY_ID) \
    .load()

bc_invoices = spark.read.format("com.microsoft.azure.synapse.businesscentral") \
    .option("entity", "salesInvoices") \
    .option("companyId", COMPANY_ID) \
    .load()

# Ingest Dynamics 365 data
d365_accounts = spark.read.format("com.microsoft.azure.synapse.dataverse") \
    .option("entity", "accounts") \
    .load()

d365_opportunities = spark.read.format("com.microsoft.azure.synapse.dataverse") \
    .option("entity", "opportunities") \
    .load()

# Write to Lakehouse
bc_customers.write.format("delta").mode("overwrite").saveAsTable("bc_customers")
bc_invoices.write.format("delta").mode("overwrite").saveAsTable("bc_invoices")
d365_accounts.write.format("delta").mode("overwrite").saveAsTable("d365_accounts")
d365_opportunities.write.format("delta").mode("overwrite").saveAsTable("d365_opportunities")
```

**Step 2: Create Unified Customer Model**

```sql
-- Fabric SQL endpoint - Unified customer view
CREATE OR ALTER VIEW unified_customer AS
SELECT
    -- Identity (match on email or name)
    COALESCE(d.accountid, bc.systemId) AS unified_customer_id,
    COALESCE(d.name, bc.displayName) AS customer_name,
    COALESCE(d.emailaddress1, bc.email) AS email,

    -- CRM Data (Dynamics 365)
    d.accountid AS d365_account_id,
    d.name AS d365_name,
    d.revenue AS d365_annual_revenue,
    d.accountcategorycode AS d365_category,
    d.ownerid AS d365_owner,

    -- Finance Data (Business Central)
    bc.number AS bc_customer_number,
    bc.balance AS bc_balance,
    bc.creditLimit AS bc_credit_limit,
    bc.blocked AS bc_blocked,
    bc.paymentTermsCode AS bc_payment_terms,

    -- Calculated fields
    CASE
        WHEN bc.balance > bc.creditLimit THEN 'Over Credit Limit'
        WHEN bc.blocked IS NOT NULL THEN 'Blocked: ' + bc.blocked
        ELSE 'Good Standing'
    END AS credit_status,

    -- Aggregations
    (SELECT COUNT(*) FROM bc_invoices i WHERE i.customerNumber = bc.number AND i.status = 'Open') AS open_invoice_count,
    (SELECT SUM(totalAmountIncludingTax) FROM bc_invoices i WHERE i.customerNumber = bc.number AND i.status = 'Open') AS open_invoice_total,
    (SELECT COUNT(*) FROM d365_opportunities o WHERE o.parentaccountid = d.accountid AND o.statecode = 0) AS open_opportunities,
    (SELECT SUM(estimatedvalue) FROM d365_opportunities o WHERE o.parentaccountid = d.accountid AND o.statecode = 0) AS pipeline_value

FROM d365_accounts d
FULL OUTER JOIN bc_customers bc
    ON LOWER(d.emailaddress1) = LOWER(bc.email)
    OR LOWER(d.name) = LOWER(bc.displayName);
```

**Step 3: Create Semantic Model for Copilot**

```yaml
# Fabric semantic model definition
model:
  name: "Customer Intelligence"
  tables:
    - name: "Unified Customer"
      source: "unified_customer"
      measures:
        - name: "Total Outstanding"
          expression: "SUM([bc_balance])"
        - name: "Pipeline Value"
          expression: "SUM([pipeline_value])"
        - name: "At Risk Revenue"
          expression: "CALCULATE([Pipeline Value], [credit_status] <> 'Good Standing')"

    - name: "Invoices"
      source: "bc_invoices"
      relationships:
        - to: "Unified Customer"
          from_column: "customerNumber"
          to_column: "bc_customer_number"

    - name: "Opportunities"
      source: "d365_opportunities"
      relationships:
        - to: "Unified Customer"
          from_column: "parentaccountid"
          to_column: "d365_account_id"
```

**Step 4: Copilot Natural Language Queries**

Once set up, users can ask Copilot:

| Question | What Copilot Does |
|----------|-------------------|
| "Which customers have overdue invoices?" | Queries unified model, filters by invoice due date |
| "Show me the pipeline for customers over their credit limit" | Joins opportunities with BC credit data |
| "What's the total outstanding balance by sales rep?" | Joins BC balance with D365 owner field |
| "List customers we haven't emailed in 30 days with open opportunities" | Combines Graph email data with D365 opportunities |
| "Summarize the payment history for Contoso" | Retrieves BC payment data, generates narrative |

---

## Use Case 2: Quote-to-Cash Process

### The Problem
- Sales creates quote in Dynamics → manually re-enters as Sales Order in BC
- No visibility of order status in CRM
- Invoice sent from BC → sales rep doesn't know if paid

### Solution WITHOUT Fabric/Copilot

#### Power Automate Flow: D365 Quote → BC Sales Order

```yaml
Flow: Quote to Cash Integration

Trigger: When Quote status changes to "Won" (Dataverse)

Actions:
  1. Get Quote details:
     - Quote lines
     - Customer info
     - Pricing

  2. Find or Create BC Customer:
     - Search BC by email
     - If not found, create customer in BC

  3. Create Sales Order in BC:
     POST to BC API: /companies({id})/salesOrders
     Body:
       customerNumber: {BC Customer Number}
       externalDocumentNumber: {D365 Quote Number}

  4. For each Quote Line:
     POST to BC API: /companies({id})/salesOrderLines
     Body:
       documentId: {Sales Order ID}
       itemId: {Map D365 Product to BC Item}
       quantity: {Quote Line Quantity}
       unitPrice: {Quote Line Price}

  5. Update D365 Quote:
     - Set BC Sales Order Number
     - Set integration status = "Synced"

  6. Send notification via Graph:
     - Email to finance team
     - Teams message to sales rep
```

#### Webhook: BC Invoice Posted → Update D365

```python
# Azure Function triggered by BC webhook
import azure.functions as func
import requests

def main(req: func.HttpRequest) -> func.HttpResponse:
    webhook_data = req.get_json()

    # BC sends notification when invoice is posted
    if webhook_data["eventType"] == "salesInvoice.posted":
        invoice = webhook_data["data"]

        # Find the original D365 opportunity/quote
        external_doc = invoice["externalDocumentNumber"]  # D365 Quote number

        # Update D365 Opportunity
        d365_response = requests.patch(
            f"{D365_URL}/api/data/v9.2/opportunities({opportunity_id})",
            headers={
                "Authorization": f"Bearer {d365_token}",
                "Content-Type": "application/json"
            },
            json={
                "bc_invoicenumber": invoice["number"],
                "bc_invoicedate": invoice["invoiceDate"],
                "bc_invoiceamount": invoice["totalAmountIncludingTax"],
                "bc_integrationstatus": "Invoiced"
            }
        )

        # Send email notification via Graph
        send_notification(
            to=invoice["sellToContact"],
            subject=f"Invoice {invoice['number']} has been sent",
            body=f"Invoice for £{invoice['totalAmountIncludingTax']} is now available."
        )

    return func.HttpResponse("OK", status_code=200)
```

#### Status Dashboard (Power BI Embedded in D365)

```sql
-- Power BI dataset query
SELECT
    q.quotenumber AS quote_number,
    q.name AS quote_name,
    a.name AS customer_name,
    q.totalamount AS quote_value,
    q.statecode AS quote_status,

    so.number AS bc_order_number,
    so.status AS bc_order_status,

    si.number AS bc_invoice_number,
    si.totalAmountIncludingTax AS invoice_amount,
    si.dueDate AS invoice_due_date,
    si.remainingAmount AS outstanding_amount,

    CASE
        WHEN si.remainingAmount = 0 THEN 'Paid'
        WHEN si.dueDate < GETDATE() THEN 'Overdue'
        WHEN si.number IS NOT NULL THEN 'Invoiced'
        WHEN so.number IS NOT NULL THEN 'Ordered'
        ELSE 'Quoted'
    END AS pipeline_stage

FROM d365_quotes q
LEFT JOIN d365_accounts a ON q.customerid = a.accountid
LEFT JOIN bc_salesorders so ON so.externalDocumentNumber = q.quotenumber
LEFT JOIN bc_salesinvoices si ON si.orderNumber = so.number
```

---

### Solution WITH Fabric + Copilot

#### Fabric Data Pipeline

```python
# Fabric Data Factory pipeline
from azure.datafactory import DataFactoryManagementClient

pipeline = {
    "name": "QuoteToCashSync",
    "activities": [
        {
            "name": "ExtractD365Quotes",
            "type": "Copy",
            "source": {
                "type": "DynamicsSource",
                "query": "quotes?$filter=statecode eq 1"  # Won quotes
            },
            "sink": {
                "type": "LakehouseTable",
                "tableName": "staging_quotes"
            }
        },
        {
            "name": "TransformAndMatch",
            "type": "DataFlow",
            "dataFlow": {
                "name": "QuoteToOrderMapping",
                "transformations": [
                    {"name": "MapProductsToItems"},
                    {"name": "CalculatePricing"},
                    {"name": "ValidateCreditLimit"}
                ]
            }
        },
        {
            "name": "CreateBCOrders",
            "type": "WebActivity",
            "url": "{BC_API}/companies({id})/salesOrders",
            "method": "POST",
            "dependsOn": ["TransformAndMatch"]
        }
    ],
    "triggers": [
        {
            "name": "RealTimeSync",
            "type": "EventTrigger",
            "eventType": "Microsoft.Dynamics.CRM.Update",
            "filter": "statecode eq 1"
        }
    ]
}
```

#### Copilot for Quote-to-Cash

Users can ask:

| Question | What Happens |
|----------|--------------|
| "What's the status of the Contoso quote?" | Shows quote, order, invoice, payment status |
| "Why is the ABC Corp order stuck?" | Analyzes integration logs, identifies BC credit block |
| "Create a sales order in BC for quote Q-00123" | Triggers Power Automate flow with validation |
| "Show me all quotes won this month that aren't invoiced yet" | Queries unified model, highlights gaps |
| "What's our quote-to-cash cycle time by product category?" | Analyzes timestamps across systems |

---

## Use Case 3: Marketing Campaign ROI

### The Problem
- Marketing runs campaigns in D365 Marketing
- Can't see actual revenue generated (BC data)
- No connection between campaign leads and paid invoices

### Solution WITHOUT Fabric/Copilot

#### Data Integration Architecture

```
D365 Marketing Campaigns
         │
         ├── Leads
         │      │
         │      ▼
         ├── Opportunities (attributed to campaign)
         │      │
         │      ▼
         └── Won Opportunities
                │
                ▼ (Integration layer)
         BC Sales Orders
                │
                ▼
         BC Invoices
                │
                ▼
         BC Payments ─────► Campaign ROI
```

#### Power Automate: Track Campaign Attribution

```yaml
Flow: Campaign Revenue Attribution

Trigger: When payment is recorded in BC (via webhook)

Actions:
  1. Get Invoice from BC:
     - Include order reference

  2. Get Sales Order from BC:
     - Include external document number (D365 reference)

  3. Find D365 Opportunity:
     - Match by external document number

  4. Get Campaign attribution:
     - Query opportunity's originating lead
     - Get lead's source campaign

  5. Update Campaign Actual Revenue:
     PATCH campaigns({campaignId})
     Body:
       actualRevenue: {current} + {payment amount}

  6. Create Campaign Response record:
     - Link payment to campaign
     - Record attribution data
```

#### SQL View for Campaign ROI

```sql
CREATE VIEW marketing_campaign_roi AS
SELECT
    c.name AS campaign_name,
    c.actualStart AS campaign_start,
    c.actualEnd AS campaign_end,
    c.budgetedCost AS budget,

    -- Lead metrics
    COUNT(DISTINCT l.leadid) AS total_leads,
    COUNT(DISTINCT CASE WHEN l.statecode = 1 THEN l.leadid END) AS qualified_leads,

    -- Opportunity metrics
    COUNT(DISTINCT o.opportunityid) AS opportunities_created,
    SUM(CASE WHEN o.statecode = 1 THEN o.actualvalue ELSE 0 END) AS won_value,

    -- Revenue metrics (from BC)
    SUM(p.amount) AS actual_revenue,

    -- ROI calculation
    CASE
        WHEN c.budgetedCost > 0
        THEN ((SUM(p.amount) - c.budgetedCost) / c.budgetedCost) * 100
        ELSE 0
    END AS roi_percentage

FROM d365_campaigns c
LEFT JOIN d365_leads l ON l.campaignid = c.campaignid
LEFT JOIN d365_opportunities o ON o.originatingleadid = l.leadid
LEFT JOIN bc_salesorders so ON so.externalDocumentNumber = o.opportunityid
LEFT JOIN bc_payments p ON p.documentNumber = so.number
GROUP BY c.campaignid, c.name, c.actualStart, c.actualEnd, c.budgetedCost;
```

---

### Solution WITH Fabric + Copilot

#### Fabric Unified Marketing Analytics

```python
# Fabric notebook - Marketing attribution model
from pyspark.sql import functions as F

# Load all data sources
campaigns = spark.table("d365_campaigns")
leads = spark.table("d365_leads")
opportunities = spark.table("d365_opportunities")
orders = spark.table("bc_salesorders")
invoices = spark.table("bc_salesinvoices")
payments = spark.table("bc_payments")

# Build attribution chain
attribution = campaigns \
    .join(leads, campaigns.campaignid == leads.campaignid, "left") \
    .join(opportunities, leads.leadid == opportunities.originatingleadid, "left") \
    .join(orders, opportunities.opportunityid == orders.externalDocumentNumber, "left") \
    .join(invoices, orders.number == invoices.orderNumber, "left") \
    .join(payments, invoices.number == payments.documentNumber, "left")

# Calculate metrics
campaign_roi = attribution.groupBy("campaign_name", "budgetedCost") \
    .agg(
        F.countDistinct("leadid").alias("leads"),
        F.countDistinct("opportunityid").alias("opportunities"),
        F.sum("payment_amount").alias("revenue"),
        F.first("budgetedCost").alias("budget")
    ) \
    .withColumn("roi",
        (F.col("revenue") - F.col("budget")) / F.col("budget") * 100
    )

campaign_roi.write.format("delta").mode("overwrite").saveAsTable("campaign_roi")
```

#### Copilot Marketing Queries

| Question | Response |
|----------|----------|
| "Which campaign had the best ROI this quarter?" | Analyzes all campaigns, ranks by ROI |
| "How long does it take for a lead to become revenue?" | Calculates lead-to-cash cycle time |
| "Show me campaigns where spend exceeds revenue" | Identifies underperforming campaigns |
| "What's the revenue attribution for the trade show?" | Traces all leads → opportunities → orders → payments |
| "Predict campaign ROI based on current pipeline" | Uses ML model on historical data |

---

## Use Case 4: Credit Management Alerts

### The Problem
- Sales keeps selling to customers on credit hold in BC
- No real-time visibility of credit status in CRM
- Finance manually emails sales about credit issues

### Solution WITHOUT Fabric/Copilot

#### Real-time Credit Status Sync

```yaml
Power Automate Flow: BC Credit Status → D365

Trigger: Scheduled (every 15 minutes)

Actions:
  1. Get all BC customers with credit issues:
     GET /customers?$filter=blocked ne '' or balance gt creditLimit

  2. For each customer:
     a. Find matching D365 Account (by email or name)

     b. Update D365 Account:
        - bc_creditstatus: "Blocked" or "Over Limit"
        - bc_balance: {current balance}
        - bc_creditlimit: {credit limit}

     c. If status changed to blocked:
        - Get Account Owner from D365
        - Send Teams notification via Graph
        - Create Task for account review

  3. Update accounts no longer blocked:
     - Set bc_creditstatus: "Good Standing"
     - Send "cleared" notification
```

#### Teams Notification via Graph

```python
def send_credit_alert(customer_name, account_owner_email, credit_status, balance, limit):
    """Send Teams notification when credit status changes"""

    # Get user's Teams chat
    user_id = get_user_id_from_email(account_owner_email)

    # Create adaptive card
    card = {
        "type": "AdaptiveCard",
        "body": [
            {
                "type": "TextBlock",
                "size": "Large",
                "weight": "Bolder",
                "text": f"⚠️ Credit Alert: {customer_name}",
                "color": "Attention"
            },
            {
                "type": "FactSet",
                "facts": [
                    {"title": "Status", "value": credit_status},
                    {"title": "Balance", "value": f"£{balance:,.2f}"},
                    {"title": "Credit Limit", "value": f"£{limit:,.2f}"},
                    {"title": "Over by", "value": f"£{max(0, balance - limit):,.2f}"}
                ]
            },
            {
                "type": "TextBlock",
                "text": "Please do not process new orders until resolved.",
                "wrap": True
            }
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "View in D365",
                "url": f"{D365_URL}/main.aspx?etn=account&id={account_id}"
            },
            {
                "type": "Action.OpenUrl",
                "title": "View in BC",
                "url": f"{BC_URL}/CustomerCard?customerNo={bc_customer_no}"
            }
        ]
    }

    # Send via Graph
    requests.post(
        f"https://graph.microsoft.com/v1.0/users/{user_id}/chats/{chat_id}/messages",
        headers={"Authorization": f"Bearer {graph_token}"},
        json={
            "body": {
                "contentType": "html",
                "content": f"<attachment id='card'></attachment>"
            },
            "attachments": [{
                "id": "card",
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": json.dumps(card)
            }]
        }
    )
```

#### D365 Business Rule: Block Opportunity Creation

```javascript
// D365 JavaScript web resource
function onOpportunityCreate(executionContext) {
    var formContext = executionContext.getFormContext();
    var accountId = formContext.getAttribute("parentaccountid").getValue();

    if (accountId) {
        // Check BC credit status (stored on Account)
        Xrm.WebApi.retrieveRecord("account", accountId[0].id,
            "?$select=bc_creditstatus,bc_balance,bc_creditlimit")
        .then(function(account) {
            if (account.bc_creditstatus === "Blocked" ||
                account.bc_creditstatus === "Over Limit") {

                // Show warning
                formContext.ui.setFormNotification(
                    `⚠️ This customer has credit issues: ${account.bc_creditstatus}. ` +
                    `Balance: £${account.bc_balance}, Limit: £${account.bc_creditlimit}. ` +
                    `Please contact Finance before proceeding.`,
                    "WARNING",
                    "creditWarning"
                );

                // Optionally prevent save
                // executionContext.getEventArgs().preventDefault();
            }
        });
    }
}
```

---

### Solution WITH Fabric + Copilot

#### Real-time Credit Monitoring with Fabric

```python
# Fabric Real-Time Analytics
from pyspark.sql.streaming import *

# Stream BC customer changes
bc_stream = spark.readStream \
    .format("delta") \
    .table("bc_customers")

# Stream D365 opportunity creation
d365_stream = spark.readStream \
    .format("delta") \
    .table("d365_opportunities")

# Join and detect violations
violations = d365_stream \
    .join(bc_stream, d365_stream.account_email == bc_stream.email) \
    .filter(
        (bc_stream.blocked.isNotNull()) |
        (bc_stream.balance > bc_stream.creditLimit)
    ) \
    .select(
        "opportunity_name",
        "account_name",
        "sales_rep",
        "blocked",
        "balance",
        "creditLimit"
    )

# Write alerts to event hub
violations.writeStream \
    .format("eventhub") \
    .option("eventhub.connectionString", EVENT_HUB_CONN) \
    .start()
```

#### Copilot Credit Queries

| Question | Response |
|----------|----------|
| "Are there any opportunities with customers on credit hold?" | Lists all violations in real-time |
| "What's the total pipeline value at credit risk?" | Sums opportunity values for blocked customers |
| "Who keeps creating opportunities for blocked customers?" | Identifies sales reps, suggests training |
| "When was ABC Corp put on credit hold and why?" | Shows BC history, related D365 activities |
| "Clear the credit hold for Contoso and notify sales" | Triggers workflow, sends notifications |

---

## Comparison: With vs Without Fabric/Copilot

| Aspect | Without Fabric/Copilot | With Fabric/Copilot |
|--------|------------------------|---------------------|
| **Setup Complexity** | Moderate - Power Automate, custom code | Higher initial - Fabric workspace setup |
| **Real-time Capability** | Near real-time (polling/webhooks) | True real-time (streaming) |
| **Query Flexibility** | Pre-built reports and views | Natural language, ad-hoc queries |
| **Data Volume** | Limited by API throttling | Handles large datasets efficiently |
| **User Experience** | Dashboards, forms, notifications | Conversational, self-service |
| **Maintenance** | Multiple flows to maintain | Centralized data model |
| **Cost** | Lower (included in licenses) | Additional Fabric licensing |
| **AI Capabilities** | Limited to built-in features | Full AI/ML integration |
| **Cross-system Joins** | Complex, often manual | Native unified queries |
| **Historical Analysis** | Limited by source retention | Full data lake history |

---

## Recommended Approach for Your Colleagues

### Phase 1: Quick Wins (Without Fabric)
1. **Virtual Tables**: Enable BC data visibility in D365 forms
2. **Power Automate Sync**: Keep customer data synchronized
3. **Teams Alerts**: Notify sales of credit issues via Graph
4. **Power BI Dashboard**: Embed unified view in D365

### Phase 2: Enhanced Integration
1. **Webhooks**: Real-time sync for critical data
2. **Azure Functions**: Custom logic for complex scenarios
3. **PCF Controls**: Rich embedded experiences in D365

### Phase 3: Fabric + Copilot (When Ready)
1. **Fabric Lakehouse**: Unified data storage
2. **Semantic Model**: Business-friendly data layer
3. **Copilot**: Natural language access for all users

---

## Resources

- **Dynamics 365 + BC Integration Guide**: https://learn.microsoft.com/en-us/dynamics365/business-central/admin-common-data-service
- **Virtual Tables**: https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-virtual-tables-using-connectors
- **Microsoft Fabric**: https://learn.microsoft.com/en-us/fabric/
- **Copilot for Dynamics 365**: https://learn.microsoft.com/en-us/dynamics365/copilot/

---

*Last updated: February 2026*
