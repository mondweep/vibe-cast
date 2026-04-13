// Finabeo Marketing Agent - Azure Infrastructure
// Deploys: Function App + Plan, Storage, Key Vault, App Insights, Managed Identity
// Usage: az deployment group create -g finabeo-agents-rg -f foundry-setup.bicep

param location string = resourceGroup().location
param projectName string = 'finabeo-marketing-agents'
param environment string = 'dev'

// Foundry endpoint (set after manual Foundry hub creation)
param foundryEndpoint string = ''

// Generate unique names to avoid conflicts
var uniqueSuffix = substring(uniqueString(resourceGroup().id), 0, 6)
var functionAppName = 'func-${projectName}-${uniqueSuffix}'
var appServicePlanName = 'asp-${projectName}-${uniqueSuffix}'
var storageAccountName = 'st${replace(projectName, '-', '')}${uniqueSuffix}'
var keyVaultName = 'kv-${environment}-${uniqueSuffix}'
var appInsightsName = 'ai-${environment}-${uniqueSuffix}'
var logAnalyticsName = 'log-${environment}-${uniqueSuffix}'

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

// ─── Key Vault (stores Foundry API key and other secrets) ───

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    enabledForDeployment: false
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: false
    enableRbacAuthorization: true
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
  }
}

// ─── App Service Plan (Consumption tier for cost efficiency) ───

resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
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
      linuxFxVersion: 'DOTNET-ISOLATED|10.0'
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
          name: 'Foundry__ProjectName'
          value: projectName
        }
        {
          name: 'AzureStorage__BlobEndpoint'
          value: storageAccount.properties.primaryEndpoints.blob
        }
        {
          name: 'OutputContainer'
          value: 'marketing-outputs'
        }
        {
          name: 'KeyVaultUri'
          value: keyVault.properties.vaultUri
        }
      ]
    }
  }
}

// ─── RBAC Role Assignments for Managed Identity ───

// Storage Blob Data Contributor — allows Function App to read/write marketing outputs
resource storageBlobContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, 'StorageBlobDataContributor')
  scope: storageAccount
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  }
}

// Key Vault Secrets User — allows Function App to read secrets (e.g. Foundry API key)
resource keyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, functionApp.id, 'KeyVaultSecretsUser')
  scope: keyVault
  properties: {
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

// ─── Outputs ───

output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
output functionAppPrincipalId string = functionApp.identity.principalId
output storageAccountName string = storageAccount.name
output storageBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output appInsightsName string = appInsights.name
output appInsightsConnectionString string = appInsights.properties.ConnectionString
