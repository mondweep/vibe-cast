#!/bin/bash

# Finabeo Marketing Agent - Azure Foundry Setup (Mac/Linux)
# Simple bash version that works with standard Azure CLI

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Finabeo Marketing Agent - Azure Foundry Setup ===${NC}\n"

# Parameters
RESOURCE_GROUP="${1:-finabeo-agents-rg}"
LOCATION="${2:-eastus}"
PROJECT_NAME="${3:-finabeo-marketing-agents}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Project Name: $PROJECT_NAME"
echo ""

# Check if logged in
echo -e "${BLUE}Checking Azure login status...${NC}"
if ! az account show > /dev/null 2>&1; then
    echo -e "${YELLOW}Not logged in. Running az login...${NC}"
    az login --use-device-code
fi

# Get subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}✓ Using subscription: $SUBSCRIPTION_ID${NC}\n"

# Create resource group
echo -e "${BLUE}Creating resource group: $RESOURCE_GROUP${NC}"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none
echo -e "${GREEN}✓ Resource group ready${NC}\n"

# Create storage account (needed for outputs)
STORAGE_ACCOUNT_NAME="st${RANDOM:0:5}${RANDOM:0:5}"
echo -e "${BLUE}Creating storage account: $STORAGE_ACCOUNT_NAME${NC}"
az storage account create \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  -o none
echo -e "${GREEN}✓ Storage account created${NC}\n"

# Create Key Vault
KEY_VAULT_NAME="kv${RANDOM:0:5}${RANDOM:0:5}"
echo -e "${BLUE}Creating Key Vault: $KEY_VAULT_NAME${NC}"
az keyvault create \
  --name "$KEY_VAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  -o none 2>/dev/null || echo -e "${YELLOW}Note: Key Vault may already exist${NC}"
echo -e "${GREEN}✓ Key Vault ready${NC}\n"

# Create Application Insights
APP_INSIGHTS_NAME="ai-${RANDOM:0:5}${RANDOM:0:5}"
echo -e "${BLUE}Creating Application Insights: $APP_INSIGHTS_NAME${NC}"
az monitor app-insights component create \
  --app "$APP_INSIGHTS_NAME" \
  --location "$LOCATION" \
  --resource-group "$RESOURCE_GROUP" \
  --application-type web \
  -o none 2>/dev/null || echo -e "${YELLOW}Note: App Insights may already exist${NC}"
echo -e "${GREEN}✓ Application Insights ready${NC}\n"

# Instructions for Foundry setup
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✓ INFRASTRUCTURE READY - NEXT: CREATE FOUNDRY PROJECT  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Infrastructure Created:${NC}"
echo "  Resource Group:     $RESOURCE_GROUP"
echo "  Storage Account:    $STORAGE_ACCOUNT_NAME"
echo "  Key Vault:          $KEY_VAULT_NAME"
echo "  App Insights:       $APP_INSIGHTS_NAME"
echo "  Location:           $LOCATION"
echo "  Subscription ID:    $SUBSCRIPTION_ID\n"

echo -e "${YELLOW}MANUAL STEP - Create Foundry Project:${NC}"
echo "  1. Go to: https://portal.azure.com"
echo "  2. Search for: 'Azure AI Foundry'"
echo "  3. Click 'Create hub'"
echo "  4. Select Resource Group: $RESOURCE_GROUP"
echo "  5. Give it a name: $PROJECT_NAME"
echo "  6. Click Create"
echo "  7. Once created, go to the hub Settings"
echo "  8. Copy the API endpoint URL"
echo "  9. Create an API key in the project\n"

echo -e "${YELLOW}What You'll Need:${NC}"
echo "  - Endpoint URL (looks like: https://ai-foundry-XXXX.services.ai.azure.com)"
echo "  - Project Name: $PROJECT_NAME"
echo "  - API Key\n"

echo -e "${GREEN}Ready to build agents! 🚀${NC}"
