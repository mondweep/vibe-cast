// Finabeo Marketing Agent — ACR + ACI (Option B)
// Provisions: Azure Container Registry, Azure Container Instance, Storage Account,
// Log Analytics + App Insights. No App Service. No Managed Identity RBAC
// (Contributor-only deploy — auth via ACR admin creds + Foundry API key).

param location string = resourceGroup().location
param projectName string = 'finabeo-marketing-agents'
param environment string = 'dev'
param foundryAccountName string = 'finabeo-marketing-agents'
param foundryEndpoint string = 'https://finabeo-marketing-agents.openai.azure.com/'
param foundryDeploymentName string = 'gpt-4o'
param containerImageTag string = 'latest'
param braveSearchApiKey string = ''

// Existing ACR — created by the deploy script before this template runs,
// because we need to push the image before ACI can pull it on first boot.
param registryName string

var uniqueSuffix = substring(uniqueString(resourceGroup().id), 0, 6)
var containerGroupName = 'aci-${projectName}-${uniqueSuffix}'
var storageAccountName = 'stfinabeo${uniqueSuffix}'
var appInsightsName = 'ai-${environment}-${uniqueSuffix}'
var logAnalyticsName = 'log-${environment}-${uniqueSuffix}'
var dnsNameLabel = 'finabeo-agent-${uniqueSuffix}'
var imageName = 'finabeo-marketing-api'

resource foundryAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: foundryAccountName
}

// ─── Log Analytics + App Insights ───

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

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

// ─── Storage Account for marketing outputs ───

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

resource outputContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'marketing-outputs'
  properties: { publicAccess: 'None' }
}

// ─── Azure Container Registry (pre-existing — created by deploy script) ───

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' existing = {
  name: registryName
}

// ─── Azure Container Instance ───
// Uses ACR admin credentials (simple, demo-grade). ACI pulls image:tag on start.

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: containerGroupName
  location: location
  properties: {
    osType: 'Linux'
    restartPolicy: 'Always'
    imageRegistryCredentials: [
      {
        server: registry.properties.loginServer
        username: registry.listCredentials().username
        password: registry.listCredentials().passwords[0].value
      }
    ]
    ipAddress: {
      type: 'Public'
      dnsNameLabel: dnsNameLabel
      ports: [
        {
          protocol: 'TCP'
          port: 8080
        }
      ]
    }
    containers: [
      {
        name: 'finabeo-api'
        properties: {
          image: '${registry.properties.loginServer}/${imageName}:${containerImageTag}'
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 2
            }
          }
          ports: [
            {
              protocol: 'TCP'
              port: 8080
            }
          ]
          environmentVariables: [
            {
              name: 'Foundry__Endpoint'
              value: foundryEndpoint
            }
            {
              name: 'Foundry__ApiKey'
              secureValue: foundryAccount.listKeys().key1
            }
            {
              name: 'Foundry__DeploymentName'
              value: foundryDeploymentName
            }
            {
              name: 'AzureStorage__ConnectionString'
              secureValue: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${az.environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
            }
            {
              name: 'OutputContainer'
              value: 'marketing-outputs'
            }
            {
              name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
              value: appInsights.properties.ConnectionString
            }
            {
              name: 'BraveSearch__ApiKey'
              secureValue: braveSearchApiKey
            }
          ]
        }
      }
    ]
  }
}

// ─── Outputs ───

output registryName string = registry.name
output registryLoginServer string = registry.properties.loginServer
output imageName string = imageName
output containerGroupName string = containerGroup.name
output containerFqdn string = containerGroup.properties.ipAddress.fqdn
output containerUrl string = 'http://${containerGroup.properties.ipAddress.fqdn}:8080'
output storageAccountName string = storageAccount.name
output appInsightsName string = appInsights.name
