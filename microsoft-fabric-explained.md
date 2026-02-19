# Microsoft Fabric: The Analytics Layer

> Understanding how Fabric fits into the Microsoft ecosystem alongside Graph, Dataverse, Business Central, and Dynamics 365

## Key Concept

**Fabric is NOT for running your business day-to-day. It's for ANALYZING your business.**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TWO DIFFERENT PURPOSES                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   OPERATIONAL (Run the business)      ANALYTICAL (Analyze the business) │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐   │
│   │                             │    │                             │   │
│   │  Dataverse / D365 / BC      │    │    Microsoft Fabric         │   │
│   │                             │    │                             │   │
│   │  • Create a quote           │    │  • What's our win rate?     │   │
│   │  • Process an invoice       │    │  • Revenue trends over 3yrs │   │
│   │  • Update customer record   │    │  • Predict next quarter     │   │
│   │  • Send an email            │    │  • Find patterns in data    │   │
│   │  • Log a support case       │    │  • ML models                │   │
│   │                             │    │                             │   │
│   │  Real-time, transactional   │    │  Historical, analytical     │   │
│   │  Millions of records        │    │  Billions of records        │   │
│   └─────────────────────────────┘    └─────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## What is Fabric?

**Microsoft Fabric** is a unified analytics platform that combines:

| Component | What It Does | Replaces |
|-----------|--------------|----------|
| **OneLake** | Single data lake for everything | Azure Data Lake |
| **Data Factory** | Data pipelines, ETL | Azure Data Factory |
| **Synapse Data Engineering** | Spark, big data processing | Azure Synapse |
| **Synapse Data Warehouse** | SQL analytics at scale | Azure Synapse DW |
| **Synapse Data Science** | ML, notebooks, experiments | Azure ML |
| **Real-Time Analytics** | Streaming data, KQL | Azure Data Explorer |
| **Power BI** | Visualization, dashboards | Power BI (same) |

**Key Point:** Fabric unifies all these into ONE platform with ONE license and ONE data copy.

---

## Where Fabric Fits in the Stack

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER LAYER                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  D365     │  │  Power    │  │  Power BI │  │  Copilot  │           │
│  │  Apps     │  │  Apps     │  │           │  │           │           │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘           │
│        │              │              │              │                  │
│   Transactional  Transactional   Analytical    Both                   │
└────────┼──────────────┼──────────────┼──────────────┼───────────────────┘
         │              │              │              │
         ▼              ▼              │              │
┌─────────────────────────────────────────────────────────────────────────┐
│                     OPERATIONAL DATA (Dataverse)                        │
│  • Current state of business                                            │
│  • Accounts, Contacts, Opportunities, Orders                            │
│  • Virtual Tables to BC                                                 │
│  • Optimized for: CRUD operations, workflows, forms                     │
└─────────────────────────────────────────────────────────────────────────┘
         │                                           │
         │ Link to Fabric                            │
         │ (Data sync)                               │
         ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     ANALYTICAL DATA (Fabric)                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         OneLake                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Dataverse    │  │ BC Data      │  │ External     │          │   │
│  │  │ (D365 copy)  │  │ (Finance)    │  │ Data         │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  • Historical data (years of history)                                   │
│  • Combined/unified views                                               │
│  • Optimized for: Complex queries, aggregations, ML                     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Dataverse vs Fabric: When to Use Which

| Question | Use Dataverse | Use Fabric |
|----------|---------------|------------|
| "What's this customer's current balance?" | ✅ | |
| "What was our revenue trend over 3 years?" | | ✅ |
| "Create a new sales order" | ✅ | |
| "Which products have declining sales?" | | ✅ |
| "Update the customer's address" | ✅ | |
| "Predict which deals will close this quarter" | | ✅ |
| "Show me customers over credit limit" | ✅ (real-time) | ✅ (historical) |
| "Train ML model on sales patterns" | | ✅ |
| "Send alert when invoice overdue" | ✅ | |
| "What's the average days-to-pay by region?" | | ✅ |

---

## How Fabric Connects to Everything

