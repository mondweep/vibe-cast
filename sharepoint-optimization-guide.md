# SharePoint Optimization Guide

> How to catalog, discover, utilize and update information across departments using Microsoft technologies

## The SharePoint Challenge

**Common problems organisations face:**

| Problem | Symptom |
|---------|---------|
| **Can't find documents** | "I know it exists somewhere..." |
| **Duplicate content** | Same doc in 5 different sites |
| **Inconsistent metadata** | Everyone tags differently (or not at all) |
| **Outdated information** | No one knows what's current |
| **Siloed departments** | Marketing can't find Sales templates |
| **No governance** | Sensitive docs in wrong locations |
| **Poor structure** | Flat folders, no taxonomy |

---

## SharePoint in the Microsoft Ecosystem

SharePoint is accessed via **Microsoft Graph** and can be enhanced with **Syntex**, **Search**, **Purview**, and **Copilot**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SHAREPOINT ECOSYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     USER EXPERIENCE                              │   │
│  │  SharePoint Sites │ Teams Files │ OneDrive │ Search │ Copilot   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MICROSOFT GRAPH API                           │   │
│  │              /sites  /drives  /lists  /search                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│       ┌────────────────────────────┼────────────────────────────┐      │
│       ▼                            ▼                            ▼      │
│  ┌──────────┐              ┌──────────────┐              ┌──────────┐ │
│  │SharePoint│              │   Syntex /   │              │ Purview  │ │
│  │ Online   │              │   AI Builder │              │(Governance│ │
│  │          │              │              │              │& Compliance│
│  │• Sites   │              │• Auto-classify│             │• Labels   │ │
│  │• Lists   │              │• Extract data │             │• Retention│ │
│  │• Libraries│             │• Content types│             │• DLP      │ │
│  │• Pages   │              │• AI tagging   │             │• eDiscovery│
│  └──────────┘              └──────────────┘              └──────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technologies That Optimize SharePoint

### 1. Microsoft Graph (Access & Integration)

**What:** API to access all SharePoint data programmatically.

**Graph API Endpoints for SharePoint:**

```
/sites                      → All sites
/sites/{site-id}/lists      → Lists in a site
/sites/{site-id}/drive      → Document library
/sites/{site-id}/items      → List items
/search/query               → Search across everything
```

**Example - Search across all SharePoint:**

```
POST https://graph.microsoft.com/v1.0/search/query

{
  "requests": [{
    "entityTypes": ["driveItem", "listItem", "site"],
    "query": { "queryString": "budget report 2024" }
  }]
}
```

---

### 2. Microsoft Syntex (AI-Powered Content)

**What:** AI that automatically classifies, tags, and extracts data from documents.

**Key Capabilities:**

| Feature | What It Does |
|---------|--------------|
| **Document Understanding** | AI reads documents and extracts metadata |
| **Content Classification** | Automatically applies content types |
| **Form Processing** | Extracts data from invoices, contracts |
| **Taxonomy Tagging** | Auto-applies managed metadata |
| **Content Assembly** | Generate documents from templates |

**Example Use Case:**

```
BEFORE Syntex:
───────────────
User uploads contract → No metadata → Lost in folder structure

AFTER Syntex:
─────────────
User uploads contract → AI reads it → Auto-extracts:
  • Contract Type: Service Agreement
  • Vendor: Acme Corp
  • Value: £50,000
  • Expiry Date: 2025-03-15
  • Department: Procurement
→ Automatically filed, searchable, alerts set
```

---

### 3. Microsoft Search (Discovery)

**What:** Unified search across M365 (SharePoint, OneDrive, Teams, Outlook, etc.)

**Key Features:**

| Feature | Description |
|---------|-------------|
| **Connectors** | Index external systems (BC, D365, custom apps) |
| **Bookmarks** | Promoted results for common queries |
| **Q&A** | Direct answers to common questions |
| **Acronyms** | Define company-specific terms |
| **Floor Plans** | Find people and rooms |
| **Verticals** | Custom search categories |

**Example - Custom Search Verticals:**

```
Search Verticals in your organisation:
──────────────────────────────────────
[All] [People] [Files] [Sites] [Policies] [Templates] [Products]
                                   ↑          ↑          ↑
                              Custom verticals you create
```

---

### 4. Microsoft Purview (Governance & Compliance)

**What:** Data governance, compliance, and protection.

| Component | What It Does |
|-----------|--------------|
| **Sensitivity Labels** | Classify & protect sensitive content |
| **Retention Policies** | Auto-delete or retain based on rules |
| **Data Loss Prevention** | Prevent sharing of sensitive data |
| **Information Barriers** | Prevent certain groups from sharing |
| **eDiscovery** | Legal hold and search |
| **Data Lifecycle** | Manage content through its lifecycle |

---

### 5. SharePoint Premium (Advanced Features)

**What:** Premium features for enterprise content management.

| Feature | Description |
|---------|-------------|
| **Advanced Content Processing** | High-volume AI processing |
| **Taxonomy Services** | Enterprise-wide managed metadata |
| **Content Governance** | Lifecycle management |
| **Document Translation** | Auto-translate documents |
| **Autofill Columns** | AI-suggested metadata |

---

## Architecture for Optimized SharePoint

```
┌─────────────────────────────────────────────────────────────────────────┐
│                 OPTIMIZED SHAREPOINT ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DISCOVERY LAYER                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Microsoft Search                              │   │
│  │  • Unified search across all content                            │   │
│  │  • Custom verticals (Policies, Templates, Products)             │   │
│  │  • Connectors to BC, D365, external systems                     │   │
│  │  • Bookmarks and Q&A for common queries                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  INTELLIGENCE LAYER                │                                    │
│  ┌─────────────────────────────────┼───────────────────────────────┐   │
│  │                    Microsoft Syntex                              │   │
│  │  • Auto-classify documents on upload                            │   │
│  │  • Extract metadata (dates, amounts, names)                     │   │
│  │  • Apply content types automatically                            │   │
│  │  • Tag with managed metadata                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  STRUCTURE LAYER                   │                                    │
│  ┌─────────────────────────────────┼───────────────────────────────┐   │
│  │              SharePoint Information Architecture                 │   │
│  │                                                                  │   │
│  │  Hub Sites (Departments)                                        │   │
│  │  ├── Sales Hub                                                  │   │
│  │  │   ├── Sales Team Site                                        │   │
│  │  │   ├── Sales Resources                                        │   │
│  │  │   └── Customer Proposals                                     │   │
│  │  ├── Marketing Hub                                              │   │
│  │  │   ├── Brand Assets                                           │   │
│  │  │   ├── Campaigns                                              │   │
│  │  │   └── Content Calendar                                       │   │
│  │  ├── Finance Hub                                                │   │
│  │  │   ├── Policies                                               │   │
│  │  │   ├── Reports                                                │   │
│  │  │   └── Templates                                              │   │
│  │  └── Company Hub (Cross-department)                             │   │
│  │      ├── Policies & Procedures                                  │   │
│  │      ├── Templates Library                                      │   │
│  │      └── Knowledge Base                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│  GOVERNANCE LAYER                  │                                    │
│  ┌─────────────────────────────────┼───────────────────────────────┐   │
│  │                   Microsoft Purview                              │   │
│  │  • Sensitivity labels (Confidential, Internal, Public)          │   │
│  │  • Retention policies (keep 7 years, delete after 1 year)       │   │
│  │  • DLP policies (block external sharing of financials)          │   │
│  │  • Compliance reporting                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Practical Implementation Guide

### Step 1: Information Architecture (Foundation)

**Define your structure:**

```
TAXONOMY (What categories exist?)
─────────────────────────────────
Department:     [Sales, Marketing, Finance, HR, Operations, IT]
Document Type:  [Policy, Procedure, Template, Report, Contract, Proposal]
Status:         [Draft, Under Review, Approved, Archived]
Confidentiality:[Public, Internal, Confidential, Restricted]

SITE STRUCTURE (Where does content live?)
─────────────────────────────────────────
Hub Site: Company Intranet
├── Hub: Sales
│   ├── Team Site: Sales Team
│   ├── Document Library: Proposals
│   └── List: Opportunities (or link to D365)
├── Hub: Finance
│   ├── Team Site: Finance Team
│   ├── Document Library: Policies
│   └── Document Library: Templates
└── Hub: Shared Resources
    ├── Document Library: Company Templates
    ├── Document Library: Brand Assets
    └── List: Company Directory
```

### Step 2: Content Types (Standardisation)

**Create reusable content types:**

```
Content Type: Contract
─────────────────────
Columns:
  • Contract Type (Choice: Service, License, Employment, NDA)
  • Vendor/Client (Text)
  • Value (Currency)
  • Start Date (Date)
  • End Date (Date)
  • Status (Choice: Active, Expired, Terminated)
  • Owner (Person)
  • Department (Managed Metadata)

Behaviour:
  • Retention: Keep 7 years after end date
  • Sensitivity: Confidential
  • Workflow: Notify owner 30 days before expiry
```

### Step 3: Syntex Models (Automation)

**Train AI to process documents:**

```
Document uploaded: "Acme_ServiceAgreement_2024.pdf"
                            │
                            ▼
Syntex Document Understanding Model
                            │
                            ▼
Extracted metadata:
  • Contract Type: Service Agreement
  • Vendor: Acme Corporation
  • Value: £75,000
  • Start Date: 2024-01-01
  • End Date: 2024-12-31
  • Auto-renewal: Yes
                            │
                            ▼
Applied:
  • Content Type: Contract
  • Sensitivity Label: Confidential
  • Retention Label: Contract-7Years
  • Filed to: /sites/finance/contracts/2024/
```

### Step 4: Search Configuration (Discovery)

**Configure Microsoft Search:**

```
BOOKMARKS (Promoted results)
────────────────────────────
Query: "expense policy"
→ Promoted: Expense Policy 2024 (Finance Hub)

Query: "logo"
→ Promoted: Brand Assets Library (Marketing Hub)

Query: "onboarding"
→ Promoted: New Employee Onboarding Checklist (HR Hub)

CUSTOM VERTICALS
────────────────
[Policies]  → Filters: ContentType = Policy
[Templates] → Filters: ContentType = Template
[Contracts] → Filters: ContentType = Contract

Q&A
───
Q: "What is the expense limit?"
A: "The expense limit without approval is £100. See the full policy here: [link]"
```

### Step 5: Governance (Purview)

**Apply policies:**

```
SENSITIVITY LABELS
──────────────────
• Public: Can be shared externally
• Internal: M365 users only
• Confidential: Specific groups + encryption
• Restricted: Named individuals only + no download

RETENTION POLICIES
──────────────────
• HR Documents: Keep 7 years
• Contracts: Keep 10 years after expiry
• Marketing Content: Keep 3 years
• Draft Documents: Delete after 1 year if not modified

DLP POLICIES
────────────
• Block external sharing of documents with:
  - Credit card numbers
  - National Insurance numbers
  - Financial data marked "Confidential"
```

---

## Graph API Examples for SharePoint

### Search Across All SharePoint

```python
import requests

def search_sharepoint(query, token):
    """Search across all SharePoint content"""
    response = requests.post(
        "https://graph.microsoft.com/v1.0/search/query",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "requests": [{
                "entityTypes": ["driveItem", "listItem", "site"],
                "query": {"queryString": query},
                "from": 0,
                "size": 25
            }]
        }
    )
    return response.json()

