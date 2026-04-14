// Finabeo Marketing Agent - Azure Infrastructure
// Deploys: Function App + Plan, Storage, Key Vault, App Insights, Managed Identity
// Usage: az deployment group create -g finabeo-agents-rg -f foundry-setup.bicep

param location string = resourceGroup().location
param projectName string = 'finabeo-marketing-agents'
param environment string = 'dev'

// Azure OpenAI endpoint on the existing Foundry/Cognitive Services account
param foundryEndpoint string = 'https://finabeo-marketing-agents.openai.azure.com/'

// Name of the existing Azure AI Foundry (Cognitive Services) account in this resource group
param foundryAccountName string = 'finabeo-marketing-agents'

// Model deployment name to use for chat completions
param foundryDeploymentName string = 'gpt-5-mini'

// Generate unique names to avoid conflicts
var uniqueSuffix = substring(uniqueString(resourceGroup().id), 0, 6)
var functionAppName = 'func-${projectName}-${uniqueSuffix}'
var appServicePlanName = 'asp-${projectName}-${uniqueSuffix}'
var storageAccountName = 'stfinabeo${uniqueSuffix}'
var appInsightsName = 'ai-${environment}-${uniqueSuffix}'
var logAnalyticsName = 'log-${environment}-${uniqueSuffix}'

// Reference the existing Azure AI Foundry (Cognitive Services) account to read its API key at deploy time
resource foundryAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: foundryAccountName
}

// ─── Log Analytics Workspace (required by App Insights) ───

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ─── Application Insights ───

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    RetentionInDays: 30
  }
}

// ─── Storage Account (Function App host + marketing outputs) ───

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

// Blob container for marketing workflow outputs
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource outputContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'marketing-outputs'
  properties: {
    publicAccess: 'None'
  }
}

// ─── App Service Plan (F1 Free Linux — sub has no Consumption or Basic quota) ───
// Note: F1 cannot run Always On, has 60 CPU-min/day cap, and max 1GB RAM.
// Sufficient for demo; upgrade for production use.

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'F1'
    tier: 'Free'
  }
  kind: 'linux'
  properties: {
    reserved: true // Linux
  }
}

// ─── Function App with System-Assigned Managed Identity ───

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|9.0'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'Foundry__Endpoint'
          value: foundryEndpoint
        }
        {
          name: 'Foundry__ApiKey'
          value: foundryAccount.listKeys().key1
        }
        {
          name: 'Foundry__DeploymentName'
          value: foundryDeploymentName
        }
        {
          name: 'Foundry__ProjectName'
          value: projectName
        }
        {
          name: 'OutputContainer'
          value: 'marketing-outputs'
        }
      ]
    }
  }
}

// NOTE: RBAC role assignments removed — Contributor-level deploys cannot create them.
// Auth instead uses: storage connection string (AzureWebJobsStorage) + Foundry API key (app setting).
// Acceptable for demo; revisit for enterprise hardening.

// ─── Outputs ───

output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output functionAppPrincipalId string = functionApp.identity.principalId
output storageAccountName string = storageAccount.name
output storageBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
output appInsightsName string = appInsights.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