### Data Flow Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Dynamics   │     │   Business   │     │  Microsoft   │
│     365      │     │   Central    │     │    Graph     │
│  (Dataverse) │     │              │     │   (M365)     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       │   Dataverse        │   BC               │   Graph
       │   Link to Fabric   │   Connector        │   Connector
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│                     MICROSOFT FABRIC                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    OneLake                         │  │
│  │                                                    │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐    │  │
│  │  │ Lakehouse  │ │ Lakehouse  │ │ Lakehouse  │    │  │
│  │  │ D365 Data  │ │ BC Data    │ │ M365 Data  │    │  │
│  │  │            │ │            │ │            │    │  │
│  │  │ Accounts   │ │ Customers  │ │ Emails     │    │  │
│  │  │ Opptys     │ │ Invoices   │ │ Meetings   │    │  │
│  │  │ Leads      │ │ Payments   │ │ Files      │    │  │
│  │  │ Cases      │ │ Items      │ │            │    │  │
│  │  └────────────┘ └────────────┘ └────────────┘    │  │
│  │                                                    │  │
│  │         All data accessible via ONE query          │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│                           ▼                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              Semantic Model                        │  │
│  │  (Unified business definitions)                   │  │
│  │                                                    │  │
│  │  Customer = D365.Account + BC.Customer            │  │
│  │  Revenue = BC.Invoice.Amount (where paid)         │  │
│  │  Pipeline = D365.Opportunity (where open)         │  │
│  └───────────────────────────────────────────────────┘  │
│                           │                              │
│              ┌────────────┼────────────┐                │
│              ▼            ▼            ▼                │
│         Power BI     Data Science    Copilot            │
│        Dashboards    ML Models     NL Queries           │
└─────────────────────────────────────────────────────────┘
```

---

## Fabric Features Explained

### 1. OneLake (The Foundation)

**What:** Single storage layer for ALL your data.

**Key Concept:** "One copy of data, many uses"

```
Traditional (Before Fabric):
┌─────────┐    Copy    ┌─────────┐    Copy    ┌─────────┐
│ Source  │ ────────► │ DW      │ ────────► │ Power BI│
│ (BC)    │           │ (Synapse)│           │ Dataset │
└─────────┘           └─────────┘           └─────────┘
  3 copies of data = 3x storage cost, sync issues

With Fabric OneLake:
┌─────────┐           ┌─────────────────────────────────┐
│ Source  │ ───────► │ OneLake (single copy)           │
│ (BC)    │          │   ↓           ↓           ↓     │
└─────────┘          │ Warehouse  Lakehouse  Power BI  │
                     │ (same data, different views)    │
                     └─────────────────────────────────┘
```

### 2. Lakehouse (Storage + Compute)

**What:** Combines data lake flexibility with data warehouse structure.

```python
# Fabric Notebook - Create unified customer table
from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

# Read from Dataverse (D365)
d365_accounts = spark.read.format("dataverse").load("accounts")

# Read from Business Central
bc_customers = spark.read.format("businesscentral").load("customers")

# Join them
unified_customers = d365_accounts.join(
    bc_customers,
    d365_accounts.emailaddress1 == bc_customers.email,
    "full_outer"
).select(
    d365_accounts.accountid,
    d365_accounts.name,
    d365_accounts.revenue.alias("crm_revenue"),
    bc_customers.balance.alias("bc_balance"),
    bc_customers.creditLimit.alias("bc_credit_limit")
)

# Save as Delta table
unified_customers.write.format("delta").saveAsTable("unified_customers")
```

### 3. Data Warehouse (SQL Analytics)

**What:** Run SQL queries at massive scale.

```sql
-- Fabric SQL Endpoint
-- Query across D365 and BC data in one statement

SELECT
    c.name AS customer_name,
    c.crm_revenue,
    c.bc_balance,
    c.bc_credit_limit,

    -- CRM metrics
    COUNT(DISTINCT o.opportunityid) AS open_opportunities,
    SUM(o.estimatedvalue) AS pipeline_value,

    -- Finance metrics
    COUNT(DISTINCT i.invoiceid) AS total_invoices,
    SUM(CASE WHEN i.status = 'Overdue' THEN i.amount ELSE 0 END) AS overdue_amount,
    AVG(DATEDIFF(day, i.invoicedate, i.paymentdate)) AS avg_days_to_pay,

    -- Combined insights
    CASE
        WHEN c.bc_balance > c.bc_credit_limit THEN 'Credit Risk'
        WHEN SUM(o.estimatedvalue) > 100000 AND c.bc_balance > 50000 THEN 'High Value at Risk'
        ELSE 'Normal'
    END AS risk_status