# Search for budget reports
results = search_sharepoint("budget report 2024", token)
for hit in results["value"][0]["hitsContainers"][0]["hits"]:
    print(f"Found: {hit['resource']['name']}")
    print(f"  Location: {hit['resource']['webUrl']}")
```

### Get Documents from a Library

```python
def get_library_contents(site_id, library_name, token):
    """Get all documents from a SharePoint library"""
    # First, get the drive (library) ID
    drives = requests.get(
        f"https://graph.microsoft.com/v1.0/sites/{site_id}/drives",
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    drive_id = next(d["id"] for d in drives["value"] if d["name"] == library_name)

    # Get all items
    items = requests.get(
        f"https://graph.microsoft.com/v1.0/drives/{drive_id}/root/children",
        headers={"Authorization": f"Bearer {token}"}
    ).json()

    return items["value"]

# Get all documents from Policies library
policies = get_library_contents("site-id", "Policies", token)
for doc in policies:
    print(f"{doc['name']} - Modified: {doc['lastModifiedDateTime']}")
```

### Create a Document with Metadata

```python
def upload_with_metadata(site_id, library_name, filename, content, metadata, token):
    """Upload document and set metadata"""

    # Upload file
    upload_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/root:/{library_name}/{filename}:/content"
    upload_response = requests.put(
        upload_url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/octet-stream"
        },
        data=content
    )

    item_id = upload_response.json()["id"]

    # Update metadata (list item fields)
    fields_url = f"https://graph.microsoft.com/v1.0/sites/{site_id}/drive/items/{item_id}/listItem/fields"
    requests.patch(
        fields_url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json=metadata
    )

