# Microsoft Business Central & Dynamics 365 Integration with Graph

> Understanding how Business Central, Dynamics 365, and Microsoft Graph work together

## Overview

**Business Central and Dynamics 365 have their own APIs** - they're not directly accessed through Microsoft Graph. However, they can **connect to Graph** for M365 data.

---

## The Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Microsoft Graph                          │
│         (M365: Mail, Calendar, Teams, OneDrive)             │
└─────────────────────────┬───────────────────────────────────┘
                          │ Can connect to
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Dynamics 365 / Business Central                │
│                    (Their own APIs)                         │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Business Central│  │  Dynamics 365   │  │ Dataverse   │ │
│  │      API        │  │      API        │  │   (CDS)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Business Central APIs

Business Central has its **own REST API**, not Graph.

### Base URL

```
https://api.businesscentral.dynamics.com/v2.0/{environment}/api/v2.0
```

### Example Endpoints

```
# Get companies
GET /companies

# Get customers
GET /companies({companyId})/customers

# Get sales orders
GET /companies({companyId})/salesOrders

# Get invoices
GET /companies({companyId})/salesInvoices

# Get items/inventory
GET /companies({companyId})/items

# Get vendors
GET /companies({companyId})/vendors

# Get employees
GET /companies({companyId})/employees

# Get purchase orders
GET /companies({companyId})/purchaseOrders
```

### Sample Query

```
https://api.businesscentral.dynamics.com/v2.0/production/api/v2.0/companies({id})/customers?$top=10
```

### Common Business Central Entities

| Entity | Endpoint | Description |
|--------|----------|-------------|
| Companies | `/companies` | List of companies in BC |
| Customers | `/companies({id})/customers` | Customer master data |
| Vendors | `/companies({id})/vendors` | Supplier/vendor data |
| Items | `/companies({id})/items` | Inventory items |
| Sales Orders | `/companies({id})/salesOrders` | Sales order headers |
| Sales Invoices | `/companies({id})/salesInvoices` | Posted sales invoices |
| Purchase Orders | `/companies({id})/purchaseOrders` | Purchase order headers |
| Employees | `/companies({id})/employees` | Employee records |
| GL Accounts | `/companies({id})/accounts` | Chart of accounts |
| Journals | `/companies({id})/journals` | General journals |

---

## 2. Dynamics 365 APIs

Dynamics 365 uses **Dataverse (Common Data Service)** Web API.

### Base URL

```
https://{org}.crm.dynamics.com/api/data/v9.2
```

### Example Endpoints

```
# Get accounts
GET /accounts

# Get contacts
GET /contacts

# Get opportunities
GET /opportunities

# Get leads
GET /leads

# Get orders
GET /salesorders

# Get products
GET /products

# Get cases/incidents
GET /incidents

# Get activities
GET /activitypointers
```

### Common Dynamics 365 Entities

| Entity | Endpoint | Description |
|--------|----------|-------------|
| Accounts | `/accounts` | Company/organization records |
| Contacts | `/contacts` | Individual people |
| Leads | `/leads` | Potential customers |
| Opportunities | `/opportunities` | Sales opportunities |
| Orders | `/salesorders` | Sales orders |
| Products | `/products` | Product catalog |
| Cases | `/incidents` | Customer service cases |
| Activities | `/activitypointers` | Emails, calls, tasks, etc. |
| Quotes | `/quotes` | Sales quotes |
| Invoices | `/invoices` | Invoices |

---

## 3. How They Connect to Graph

While BC and D365 have their own APIs, they **integrate with Graph** for M365 features:

| Feature | How It Works |
|---------|--------------|
| **Outlook integration** | BC/D365 use Graph to sync contacts, send emails |
| **Teams integration** | Embed BC/D365 data in Teams via Graph connectors |
| **OneDrive/SharePoint** | Store documents linked to BC/D365 records |
| **Excel integration** | Edit BC data in Excel via Graph |
| **Calendar sync** | Sync D365 activities with Outlook calendar |
| **Email tracking** | Track Outlook emails against D365 records |

### Built-in Integrations

#### Business Central + M365
- **Outlook Add-in**: View BC data directly in Outlook
- **Excel Integration**: Open BC data in Excel, edit, and sync back
- **Teams App**: Access BC from within Teams
- **OneDrive**: Attach files to BC records

#### Dynamics 365 + M365
- **Outlook App**: Track emails, create contacts from Outlook
- **Teams Integration**: Collaborate on D365 records in Teams
- **SharePoint**: Document management linked to records
- **OneNote**: Link notes to D365 records

---

## 4. Integration Options

### Option A: Use Each API Separately

```
Your App
   ├── Microsoft Graph API  → M365 data (emails, calendar, files)
   ├── Business Central API → Financial data (invoices, orders, inventory)
   └── Dynamics 365 API     → CRM data (contacts, opportunities, cases)
```

### Option B: Use Power Platform as Middleware

```
Your App → Power Automate → Business Central
                         → Dynamics 365
                         → Microsoft Graph
```

**Benefits:**
- Pre-built connectors for all three
- No-code/low-code integration
- Built-in error handling and retry logic

