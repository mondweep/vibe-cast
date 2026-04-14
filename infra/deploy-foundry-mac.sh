#!/bin/bash

# Finabeo Marketing Agent - Azure Infrastructure + Function App Deployment
# Usage: ./deploy-foundry-mac.sh [resource-group] [location] [project-name] [foundry-endpoint]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Finabeo Marketing Agent - Azure Deployment ===${NC}\n"

# Parameters
RESOURCE_GROUP="${1:-finabeo-agents-rg}"
LOCATION="${2:-eastus}"
PROJECT_NAME="${3:-finabeo-marketing-agents}"
FOUNDRY_ENDPOINT="${4:-https://finabeo-marketing-agents.openai.azure.com/}"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Project Name: $PROJECT_NAME"
echo "  Foundry Endpoint: ${FOUNDRY_ENDPOINT:-<will set later>}"
echo ""

# ─── Prerequisites ───

echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}ERROR: Azure CLI not installed. Install with: brew install azure-cli${NC}"
    exit 1
fi

if ! command -v dotnet &> /dev/null; then
    echo -e "${RED}ERROR: .NET SDK not installed. Install from: https://dot.net${NC}"
    exit 1
fi

if ! command -v func &> /dev/null; then
    echo -e "${YELLOW}WARNING: Azure Functions Core Tools not installed.${NC}"
    echo -e "${YELLOW}Install with: brew install azure-functions-core-tools@4${NC}"
    echo -e "${YELLOW}Continuing without local test capability...${NC}\n"
fi

# ─── Azure Login ───

echo -e "${BLUE}Checking Azure login status...${NC}"
if ! az account show > /dev/null 2>&1; then
    echo -e "${YELLOW}Not logged in. Running az login...${NC}"
    az login --use-device-code
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}✓ Using subscription: $SUBSCRIPTION_ID${NC}\n"

# ─── Deploy Infrastructure via Bicep ───

echo -e "${BLUE}Deploying infrastructure via Bicep...${NC}"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" -o none

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEPLOY_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/foundry-setup.bicep" \
  --parameters \
    projectName="$PROJECT_NAME" \
    environment="dev" \
    foundryEndpoint="$FOUNDRY_ENDPOINT" \
  --query "properties.outputs" \
  -o json)

# Extract outputs
FUNCTION_APP_NAME=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['functionAppName']['value'])")
FUNCTION_APP_URL=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['functionAppUrl']['value'])")
STORAGE_ACCOUNT=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['storageAccountName']['value'])")
KEYVAULT_NAME=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['keyVaultName']['value'])")
PRINCIPAL_ID=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['functionAppPrincipalId']['value'])")

echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo "  Function App: $FUNCTION_APP_NAME"
echo "  URL: $FUNCTION_APP_URL"
echo "  Storage: $STORAGE_ACCOUNT"
echo "  Key Vault: $KEYVAULT_NAME"
echo ""

# ─── Build and Publish Function App ───

echo -e "${BLUE}Building Function App...${NC}"
FUNC_PROJECT="$SCRIPT_DIR/../agents/FinabeoMarketingAgent.Functions"
PUBLISH_DIR="$SCRIPT_DIR/../.publish"

dotnet publish "$FUNC_PROJECT" \
  --configuration Release \
  --output "$PUBLISH_DIR" \
  --no-self-contained

echo -e "${GREEN}✓ Build successful${NC}\n"

# Copy branding assets into publish output
echo -e "${BLUE}Copying branding assets...${NC}"
mkdir -p "$PUBLISH_DIR/branding"
cp "$SCRIPT_DIR/../branding/finabeo-branding.json" "$PUBLISH_DIR/branding/" 2>/dev/null || echo -e "${YELLOW}Note: branding config not found, skipping${NC}"
echo -e "${GREEN}✓ Branding assets copied${NC}\n"

# ─── Deploy to Azure ───

echo -e "${BLUE}Deploying Function App to Azure...${NC}"

# Create zip for deployment
DEPLOY_ZIP="$SCRIPT_DIR/../.publish.zip"
(cd "$PUBLISH_DIR" && zip -r "$DEPLOY_ZIP" . -x "*.pdb") > /dev/null

az functionapp deployment source config-zip \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FUNCTION_APP_NAME" \
  --src "$DEPLOY_ZIP" \
  -o none

# Clean up
rm -rf "$PUBLISH_DIR" "$DEPLOY_ZIP"

echo -e "${GREEN}✓ Function App deployed${NC}\n"

# ─── Summary ───

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✓ DEPLOYMENT SUCCESSFUL                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Deployed Resources:${NC}"
echo "  Function App:     $FUNCTION_APP_NAME"
echo "  Function URL:     $FUNCTION_APP_URL"
echo "  Storage Account:  $STORAGE_ACCOUNT"
echo "  Key Vault:        $KEYVAULT_NAME"
echo "  Managed Identity: $PRINCIPAL_ID"
echo "  App Insights:     (linked automatically)"
echo ""

echo -e "${YELLOW}Endpoints:${NC}"
echo "  Health:    $FUNCTION_APP_URL/api/health"
echo "  Generate:  $FUNCTION_APP_URL/api/generate (POST, requires function key)"
echo "  Timer:     Runs daily at 8:00 AM UTC automatically"
echo ""

echo -e "${YELLOW}Foundry:${NC}"
echo "  Endpoint:     $FOUNDRY_ENDPOINT"
echo "  MI Principal: $PRINCIPAL_ID"
echo "  Role:         Cognitive Services OpenAI User (assigned via Bicep)"
echo ""

echo -e "${GREEN}Ready to generate marketing content! 🚀${NC}"