FROM unified_customers c
LEFT JOIN d365_opportunities o ON c.accountid = o.parentaccountid
LEFT JOIN bc_invoices i ON c.bc_customer_number = i.customernumber
GROUP BY c.name, c.crm_revenue, c.bc_balance, c.bc_credit_limit
ORDER BY pipeline_value DESC
```

### 4. Data Science (ML & AI)

**What:** Build and deploy machine learning models.

```python
# Fabric Notebook - Predict deal closure
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# Load historical opportunity data
opportunities = spark.table("d365_opportunities_history").toPandas()

# Features
features = opportunities[[
    'estimatedvalue',
    'days_in_stage',
    'customer_bc_balance',
    'customer_payment_history_score',
    'number_of_contacts',
    'email_engagement_score'
]]

# Target: Did it close?
target = opportunities['won']

# Train model
X_train, X_test, y_train, y_test = train_test_split(features, target)
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Save model for scoring new opportunities
import mlflow
mlflow.sklearn.log_model(model, "deal_predictor")
```

### 5. Real-Time Analytics

**What:** Analyze streaming data as it arrives.

```kusto
// KQL Query - Real-time order monitoring
Orders
| where Timestamp > ago(1h)
| summarize
    OrderCount = count(),
    TotalValue = sum(Amount),
    AvgOrderValue = avg(Amount)
  by bin(Timestamp, 5m), Region
| render timechart
```

### 6. Power BI (Visualization)

**What:** Dashboards and reports - now directly connected to OneLake.

```
Before Fabric: Power BI → Import data → Create dataset → Build report
With Fabric:   Power BI → Direct Lake mode → Query OneLake → Build report
                          (No data copy needed)
```

---

## Practical Example: Campaign ROI Analysis

### The Scenario
Marketing wants to know: "Which campaigns generated actual paid revenue, not just won opportunities?"

### Without Fabric (Manual Process)

```
1. Export campaign data from D365 Marketing
2. Export opportunity data from D365 Sales
3. Export invoice data from Business Central
4. Export payment data from Business Central
5. Load all into Excel/Power BI
6. Manually match records
7. Build report
8. Repeat monthly (data is now stale)
```

### With Fabric (Automated)

```python
# Fabric Notebook - Campaign ROI (runs automatically on schedule)

# All data already in OneLake
campaigns = spark.table("d365_campaigns")
leads = spark.table("d365_leads")
opportunities = spark.table("d365_opportunities")
invoices = spark.table("bc_invoices")
payments = spark.table("bc_payments")

# Build complete attribution in one query
campaign_roi = campaigns \
    .join(leads, "campaignid") \
    .join(opportunities, leads.leadid == opportunities.originatingleadid) \
    .join(invoices, opportunities.opportunityid == invoices.externalref) \
    .join(payments, invoices.invoiceid == payments.invoiceid) \
    .groupBy("campaign_name", "budget") \
    .agg(
        count("leadid").alias("leads"),
        sum("payment_amount").alias("actual_revenue")
    ) \
    .withColumn("roi", (col("actual_revenue") - col("budget")) / col("budget") * 100)