### Option C: Use Azure Logic Apps

```
Your App → Logic Apps → Connectors for BC, D365, Graph
```

**Benefits:**
- Enterprise-grade reliability
- Visual workflow designer
- Hundreds of connectors

### Option D: Use Dataverse as Central Hub

```
                    Dataverse
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
Business Central   Dynamics 365   Microsoft Graph
(Virtual Tables)   (Native)       (Via connectors)
```

**Benefits:**
- Single data model
- Virtual tables for BC data
- Unified security model

---

## 5. Practical Code Examples

### Example 1: Get BC Customer + Their Emails from Graph

```python
import requests

# Configuration
BC_BASE_URL = "https://api.businesscentral.dynamics.com/v2.0/production/api/v2.0"
GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"

# Step 1: Get customer from Business Central
bc_response = requests.get(
    f"{BC_BASE_URL}/companies({{companyId}})/customers?$filter=displayName eq 'Contoso'",
    headers={"Authorization": f"Bearer {bc_token}"}
)
customer = bc_response.json()["value"][0]
customer_email = customer["email"]

print(f"Customer: {customer['displayName']}")
print(f"Email: {customer_email}")

# Step 2: Get their emails from Graph
graph_response = requests.get(
    f"{GRAPH_BASE_URL}/me/messages?$search='{customer_email}'&$top=10",
    headers={"Authorization": f"Bearer {graph_token}"}
)
emails = graph_response.json()["value"]

print(f"\nRecent emails with {customer['displayName']}:")
for email in emails:
    print(f"  - {email['subject']} ({email['receivedDateTime']})")
```

### Example 2: Create D365 Contact from Outlook Contact

```python
import requests

# Step 1: Get contact from Graph
graph_contact = requests.get(
    "https://graph.microsoft.com/v1.0/me/contacts/{contactId}",
    headers={"Authorization": f"Bearer {graph_token}"}
).json()

print(f"Outlook Contact: {graph_contact['displayName']}")

# Step 2: Create in Dynamics 365
d365_response = requests.post(
    "https://{org}.crm.dynamics.com/api/data/v9.2/contacts",
    headers={
        "Authorization": f"Bearer {d365_token}",
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0"
    },
    json={
        "firstname": graph_contact["givenName"],
        "lastname": graph_contact["surname"],
        "emailaddress1": graph_contact["emailAddresses"][0]["address"],
        "telephone1": graph_contact.get("mobilePhone", ""),
        "jobtitle": graph_contact.get("jobTitle", ""),
        "description": "Imported from Outlook via Graph API"
    }
)

if d365_response.status_code == 204:
    print("Contact created successfully in Dynamics 365!")
```

### Example 3: Sync BC Sales Order to Calendar Event

```python
import requests
from datetime import datetime, timedelta

# Step 1: Get sales order from Business Central
bc_order = requests.get(
    f"{BC_BASE_URL}/companies({{companyId}})/salesOrders({{orderId}})",
    headers={"Authorization": f"Bearer {bc_token}"}
).json()

print(f"Sales Order: {bc_order['number']}")
print(f"Customer: {bc_order['customerName']}")

# Step 2: Create calendar event via Graph
event = {
    "subject": f"Follow up: Sales Order {bc_order['number']}",
    "body": {
        "contentType": "HTML",
        "content": f"Follow up on order {bc_order['number']} for {bc_order['customerName']}<br>Amount: {bc_order['totalAmountIncludingTax']}"
    },
    "start": {
        "dateTime": (datetime.now() + timedelta(days=7)).isoformat(),
        "timeZone": "GMT Standard Time"
    },
    "end": {
        "dateTime": (datetime.now() + timedelta(days=7, hours=1)).isoformat(),
        "timeZone": "GMT Standard Time"
    },
    "reminderMinutesBeforeStart": 60
}

graph_response = requests.post(
    "https://graph.microsoft.com/v1.0/me/events",
    headers={
        "Authorization": f"Bearer {graph_token}",
        "Content-Type": "application/json"
    },
    json=event
)

if graph_response.status_code == 201:
    print("Calendar reminder created!")
```

### Example 4: Send Email with BC Invoice Details

```python
import requests

# Step 1: Get invoice from Business Central
invoice = requests.get(
    f"{BC_BASE_URL}/companies({{companyId}})/salesInvoices({{invoiceId}})",
    headers={"Authorization": f"Bearer {bc_token}"}
).json()

# Step 2: Send email via Graph
email = {
    "message": {
        "subject": f"Invoice {invoice['number']} - Payment Reminder",
        "body": {
            "contentType": "HTML",
            "content": f"""
                <h2>Payment Reminder</h2>
                <p>Dear {invoice['customerName']},</p>
                <p>This is a friendly reminder about invoice <strong>{invoice['number']}</strong>.</p>
                <table border='1' cellpadding='5'>
                    <tr><td>Invoice Number</td><td>{invoice['number']}</td></tr>
                    <tr><td>Date</td><td>{invoice['invoiceDate']}</td></tr>
                    <tr><td>Due Date</td><td>{invoice['dueDate']}</td></tr>
                    <tr><td>Amount</td><td>£{invoice['totalAmountIncludingTax']}</td></tr>
                </table>
                <p>Please arrange payment at your earliest convenience.</p>
            """
        },
        "toRecipients": [
            {"emailAddress": {"address": invoice["email"]}}
        ]
    },
    "saveToSentItems": "true"
}

response = requests.post(
    "https://graph.microsoft.com/v1.0/me/sendMail",
    headers={
        "Authorization": f"Bearer {graph_token}",
        "Content-Type": "application/json"
    },
    json=email
)

if response.status_code == 202:
    print(f"Payment reminder sent to {invoice['email']}")
```

