# Microsoft Graph API: Complete Guide

> From simple personal productivity to complex enterprise use cases

## Overview

Microsoft Graph is a unified REST API that provides a single endpoint to access data and intelligence across the entire Microsoft 365 ecosystem.

**Single Endpoint:** `https://graph.microsoft.com`

---

## 🟢 Simple (Personal Productivity)

| Use Case | API Endpoint |
|----------|--------------|
| Get your profile | `/me` |
| List your emails | `/me/messages` |
| Read your calendar | `/me/events` |
| Browse OneDrive files | `/me/drive/root/children` |
| See your tasks | `/me/todo/lists` |
| Find your manager | `/me/manager` |
| List your Teams | `/me/joinedTeams` |

### Example Use Case
Auto-reply bot that reads your emails and drafts responses.

### Sample Queries (Graph Explorer)

```
# Your profile
https://graph.microsoft.com/v1.0/me

# Recent emails (top 5)
https://graph.microsoft.com/v1.0/me/messages?$top=5&$select=subject,from,receivedDateTime

# Calendar events
https://graph.microsoft.com/v1.0/me/events

# OneDrive files
https://graph.microsoft.com/v1.0/me/drive/root/children

# People you collaborate with
https://graph.microsoft.com/v1.0/me/people

# Search emails for a keyword
https://graph.microsoft.com/v1.0/me/messages?$search="project"
```

---

## 🟡 Intermediate (Team/Department Tools)

| Use Case | What You Can Build |
|----------|-------------------|
| **Meeting scheduler** | Check availability across people, create meetings |
| **Email automation** | Send bulk emails, auto-categorize incoming mail |
| **File management** | Sync SharePoint docs, auto-organize OneDrive |
| **Teams bot** | Post messages, create channels, manage tabs |
| **Contact sync** | Export/import Outlook contacts to other systems |
| **Absence tracker** | Read calendar events to track who's out |

### APIs Involved

```
# Check availability
/users/{id}/calendar/getSchedule

# Send email
/me/sendMail

# SharePoint files
/groups/{id}/drive/items

# Post to Teams
/teams/{id}/channels/{id}/messages
```

### Example Use Case
A dashboard showing your team's availability for the week.

---

## 🟠 Advanced (Cross-System Integration)

| Use Case | Description |
|----------|-------------|
| **CRM integration** | Sync Outlook contacts/emails with Salesforce |
| **HR onboarding** | Auto-create user accounts, assign licenses, add to groups |
| **Document workflows** | Auto-move files through approval stages |
| **Meeting analytics** | Track meeting patterns, identify overloaded employees |
| **Unified search** | Search across emails, files, Teams, and SharePoint |

### APIs Involved

```
# Create/manage users
/users

# Manage group membership
/groups

# Unified search across M365
/search/query

# Webhooks for real-time changes
/subscriptions

# Usage analytics
/reports/getEmailActivityUserDetail
```

### Example Use Case
When a new employee is added to HR system:
1. Auto-create M365 account
2. Add to relevant Teams
3. Share onboarding docs

---

## 🔴 Enterprise (Organization-Wide)

| Use Case | Description |
|----------|-------------|
| **Security monitoring** | Detect suspicious sign-ins, risky users |
| **Compliance & eDiscovery** | Search/hold emails for legal cases |
| **License management** | Track and optimize M365 license usage |
| **Device management** | Intune device compliance, remote wipe |
| **Identity governance** | Access reviews, entitlement management |
| **Organizational analytics** | Workplace Analytics, productivity insights |

### APIs Involved

```
# Security alerts
/security/alerts

# Risky user detection
/identityProtection/riskyUsers

# Intune devices
/deviceManagement/managedDevices

# MFA adoption reports
/reports/credentialUserRegistrationDetails

# Sign-in logs
/auditLogs/signIns

# M365 service health
/admin/serviceAnnouncement/messages
```

### Example Use Case
Security dashboard that alerts when users sign in from unusual locations or devices.

---

## 🟣 AI-Powered (Graph + Azure OpenAI)

| Use Case | Description |
|----------|-------------|
| **Email summarizer** | Fetch emails via Graph → summarize with GPT-4 |
| **Meeting prep assistant** | Pull calendar + related emails + files → generate briefing |
| **Smart search** | Natural language queries across all M365 data |
| **Auto-categorization** | AI-classify incoming emails/documents |
| **Knowledge assistant** | Chat with your SharePoint/OneDrive documents |

### Architecture

