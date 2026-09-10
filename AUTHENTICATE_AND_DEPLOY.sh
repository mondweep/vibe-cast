#!/bin/bash
# Phase 2 Deployment with Multiple Authentication Methods
# Supports: Service Account Key, OAuth, Application Default Credentials

set -euo pipefail

PROJECT_ID="${1:-e-vidhayak}"
REGION="${2:-us-central1}"
SERVICE_ACCOUNT_KEY="${3:-}"

echo "═══════════════════════════════════════════════════════════"
echo "Phase 2 Deployment to Google Cloud Run"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Setup PATH for gcloud
export PATH=/root/google-cloud-sdk/bin:$PATH

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found in PATH"
    exit 1
fi

echo "✅ gcloud CLI found: $(gcloud --version | head -1)"
echo ""

# Check for authentication methods
echo "🔍 Checking authentication methods..."
echo ""

# Method 1: Service Account Key File
if [ -n "$SERVICE_ACCOUNT_KEY" ] && [ -f "$SERVICE_ACCOUNT_KEY" ]; then
    echo "📝 Authenticating with service account key..."
    gcloud auth activate-service-account --key-file="$SERVICE_ACCOUNT_KEY"
    echo "✅ Authenticated with service account"
    echo ""

    # Extract project ID from key file
    PROJECT_ID=$(jq -r '.project_id' "$SERVICE_ACCOUNT_KEY")
    echo "✅ Project ID from key: $PROJECT_ID"
    echo ""
fi

# Method 2: Environment Variable with Key JSON
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    echo "📝 Using GOOGLE_APPLICATION_CREDENTIALS environment variable..."
    gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
    echo "✅ Authenticated with application default credentials"
    echo ""

    # Extract project ID
    PROJECT_ID=$(jq -r '.project_id' "$GOOGLE_APPLICATION_CREDENTIALS")
    echo "✅ Project ID from credentials: $PROJECT_ID"
    echo ""
fi

# Method 3: Check if already authenticated
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")

if [ -z "$CURRENT_ACCOUNT" ]; then
    echo "❌ No authentication found"
    echo ""
    echo "Please provide credentials using one of these methods:"
    echo ""
    echo "Option 1: Service Account Key File"
    echo "  $0 e-vidhayak us-central1 /path/to/service-account-key.json"
    echo ""
    echo "Option 2: Environment Variable"
    echo "  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json"
    echo "  $0 e-vidhayak us-central1"
    echo ""
    echo "Option 3: OAuth (interactive)"
    echo "  gcloud auth login"
    echo "  $0 e-vidhayak us-central1"
    echo ""
    exit 1
fi

echo "✅ Authenticated as: $CURRENT_ACCOUNT"
echo ""

# Set project and region
echo "📋 Configuring gcloud..."
gcloud config set project "$PROJECT_ID"
gcloud config set compute/region "$REGION"

# Verify project access
echo "🔍 Verifying project access..."
if ! gcloud projects describe "$PROJECT_ID" > /dev/null 2>&1; then
    echo "❌ Cannot access project: $PROJECT_ID"
    exit 1
fi

echo "✅ Project verified: $PROJECT_ID"
echo ""

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    --quiet 2>&1 | grep -E "Enabling|Enabled|ERROR" || true

echo "✅ APIs enabled"
echo ""

# Navigate to repo root
cd "$(git rev-parse --show-toplevel)" || exit 1

echo "📦 Starting Cloud Build deployment..."
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "   Build config: cloudbuild.yaml"
echo ""

# Submit build
echo "⏳ Submitting build to Google Cloud Build..."
gcloud builds submit . \
    --config=cloudbuild.yaml \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --substitute="_REGION=$REGION"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Build submitted successfully!"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get build ID
BUILD_ID=$(gcloud builds list --limit=1 --format='value(id)' --project="$PROJECT_ID")
echo "📊 Build ID: $BUILD_ID"
echo ""
echo "Monitor build progress:"
echo "  gcloud builds log $BUILD_ID --stream --project=$PROJECT_ID"
echo ""

# Wait for build to complete
echo "⏳ Monitoring build progress..."
gcloud builds log "$BUILD_ID" --stream --project="$PROJECT_ID"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 Build Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Verify services
echo "🔍 Verifying deployed services..."
echo ""

# Backend
BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(status.url)' 2>/dev/null || echo "")

if [ -n "$BACKEND_URL" ]; then
    echo "✅ Backend: $BACKEND_URL"

    # Test health
    HEALTH=$(curl -s "$BACKEND_URL/health" 2>/dev/null || echo "")
    if [[ "$HEALTH" == *"ok"* ]]; then
        echo "   ✅ Health check passed"
    else
        echo "   ⚠️  Health check: $HEALTH"
    fi
else
    echo "⚠️  Backend service not found (still starting)"
fi

echo ""

# Frontend
FRONTEND_URL=$(gcloud run services describe navier-stokes-frontend \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format='value(status.url)' 2>/dev/null || echo "")

if [ -n "$FRONTEND_URL" ]; then
    echo "✅ Frontend: $FRONTEND_URL"
    echo "   📱 Open in browser to test"
else
    echo "⚠️  Frontend service not found (still starting)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📋 Next Steps:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "1. Open frontend in browser:"
echo "   $FRONTEND_URL"
echo ""
echo "2. Test the application:"
echo "   - Click 'Login'"
echo "   - Select a module"
echo "   - Complete the module"
echo ""
echo "3. Monitor services:"
echo "   gcloud run services logs read navier-stokes-backend \\"
echo "     --region=$REGION --follow --project=$PROJECT_ID"
echo ""
echo "4. Get service URLs anytime:"
echo "   gcloud run services list --region=$REGION --project=$PROJECT_ID"
echo ""
echo "═══════════════════════════════════════════════════════════"
