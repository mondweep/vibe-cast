#!/bin/bash
# Phase 2 Complete Deployment with Authentication Setup
# Run this script to deploy to Google Cloud Run

set -euo pipefail

PROJECT_ID="${1:-e-vidhayak}"
REGION="${2:-us-central1}"

echo "═══════════════════════════════════════════════════════════"
echo "Phase 2 Deployment to Google Cloud Run"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found"
    echo ""
    echo "Installation instructions:"
    echo "  macOS: brew install --cask google-cloud-sdk"
    echo "  Linux: curl https://sdk.cloud.google.com | bash"
    echo "  Windows: https://cloud.google.com/sdk/docs/install-gcloud-sdk"
    echo ""
    echo "After installation, run:"
    echo "  gcloud auth login"
    echo "  gcloud config set project $PROJECT_ID"
    echo "  $0"
    exit 1
fi

echo "✅ gcloud CLI found: $(gcloud --version | head -1)"
echo ""

# Check authentication
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")

if [ -z "$CURRENT_ACCOUNT" ]; then
    echo "❌ Not authenticated with Google Cloud"
    echo ""
    echo "Run the following to authenticate:"
    echo "  gcloud auth login"
    echo "  gcloud config set project $PROJECT_ID"
    echo "  $0"
    exit 1
fi

echo "✅ Authenticated as: $CURRENT_ACCOUNT"
echo ""

# Set project
echo "📋 Setting GCP project to: $PROJECT_ID"
gcloud config set project "$PROJECT_ID"
gcloud config set compute/region "$REGION"

# Check project exists
echo "🔍 Verifying project access..."
if ! gcloud projects describe "$PROJECT_ID" > /dev/null 2>&1; then
    echo "❌ Cannot access project: $PROJECT_ID"
    echo ""
    echo "Make sure:"
    echo "  1. Project ID is correct (you provided: $PROJECT_ID)"
    echo "  2. You have access to the project"
    echo "  3. Billing is enabled"
    echo ""
    echo "Try: gcloud projects list"
    exit 1
fi

echo "✅ Project verified: $PROJECT_ID"
echo ""

# Enable APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com \
    --quiet

echo "✅ APIs enabled"
echo ""

# Navigate to repository root
cd "$(git rev-parse --show-toplevel)" || exit 1

echo "📦 Starting Cloud Build deployment..."
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Branch: $(git rev-parse --abbrev-ref HEAD)"
echo ""

# Submit build to Cloud Build
gcloud builds submit . \
    --config=cloudbuild.yaml \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --substitute="_REGION=$REGION"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Build submitted to Google Cloud Build"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get the build ID
BUILD_ID=$(gcloud builds list --limit=1 --format='value(id)' --project="$PROJECT_ID")

echo "📊 Build ID: $BUILD_ID"
echo ""
echo "Monitor the build:"
echo "  gcloud builds log $BUILD_ID --stream"
echo ""

# Optional: Wait for build to complete
read -p "Wait for build to complete? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "⏳ Waiting for build to complete..."
    gcloud builds log "$BUILD_ID" --stream

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "🔍 Verifying Services"
    echo "═══════════════════════════════════════════════════════════"
    echo ""

    # Get service URLs
    BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
        --region="$REGION" \
        --format='value(status.url)' 2>/dev/null || echo "")

    FRONTEND_URL=$(gcloud run services describe navier-stokes-frontend \
        --region="$REGION" \
        --format='value(status.url)' 2>/dev/null || echo "")

    if [ -n "$BACKEND_URL" ]; then
        echo "✅ Backend:  $BACKEND_URL"

        # Test health endpoint
        HEALTH=$(curl -s "$BACKEND_URL/health" || echo "")
        if [[ "$HEALTH" == *"ok"* ]]; then
            echo "   ✅ Health check passed"
        else
            echo "   ⚠️  Health check returned: $HEALTH"
        fi
    else
        echo "⚠️  Backend service not yet available (may be starting)"
    fi

    echo ""

    if [ -n "$FRONTEND_URL" ]; then
        echo "✅ Frontend: $FRONTEND_URL"
        echo "   📱 Open in browser to test"
    else
        echo "⚠️  Frontend service not yet available (may be starting)"
    fi

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "🎉 Deployment Complete!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "📍 Next Steps:"
    echo "  1. Open frontend URL in browser"
    echo "  2. Click 'Login' to test"
    echo "  3. Select a module"
    echo "  4. Verify everything works"
    echo ""
    echo "📊 Monitor services:"
    echo "  gcloud run services logs read navier-stokes-backend --region=$REGION --follow"
    echo "  gcloud run services logs read navier-stokes-frontend --region=$REGION --follow"
    echo ""
else
    echo ""
    echo "⏳ Build is running in the background"
    echo ""
    echo "Check status:"
    echo "  gcloud builds list --limit=5"
    echo ""
    echo "View logs:"
    echo "  gcloud builds log $BUILD_ID --stream"
    echo ""
    echo "Get service URLs (once deployed):"
    echo "  gcloud run services describe navier-stokes-backend --region=$REGION --format='value(status.url)'"
    echo "  gcloud run services describe navier-stokes-frontend --region=$REGION --format='value(status.url)'"
fi
