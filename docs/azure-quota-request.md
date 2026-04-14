# Finabeo Marketing Agent — Azure Deployment Constraints & Quota Request

## Context

We are deploying the Finabeo Marketing Agent (a multi-agent .NET 9 workflow built on Microsoft Agent Framework) into Azure. The target architecture was:

- **Azure AI Foundry** (`<foundry-account>` in `<resource-group>`, eastus) — already provisioned ✅
- **Azure Functions** (dotnet-isolated, Linux) — to host the daily timer trigger + HTTP endpoint
- **Azure Storage** — for marketing content outputs (JSON/DOCX/PPTX)
- **Application Insights + Log Analytics** — observability
- **Key Vault** — secret storage (optional, demo phase)

## Blockers encountered

### Blocker 1 — RBAC: `roleAssignments/write` denied

The deploying user (`<deploying-user>`) holds **Contributor** at subscription scope `<subscription-id>`. Contributor can create resources but **cannot create role assignments**, which requires `Owner` or `User Access Administrator`.

The original Bicep template provisioned a Function App with a system-assigned Managed Identity and three role assignments:
- `Storage Blob Data Contributor` on the output storage account
- `Key Vault Secrets User` on the Key Vault
- `Cognitive Services OpenAI User` on the Foundry account

All three failed with `AuthorizationFailed ... does not have permission to perform action 'Microsoft.Authorization/roleAssignments/write'`.

**Workaround adopted (demo phase):** Removed Managed Identity entirely. Function App now authenticates to:
- Foundry via **API key** pulled at deploy time from `listKeys()` on the Foundry account (Contributor *can* read keys) and injected as an app setting (`Foundry__ApiKey`)
- Storage via **connection string** in `AzureWebJobsStorage` (standard pattern)
- Key Vault removed from the Bicep (no longer needed)

This is a lower security bar than production-grade and should be reverted to Managed Identity + RBAC once permissions allow.

### Blocker 2 — App Service compute quota is **zero** across every SKU

This is the showstopper. Bicep preflight validation rejects every Function-App-compatible plan tier we've tried, across every region we've tested:

| SKU attempted | Tier | Result |
|---|---|---|
| Y1 (Consumption) | Dynamic | `SubscriptionIsOverQuotaForSku: Current Limit (Dynamic VMs): 0` |
| B1 (Basic) | Basic | `Current Limit (Basic VMs): 0` — confirmed in eastus, eastus2, westus2, centralus |
| F1 (Free) | Free | `Current Limit (Free VMs): 0` AND `FreeOrSharedFunctionsAppServicePlanNotSupported` (Function Apps can't run on Free anyway) |

General VM quota for this subscription is fine (Standard B/D/E families all show limits of 10 vCPUs in every region tested) — it is specifically **App Service Plan compute** that is capped at 0. This is a platform-level gate Microsoft applies to some subscriptions (often newer accounts, EA enrollments, or sub types with restricted defaults).

## What we need from the tenant admin / subscription owner

**Primary request — raise App Service quota in East US:**

1. Azure Portal → **Help + Support** → **Create a support request**
2. **Issue type:** Service and subscription limits (quotas)
3. **Subscription:** `<subscription-id>`
4. **Quota type:** App Service
5. **Region:** East US
6. **Request details:** Raise `Basic VMs` limit from 0 to ≥10 (and optionally `Dynamic VMs` for Consumption-tier Function Apps, which is our preferred hosting model — pay-per-execution, $0 idle cost)
7. **Business justification:** "Deploying a small Azure Function App to host a daily timer trigger + HTTP endpoint for a demo of the Finabeo Marketing Agent. Currently blocked by zero App Service compute quota. Please grant minimum quota for Basic and/or Dynamic SKUs in East US."

Quota requests for App Service are typically free and granted within a few hours to 2 days.

**Secondary request (optional, enables production hardening) — grant RBAC admin role:**

Grant `<deploying-user>` the **User Access Administrator** role, scoped to the resource group `<resource-group>` (narrower blast radius than subscription-wide). This is required so that future Bicep deploys can create role assignments on the Function App's Managed Identity — enabling us to drop the API-key fallback and use AAD auth end-to-end.

```bash
az role assignment create \
  --assignee <deploying-user> \
  --role "User Access Administrator" \
  --scope /subscriptions/<subscription-id>/resourceGroups/<resource-group>
```

## Interim plan (what we're doing now)

Rather than block on the quota request, we are pivoting to **Azure Container Instances (ACI)** for the compute layer. ACI uses the general-purpose vCPU quota pool (which we've confirmed is non-zero), so it sidesteps the App Service cap entirely. The workflow code is unchanged; only the hosting shell differs. When App Service quota is granted, we can migrate back to Functions with minimal churn.

## Current Azure spend on this project

- Azure AI Foundry account `<foundry-account>`: existed before this work; pay-per-token only
- `gpt-5-mini` model deployment (created during this session): no idle cost, pay-per-token
- No App Service Plan, Function App, or new storage has been provisioned — **all failed Bicep deploys were rejected at preflight before any resource was created, so there is no billing impact from the failed attempts**

---

*Generated 2026-04-14 during Week 2 Phase 1 (Azure Deployment) of the Finabeo Marketing Agent project.*