# Upload contract with metadata
upload_with_metadata(
    site_id="site-guid",
    library_name="Contracts",
    filename="Acme_Agreement_2024.pdf",
    content=pdf_bytes,
    metadata={
        "ContractType": "Service Agreement",
        "Vendor": "Acme Corp",
        "Value": 75000,
        "ExpiryDate": "2024-12-31"
    },
    token=token
)
```

### List All Sites

```python
def get_all_sites(token):
    """Get all SharePoint sites in the organisation"""
    response = requests.get(
        "https://graph.microsoft.com/v1.0/sites?search=*",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json()["value"]

# List all sites
sites = get_all_sites(token)
for site in sites:
    print(f"{site['displayName']}: {site['webUrl']}")
```

### Get Site Permissions

```python
def get_site_permissions(site_id, token):
    """Get permissions for a SharePoint site"""
    response = requests.get(
        f"https://graph.microsoft.com/v1.0/sites/{site_id}/permissions",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response.json()["value"]
```

---

## Integration with D365 and Business Central

### Link SharePoint Documents to D365 Records

```
D365 Account: Contoso Ltd
│
├── Related Documents (SharePoint)
│   ├── Contracts/Contoso_MSA_2024.pdf
│   ├── Proposals/Contoso_Proposal_Q4.pptx
│   └── Correspondence/Contoso_Meeting_Notes.docx
│
└── Configured via:
    • SharePoint Integration in D365
    • Document Location entity
    • Auto-folder creation per account
```

**D365 SharePoint Integration Setup:**

1. Go to D365 → Settings → Document Management
2. Enable Server-Based SharePoint Integration
3. Configure Document Locations for entities (Account, Opportunity, etc.)
4. Documents appear in Related → Documents tab

### Link BC Documents to SharePoint

```
BC Sales Invoice: INV-001234
│
├── Attached Documents (SharePoint)
│   ├── Supporting/PurchaseOrder.pdf
│   └── Delivery/SignedDeliveryNote.pdf
│
└── Configured via:
    • BC Document Attachments
    • OneDrive/SharePoint integration
```

### Power Automate: Sync Documents Across Systems

```yaml
Flow: Document Sync - D365 to SharePoint

Trigger: When a file is created in D365 Document Location

Actions:
  1. Get file content from D365

  2. Get related Account details:
     - Account Name
     - Account Number
     - Industry

  3. Create folder structure in SharePoint:
     /Customers/{AccountName}/Documents/{Year}/

  4. Upload file to SharePoint with metadata:
     - Customer: {AccountName}
     - Document Type: {detected or manual}
     - Source System: Dynamics 365
     - Related Record: {D365 URL}

  5. Update D365 with SharePoint link
```

---

## Copilot + SharePoint

With Microsoft 365 Copilot, users can interact with SharePoint content naturally:

| User Asks | Copilot Does |
|-----------|--------------|
| "Find the latest expense policy" | Searches SharePoint, returns current version |
| "Summarise this contract" | Reads document, extracts key terms |
| "What documents do I need for onboarding?" | Finds HR checklist, lists requirements |
| "Create a proposal based on the Acme template" | Finds template, generates draft |
| "Who last edited the Q3 budget report?" | Checks version history, returns author |
| "Are there any contracts expiring this month?" | Queries metadata, lists expiring contracts |
| "What are our brand guidelines?" | Finds brand guide, summarises key points |
| "Show me all policies updated this year" | Filters by modified date, lists policies |

---

## SharePoint + Fabric Integration

For advanced analytics on SharePoint content:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  SHAREPOINT + FABRIC ANALYTICS                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  SharePoint Data                    Fabric Analytics                    │
│  ─────────────────                  ─────────────────                   │
│                                                                         │
│  Document metadata ──────────────►  • Which content is most accessed?  │
│  Version history   ──────────────►  • Who are the top contributors?    │
│  Access patterns   ──────────────►  • What content is stale?           │
│  Search queries    ──────────────►  • What are people searching for?   │
│  Site analytics    ──────────────►  • Which sites are underutilized?   │
│                                                                         │
│  Use Cases:                                                            │
│  • Content lifecycle reporting                                         │
│  • User adoption dashboards                                            │
│  • Storage optimization                                                │
│  • Compliance reporting                                                │
│  • Knowledge gap analysis                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Fabric Query Example - Content Analytics:**

```sql
-- Analyze SharePoint content usage
SELECT
    site_name,
    library_name,
    content_type,
    COUNT(*) AS document_count,
    AVG(DATEDIFF(day, last_modified, GETDATE())) AS avg_days_since_update,
    SUM(CASE WHEN last_modified < DATEADD(year, -1, GETDATE()) THEN 1 ELSE 0 END) AS stale_documents,
    SUM(view_count) AS total_views

FROM sharepoint_documents
GROUP BY site_name, library_name, content_type
ORDER BY stale_documents DESC
```

---

## Technology Summary

| Technology | Purpose | Key Benefit |
|------------|---------|-------------|
| **Microsoft Graph** | API access to SharePoint | Programmatic control, integration |
| **SharePoint Online** | Core content platform | Storage, collaboration, sites |
| **Syntex** | AI content processing | Auto-classify, extract metadata |
| **Microsoft Search** | Discovery | Find content across M365 |
| **Purview** | Governance | Labels, retention, DLP, compliance |
| **Power Automate** | Workflows | Automate document processes |
| **Copilot** | AI assistant | Natural language content interaction |
| **Fabric** | Analytics | Content usage insights, reporting |

---

## Recommended Implementation Approach

### Phase 1: Foundation (Weeks 1-4)
- [ ] Audit current SharePoint structure
- [ ] Define taxonomy (departments, document types)
- [ ] Create hub site structure
- [ ] Standardise content types
- [ ] Configure basic search bookmarks

### Phase 2: Intelligence (Weeks 5-8)
- [ ] Train Syntex models for key document types
- [ ] Configure auto-tagging rules
- [ ] Set up custom search verticals
- [ ] Create Q&A entries for common questions

### Phase 3: Governance (Weeks 9-12)
- [ ] Define sensitivity labels
- [ ] Configure retention policies
- [ ] Implement DLP rules
- [ ] Set up compliance reporting

### Phase 4: Integration (Ongoing)
- [ ] Connect SharePoint to D365 records
- [ ] Link BC documents to SharePoint
- [ ] Index external systems via Search connectors
- [ ] Enable Copilot for content

---

## Common Scenarios

### Scenario 1: "I can't find anything"

**Solution:**
1. Implement Microsoft Search with bookmarks for key content
2. Create custom search verticals (Policies, Templates, etc.)
3. Train Syntex to auto-tag content with metadata
4. Set up Q&A for common questions

### Scenario 2: "Everyone stores things differently"

**Solution:**
1. Define organisation-wide content types
2. Create standardised document libraries with required metadata
3. Use Syntex to auto-apply content types on upload
4. Implement hub sites for department standardisation

### Scenario 3: "We have duplicates everywhere"

**Solution:**
1. Use Microsoft Search to identify duplicates
2. Implement a "single source of truth" for templates
3. Use Power Automate to redirect users to canonical locations
4. Configure Purview retention to archive old versions

### Scenario 4: "Sensitive documents get shared externally"

**Solution:**
1. Apply sensitivity labels to confidential content
2. Configure DLP policies to block external sharing
3. Use Purview alerts for policy violations
4. Implement information barriers for sensitive departments

### Scenario 5: "Content becomes outdated"

**Solution:**
1. Configure retention policies with review triggers
2. Use Power Automate for content review reminders
3. Implement version control requirements
4. Create Fabric dashboards showing stale content

---

## Resources

### Microsoft Documentation
- **SharePoint Online:** https://learn.microsoft.com/en-us/sharepoint/
- **Microsoft Syntex:** https://learn.microsoft.com/en-us/microsoft-365/syntex/
- **Microsoft Search:** https://learn.microsoft.com/en-us/microsoftsearch/
- **Microsoft Purview:** https://learn.microsoft.com/en-us/purview/
- **Graph API - SharePoint:** https://learn.microsoft.com/en-us/graph/api/resources/sharepoint

### Tools
- **SharePoint Admin Center:** https://admin.microsoft.com/sharepoint
- **Microsoft Search Admin:** https://admin.microsoft.com/Adminportal/Home#/MicrosoftSearch
- **Purview Compliance Portal:** https://compliance.microsoft.com
- **Graph Explorer:** https://developer.microsoft.com/en-us/graph/graph-explorer

---

*Last updated: February 2026*