```
User Query → Azure OpenAI → Graph API → M365 Data
                  ↓
         AI processes results
                  ↓
         Natural language response
```

### Example Use Case
"Summarize all emails about the Q4 budget and list action items"
- Graph fetches: `/me/messages?$search="Q4 budget"`
- Azure OpenAI summarizes and extracts action items

---

## 📊 Capabilities Matrix

| Category | Read | Write | Real-time | Analytics |
|----------|------|-------|-----------|-----------|
| **Mail** | ✅ | ✅ Send/reply | ✅ Webhooks | ✅ Activity |
| **Calendar** | ✅ | ✅ Create events | ✅ Webhooks | ✅ Patterns |
| **Files** | ✅ | ✅ Upload/move | ✅ Webhooks | ✅ Usage |
| **Teams** | ✅ | ✅ Post messages | ✅ Webhooks | ✅ Activity |
| **Users** | ✅ | ✅ Create/update | ✅ Changes | ✅ Reports |
| **Security** | ✅ | ✅ Remediate | ✅ Alerts | ✅ Scores |
| **Devices** | ✅ | ✅ Manage | ✅ Compliance | ✅ Reports |

---

## Query Parameters (OData)

Use these to filter and shape your API responses:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `$select` | Choose specific fields | `?$select=displayName,mail` |
| `$top` | Limit results | `?$top=5` |
| `$filter` | Filter results | `?$filter=startswith(displayName,'John')` |
| `$search` | Search content | `?$search="budget"` |
| `$orderby` | Sort results | `?$orderby=receivedDateTime desc` |
| `$expand` | Include related data | `?$expand=attachments` |
| `$count` | Include count of items | `?$count=true` |

---

## Getting Started

### 1. Graph Explorer (No Code)

**URL:** https://developer.microsoft.com/en-us/graph/graph-explorer

1. Sign in with your Microsoft account
2. Paste URL (without `GET` - it's already there)
3. Click "Run query"
4. Grant permissions via "Modify permissions" tab if needed

### 2. Common Permissions

| Permission | What It Allows |
|------------|----------------|
| `User.Read` | Read your profile |
| `Mail.Read` | Read your emails |
| `Mail.Send` | Send emails |
| `Calendars.Read` | Read your calendar |
| `Calendars.ReadWrite` | Create/edit events |
| `Files.Read` | Read your OneDrive files |
| `Files.ReadWrite` | Upload/modify files |
| `Team.ReadBasic.All` | Read Teams info |

### 3. Programmatic Access

#### Python Example

```python
from azure.identity import InteractiveBrowserCredential
from msgraph import GraphServiceClient

credential = InteractiveBrowserCredential(
    client_id="your-app-client-id",
    tenant_id="your-tenant-id"
)

client = GraphServiceClient(credential)

# Get current user
user = await client.me.get()
print(user.display_name)

# Get messages
messages = await client.me.messages.get()
for msg in messages.value:
    print(msg.subject)
```

#### Node.js Example

```javascript
const { Client } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const { InteractiveBrowserCredential } = require("@azure/identity");

const credential = new InteractiveBrowserCredential({
  clientId: "your-app-client-id",
  tenantId: "your-tenant-id"
});

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["User.Read", "Mail.Read"]
});

const client = Client.initWithMiddleware({ authProvider });

// Get current user
const user = await client.api("/me").get();
console.log(user.displayName);

// Get messages
const messages = await client.api("/me/messages").top(5).get();
messages.value.forEach(msg => console.log(msg.subject));
```

---

## Resources

- **Graph Explorer:** https://developer.microsoft.com/en-us/graph/graph-explorer
- **Documentation:** https://learn.microsoft.com/en-us/graph/overview
- **API Reference:** https://learn.microsoft.com/en-us/graph/api/overview
- **SDKs:** https://learn.microsoft.com/en-us/graph/sdks/sdks-overview
- **Permissions Reference:** https://learn.microsoft.com/en-us/graph/permissions-reference

---

## Common Use Case Patterns

### Pattern 1: Read → Process → Respond

```
1. Read data from Graph (emails, events, files)
2. Process with your logic or AI
3. Write back to Graph (send email, create event)
```

### Pattern 2: Subscribe → React

```
1. Create subscription (webhook) for changes
2. Receive notifications when data changes
3. React automatically (process, alert, update)
```

### Pattern 3: Batch Operations

```
1. Combine multiple requests in one call
2. Reduce network overhead
3. Atomic operations when needed
```

---

*Last updated: February 2026*
