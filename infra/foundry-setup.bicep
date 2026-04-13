param location string = resourceGroup().location
param projectName string = 'finabeo-marketing-agents'
param environment string = 'dev'

// Generate unique names
var uniqueSuffix = substring(uniqueString(resourceGroup().id), 0, 4)
var aiHubName = 'aihub-${environment}-${uniqueSuffix}'
var keyVaultName = 'kv-${environment}-${uniqueSuffix}'
var appInsightsName = 'ai-${environment}-${uniqueSuffix}'
var storageAccountName = 'st${environment}${uniqueSuffix}'

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    enabledForDeployment: true
    enabledForTemplateDeployment: true
    enabledForDiskEncryption: false
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
  }
}

// Application Insights
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    RetentionInDays: 30
  }
}

// Storage Account
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
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
  }
}

// Storage Container for outputs
resource storageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/agent-outputs'
  properties: {
    publicAccess: 'None'
  }
}

output foundryEndpoint string = 'https://${location}.api.cognitive.microsoft.com/'
output keyVaultName string = keyVault.name
output appInsightsName string = appInsights.name
output storageAccountName string = storageAccount.name
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
