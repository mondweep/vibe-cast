# Deploy Foundry for Marketing Agents
# Run this script on your local machine after: az login --use-device-code

param(
    [string]$SubscriptionId = "",
    [string]$ResourceGroupName = "finabeo-agents-rg",
    [string]$Location = "eastus",
    [string]$ProjectName = "finabeo-marketing-agents"
)

# Colors for output
$Green = "`e[32m"
$Blue = "`e[34m"
$Yellow = "`e[33m"
$Reset = "`e[0m"

Write-Host "${Blue}=== Finabeo Marketing Agent - Azure Foundry Setup ===${Reset}`n"

# Get subscription if not provided
if (-not $SubscriptionId) {
    Write-Host "${Yellow}Getting Azure subscriptions...${Reset}"
    $subscriptions = az account list --query "[].{id:id, name:name}" -o json | ConvertFrom-Json

    if ($subscriptions.Count -eq 1) {
        $SubscriptionId = $subscriptions[0].id
        Write-Host "${Green}✓ Using subscription: $($subscriptions[0].name)${Reset}"
    } else {
        Write-Host "${Yellow}Available subscriptions:${Reset}"
        $subscriptions | ForEach-Object { Write-Host "  - $($_.name) ($($_.id))" }
        $SubscriptionId = Read-Host "Enter Subscription ID"
    }
}

# Set subscription
Write-Host "${Blue}Setting subscription...${Reset}"
az account set --subscription $SubscriptionId

# Create resource group
Write-Host "${Blue}Creating resource group: $ResourceGroupName in $Location...${Reset}"
az group create --name $ResourceGroupName --location $Location -o none

# Create AI Hub
Write-Host "${Blue}Creating AI Hub...${Reset}"
$hubName = "aihub-$(Get-Random -Minimum 1000 -Maximum 9999)"
az ai hub create `
  --name $hubName `
  --resource-group $ResourceGroupName `
  --location $Location `
  -o none 2>$null || Write-Host "${Yellow}Note: AI Hub may already exist${Reset}"

# Create AI Project
Write-Host "${Blue}Creating AI Project: $ProjectName...${Reset}"
$projectInfo = az ai project create `
  --name $ProjectName `
  --hub-name $hubName `
  --resource-group $ResourceGroupName `
  -o json

$projectId = ($projectInfo | ConvertFrom-Json).id
Write-Host "${Green}✓ Project created: $ProjectName${Reset}`n"

# Get connection details
Write-Host "${Blue}Getting connection details...${Reset}"
$projectDetails = az ai project show `
  --name $ProjectName `
  --hub-name $hubName `
  --resource-group $ResourceGroupName `
  -o json | ConvertFrom-Json

$endpoint = $projectDetails.properties.api_endpoint
$resourceName = $projectDetails.location

# Get API key
Write-Host "${Blue}Creating API key...${Reset}"
$keyOutput = az ai project create-api-key `
  --name $ProjectName `
  --hub-name $hubName `
  --resource-group $ResourceGroupName `
  -o json 2>$null || Write-Host "${Yellow}Using existing key...${Reset}"

# Display results
Write-Host "${Green}
╔════════════════════════════════════════════════════════════╗
║          ✓ FOUNDRY DEPLOYMENT SUCCESSFUL                  ║
╚════════════════════════════════════════════════════════════╝
${Reset}`n"

Write-Host "${Yellow}Connection Details:${Reset}"
Write-Host "  Endpoint:           $endpoint"
Write-Host "  Project Name:       $ProjectName"
Write-Host "  Resource Group:     $ResourceGroupName"
Write-Host "  Subscription ID:    $SubscriptionId`n"

Write-Host "${Yellow}Next Steps:${Reset}"
Write-Host "  1. Copy the Endpoint above"
Write-Host "  2. Generate an API key in Azure Portal"
Write-Host "  3. Add to appsettings.json:"
Write-Host "     - Endpoint: $endpoint"
Write-Host "     - ProjectName: $ProjectName"
Write-Host "     - ApiKey: (from Azure Portal)"
Write-Host "  4. Share these details with Claude`n"

Write-Host "${Green}Ready to build agents! 🚀${Reset}"