---

## 6. Authentication

All three systems use **Azure AD / Microsoft Entra ID**, but require different scopes:

| System | Auth Scope | App Registration |
|--------|------------|------------------|
| **Microsoft Graph** | `https://graph.microsoft.com/.default` | Azure AD app |
| **Business Central** | `https://api.businesscentral.dynamics.com/.default` | Azure AD app + BC permissions |
| **Dynamics 365** | `https://{org}.crm.dynamics.com/.default` | Azure AD app + D365 permissions |

### Setting Up Multi-API Authentication

```python
from azure.identity import ClientSecretCredential
from azure.core.credentials import AccessToken

# Single credential, multiple scopes
credential = ClientSecretCredential(
    tenant_id="your-tenant-id",
    client_id="your-client-id",
    client_secret="your-client-secret"
)

# Get tokens for each service
graph_token = credential.get_token("https://graph.microsoft.com/.default")
bc_token = credential.get_token("https://api.businesscentral.dynamics.com/.default")
d365_token = credential.get_token("https://{org}.crm.dynamics.com/.default")
```

### Required App Permissions

#### For Microsoft Graph
- `User.Read`
- `Mail.ReadWrite`
- `Mail.Send`
- `Calendars.ReadWrite`
- `Contacts.ReadWrite`
- `Files.ReadWrite`

#### For Business Central
- `Financials.ReadWrite.All`
- `app_access` (for daemon apps)

#### For Dynamics 365
- `user_impersonation`
- Specific entity permissions in D365 security roles

---

## 7. Power Automate Integration Examples

### Flow 1: New BC Customer → Create D365 Account

```
Trigger: When a customer is created (Business Central)
    ↓
Action: Create a new record (Dataverse/D365)
    - Account Name = BC Customer Name
    - Email = BC Customer Email
    - Address = BC Customer Address
    ↓
Action: Send an email (Office 365 Outlook)
    - Notify sales team of new account
```

### Flow 2: D365 Opportunity Won → Create BC Sales Order

```
Trigger: When an opportunity is updated (Dataverse)
    ↓
Condition: Status = Won
    ↓
Action: Create sales order (Business Central)
    - Customer = Opportunity Account
    - Amount = Opportunity Value
    ↓
Action: Post message (Microsoft Teams)
    - Notify finance team
```

### Flow 3: Email Received → Create D365 Case

```
Trigger: When a new email arrives (Office 365 Outlook)
    ↓
Condition: Subject contains "Support" or "Help"
    ↓
Action: Create a new record (Dataverse)
    - Entity: Case
    - Title = Email Subject
    - Description = Email Body
    - Customer = Lookup from email address
```

---

## 8. Quick Comparison

| Aspect | Microsoft Graph | Business Central API | Dynamics 365 API |
|--------|----------------|---------------------|------------------|
| **Primary Data** | M365 (mail, files, users) | ERP (finance, inventory) | CRM (sales, service) |
| **Base URL** | `graph.microsoft.com` | `api.businesscentral.dynamics.com` | `{org}.crm.dynamics.com` |
| **Data Format** | REST + OData | REST + OData | REST + OData |
| **Authentication** | Azure AD | Azure AD | Azure AD |
| **Query Language** | OData | OData | OData + FetchXML |
| **Webhooks** | ✅ Subscriptions | ✅ Webhooks | ✅ Webhooks |
| **Batch Requests** | ✅ `$batch` | ✅ `$batch` | ✅ `$batch` |

---

## 9. Future Direction

Microsoft is working on **tighter integration**:

- **Dataverse** is becoming the common data layer across all Microsoft business apps
- **Virtual Tables** let you access BC data from D365 without data duplication
- **Microsoft Fabric** aims to unify data and analytics across all Microsoft services
- **Copilot integration** will provide AI-powered insights across all three platforms

---

## Resources

### Business Central
- **API Documentation:** https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/
- **Developer Portal:** https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/

### Dynamics 365
- **Web API Reference:** https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview
- **Entity Reference:** https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/about-entity-reference

### Microsoft Graph
- **Documentation:** https://learn.microsoft.com/en-us/graph/overview
- **Graph Explorer:** https://developer.microsoft.com/en-us/graph/graph-explorer

### Integration
- **Power Automate Connectors:** https://learn.microsoft.com/en-us/connectors/
- **Azure Logic Apps:** https://learn.microsoft.com/en-us/azure/logic-apps/

---

*Last updated: February 2026*