# Save for Power BI
campaign_roi.write.format("delta").mode("overwrite").saveAsTable("campaign_roi")
```

**Result:** Marketing can now see real-time campaign ROI in Power BI, updated automatically.

---

## Copilot + Fabric

With Fabric's semantic model, Copilot can answer natural language questions:

| User Asks | Copilot Does |
|-----------|--------------|
| "Which customers have overdue invoices and open opportunities over £50k?" | Queries unified_customers + bc_invoices + d365_opportunities |
| "Show me the trend of average days-to-pay by customer segment" | Time-series analysis on bc_payments joined with d365_accounts |
| "Predict which deals will close this month" | Runs ML model on current pipeline |
| "Why did revenue drop in March?" | Analyzes invoices, payments, opportunities, identifies patterns |
| "Create a report showing campaign performance" | Generates Power BI report from campaign_roi table |

---

## When Do You Need Fabric?

### You DON'T Need Fabric If:
- ✅ Dataverse Virtual Tables solve your real-time visibility problem
- ✅ Power BI with direct connectors meets your reporting needs
- ✅ Your data volumes are moderate (millions, not billions)
- ✅ You don't need ML/AI capabilities
- ✅ Simple Power Automate flows handle your integration

### You DO Need Fabric If:
- ❌ You need to analyze years of historical data
- ❌ You're combining data from 5+ sources
- ❌ You need ML predictions (deal scoring, churn prediction)
- ❌ You have billions of rows
- ❌ You need real-time streaming analytics
- ❌ You want Copilot to query across all your business data

---

## Recommended Implementation Approach

### Phase 1: Solve the Immediate Problem (No Fabric)
```
Dataverse Virtual Tables + Power BI
- Sales sees BC data in D365 ✓
- Basic dashboards work ✓
- Cost: Included in D365 license
```

### Phase 2: Enhanced Analytics (Power BI Premium)
```
Power BI with Dataflows
- Pull BC and D365 data into Power BI datasets
- Build unified reports
- Scheduled refresh
- Cost: Power BI Premium (~$20/user/month)
```

### Phase 3: Full Analytics Platform (Fabric)
```
Microsoft Fabric
- OneLake with all data sources
- ML predictions
- Copilot natural language
- Historical analysis at scale
- Cost: Fabric capacity (~$300+/month for F2)
```

---

## Setting Up Fabric

### Step 1: Get Fabric Capacity

1. Go to Azure Portal or Microsoft 365 Admin Center
2. Purchase Fabric capacity (F2 minimum for production)
3. Or use Power BI Premium Per User for smaller scale

### Step 2: Create Workspace

1. Go to https://app.fabric.microsoft.com
2. Create new workspace
3. Assign to Fabric capacity

### Step 3: Connect Data Sources

#### Connect Dataverse (D365)
```python
# Fabric Notebook
df = spark.read.format("com.microsoft.cdm") \
    .option("cdmModel", "https://org.crm.dynamics.com") \
    .option("entity", "account") \
    .load()
```

#### Connect Business Central
```python
# Use Data Factory pipeline or Dataflow Gen2
# BC connector available in Power Query
```

#### Connect via Dataverse Link to Fabric
1. In Power Platform Admin Center
2. Select environment
3. Enable "Link to Fabric"
4. Choose tables to sync
5. Data automatically appears in OneLake

### Step 4: Create Lakehouse

1. In Fabric workspace, create new Lakehouse
2. Load data via notebooks or pipelines
3. Create Delta tables for unified views

### Step 5: Build Semantic Model

1. Create new Semantic Model in workspace
2. Connect to Lakehouse tables
3. Define relationships (Account → bc_customers)
4. Create measures and KPIs
5. Publish for Power BI and Copilot

---

## Cost Comparison

| Approach | Monthly Cost | Capabilities |
|----------|--------------|--------------|
| **Dataverse + Power BI Pro** | ~$10-20/user | Basic reporting, Virtual Tables |
| **Power BI Premium Per User** | ~$20/user | Dataflows, larger datasets |
| **Fabric F2** | ~$300/month | Full Fabric, small workloads |
| **Fabric F64** | ~$5,000/month | Production workloads, ML |
| **Fabric F128+** | ~$10,000+/month | Enterprise scale |

---

## Complete Architecture Summary

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
│  ─────┼──────────┼──────────┼──────────┼──────────┼────────────────── │
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
│  ───────────┼─────────────────────────┼──────────┼─────────────────── │
│             │                         │          │                    │
│             │    Sync to Fabric       │          ▼                    │
│             │                         │    ┌───────────┐              │
│             └─────────────────────────┼───►│  FABRIC   │              │
│                                       │    │           │              │
│  ┌──────────────────────┐            │    │ • OneLake │              │
│  │   BUSINESS CENTRAL   │────────────┼───►│ • ML      │              │
│  │   (Own database)     │            │    │ • History │              │
│  └──────────────────────┘            │    └───────────┘              │
│                                       │          │                    │
│                                       └──────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

SUMMARY:
• Graph     = M365 data (emails, calendar, files)
• Dataverse = Operational data (run the business)
• BC        = Finance data (own database, connects via Virtual Tables)
• Fabric    = Analytics data (analyze the business, ML, history)
• Copilot   = Works with ALL of them via natural language
```

---

## Resources

- **Microsoft Fabric Documentation:** https://learn.microsoft.com/en-us/fabric/
- **Fabric Getting Started:** https://learn.microsoft.com/en-us/fabric/get-started/
- **OneLake:** https://learn.microsoft.com/en-us/fabric/onelake/
- **Dataverse Link to Fabric:** https://learn.microsoft.com/en-us/power-apps/maker/data-platform/azure-synapse-link-select-fno-data
- **Fabric Pricing:** https://azure.microsoft.com/en-us/pricing/details/microsoft-fabric/

---

*Last updated: February 2026*
