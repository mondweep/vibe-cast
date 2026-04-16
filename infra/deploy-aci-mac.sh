#!/bin/bash
# Finabeo Marketing Agent — Option B (ACI) deploy
# Provisions ACR (if needed), builds the container image via `az acr build`
# (cloud-side, no local Docker required), then runs the Bicep template to
# provision the ACI + supporting resources.
#
# Usage: ./deploy-aci-mac.sh [resource-group] [location] [image-tag]

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=== Finabeo Marketing Agent — ACI Deploy (Option B) ===${NC}\n"

RESOURCE_GROUP="${1:-finabeo-agents-rg}"
LOCATION="${2:-eastus}"
IMAGE_TAG="${3:-$(date +%Y%m%d%H%M%S)}"
PROJECT_NAME="finabeo-marketing-agents"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${YELLOW}Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location:       $LOCATION"
echo "  Image Tag:      $IMAGE_TAG"
echo "  Repo Root:      $REPO_ROOT"
echo ""

# ─── Prerequisites ───

if ! command -v az &> /dev/null; then
    echo -e "${RED}ERROR: Azure CLI not installed. brew install azure-cli${NC}"
    exit 1
fi

if ! az account show > /dev/null 2>&1; then
    echo -e "${YELLOW}Not logged in. Running az login...${NC}"
    az login --use-device-code
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo -e "${GREEN}✓ Using subscription: $SUBSCRIPTION_ID${NC}\n"

# ─── Ensure ACR exists ───
# Registry name must be globally unique, lowercase alphanumeric, 5-50 chars.
# We derive a stable suffix from the resource group ID via `az deployment group what-if`
# on a tiny helper template — but simpler: just hash the RG name.

RG_HASH=$(echo -n "$RESOURCE_GROUP" | shasum | cut -c1-6)
REGISTRY_NAME="acrfinabeo${RG_HASH}"

echo -e "${BLUE}Ensuring ACR $REGISTRY_NAME exists...${NC}"
if az acr show --name "$REGISTRY_NAME" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ACR already exists${NC}"
else
    echo "Creating ACR (Basic tier)..."
    az acr create \
      --resource-group "$RESOURCE_GROUP" \
      --name "$REGISTRY_NAME" \
      --sku Basic \
      --admin-enabled true \
      --location "$LOCATION" \
      -o none
    echo -e "${GREEN}✓ ACR created${NC}"
fi
echo ""

# ─── Build image in ACR (cloud-side, no local Docker) ───

echo -e "${BLUE}Building container image in ACR (this runs in the cloud)...${NC}"
cd "$REPO_ROOT"

az acr build \
  --registry "$REGISTRY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "finabeo-marketing-api:$IMAGE_TAG" \
  --image "finabeo-marketing-api:latest" \
  --file agents/FinabeoMarketingAgent.Api/Dockerfile \
  .

echo -e "${GREEN}✓ Image built and pushed: finabeo-marketing-api:$IMAGE_TAG${NC}\n"

# ─── Deploy Bicep (creates ACI + storage + insights) ───

echo -e "${BLUE}Deploying Bicep template...${NC}"
# Optional: Brave Search API key for grounded research (web search tool)
BRAVE_KEY="${BRAVE_SEARCH_API_KEY:-}"
# Optional: Teams Incoming Webhook URL for HITL approval notifications
TEAMS_WEBHOOK="${TEAMS_WEBHOOK_URL:-}"

DEPLOY_OUTPUT=$(az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$SCRIPT_DIR/aci-setup.bicep" \
  --parameters \
    projectName="$PROJECT_NAME" \
    environment="dev" \
    registryName="$REGISTRY_NAME" \
    containerImageTag="$IMAGE_TAG" \
    braveSearchApiKey="$BRAVE_KEY" \
    teamsWebhookUrl="$TEAMS_WEBHOOK" \
  --query "properties.outputs" \
  -o json)

CONTAINER_FQDN=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['containerFqdn']['value'])")
CONTAINER_URL=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['containerUrl']['value'])")
STORAGE_ACCOUNT=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['storageAccountName']['value'])")
CONTAINER_GROUP=$(echo "$DEPLOY_OUTPUT" | python3 -c "import sys, json; print(json.load(sys.stdin)['containerGroupName']['value'])")

echo -e "${GREEN}✓ Bicep deployment complete${NC}\n"

# ─── Summary ───

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✓ DEPLOYMENT SUCCESSFUL                          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Deployed:${NC}"
echo "  Registry:        $REGISTRY_NAME.azurecr.io"
echo "  Container Group: $CONTAINER_GROUP"
echo "  Storage Account: $STORAGE_ACCOUNT"
echo "  Image Tag:       $IMAGE_TAG"
echo ""

echo -e "${YELLOW}Endpoints:${NC}"
echo "  Health:   $CONTAINER_URL/health"
echo "  Generate: $CONTAINER_URL/api/generate  (POST)"
echo ""

echo -e "${YELLOW}Test it:${NC}"
echo "  curl $CONTAINER_URL/health"
echo "  curl -X POST $CONTAINER_URL/api/generate"
echo ""

echo -e "${YELLOW}View logs:${NC}"
echo "  az container logs --resource-group $RESOURCE_GROUP --name $CONTAINER_GROUP --follow"
echo ""

echo -e "${GREEN}🚀 Ready to generate marketing content!${NC}"
