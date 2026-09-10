#!/bin/bash
# Phase 2 Quick Deploy Script for Google Cloud Run
# Usage: ./QUICK_DEPLOY.sh <PROJECT_ID> [REGION]
# Example: ./QUICK_DEPLOY.sh e-vidhayak us-central1

set -euo pipefail

PROJECT_ID="${1:-e-vidhayak}"
REGION="${2:-us-central1}"
SERVICE_ACCOUNT="${3:-}"

echo "═══════════════════════════════════════════════════════════"
echo "Navier-Stokes Phase 2 Deployment to Cloud Run"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Verify gcloud is installed and authenticated
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI not found"
    echo "   Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
echo "📋 Setting GCP project..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    artifactregistry.googleapis.com

# Option 1: Use Cloud Build (recommended)
echo ""
echo "🐳 Submitting build to Google Cloud Build..."
gcloud builds submit . \
    --config=cloudbuild.yaml \
    --project="$PROJECT_ID" \
    --region="$REGION"

BUILD_ID=$(gcloud builds list --limit=1 --format='value(id)' --project="$PROJECT_ID")
echo "✅ Build submitted: $BUILD_ID"
echo ""
echo "📊 Monitor build progress:"
echo "   gcloud builds log $BUILD_ID --stream"
echo ""

# Wait for build to complete
echo "⏳ Waiting for build to complete (this may take 10-15 minutes)..."
gcloud builds log "$BUILD_ID" --stream

# Verify backend deployment
echo ""
echo "🔍 Verifying backend deployment..."
BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
    --region="$REGION" \
    --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$BACKEND_URL" ]; then
    echo "❌ Backend service not found. Check Cloud Build logs:"
    echo "   gcloud builds log $BUILD_ID"
    exit 1
fi

echo "✅ Backend URL: $BACKEND_URL"

# Test backend health
echo ""
echo "🏥 Testing backend health..."
HEALTH=$(curl -s "$BACKEND_URL/health" || echo "")

if [[ "$HEALTH" == *"ok"* ]]; then
    echo "✅ Backend health check passed"
else
    echo "⚠️  Backend health check failed or unreachable"
    echo "   Response: $HEALTH"
    echo "   Check backend logs: gcloud run services logs navier-stokes-backend --region=$REGION"
fi

# Verify frontend deployment
echo ""
echo "🔍 Verifying frontend deployment..."
FRONTEND_URL=$(gcloud run services describe navier-stokes-frontend \
    --region="$REGION" \
    --format='value(status.url)' 2>/dev/null || echo "")

if [ -z "$FRONTEND_URL" ]; then
    echo "❌ Frontend service not found. Check Cloud Build logs:"
    echo "   gcloud builds log $BUILD_ID"
    exit 1
fi

echo "✅ Frontend URL: $FRONTEND_URL"

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📍 Service URLs:"
echo "   Backend:  $BACKEND_URL"
echo "   Frontend: $FRONTEND_URL"
echo ""
echo "🧪 Test the deployment:"
echo "   1. Open frontend: $FRONTEND_URL"
echo "   2. Click 'Login'"
echo "   3. Select a module"
echo "   4. Verify it works smoothly"
echo ""
echo "📊 Monitor services:"
echo "   Backend logs:  gcloud run services logs navier-stokes-backend --region=$REGION --limit=50"
echo "   Frontend logs: gcloud run services logs navier-stokes-frontend --region=$REGION --limit=50"
echo ""
echo "🔄 Rollback (if needed):"
echo "   gcloud run services delete navier-stokes-backend --region=$REGION"
echo "   gcloud run services delete navier-stokes-frontend --region=$REGION"
echo ""
echo "⏭️  Next: Phase 3 (Google OAuth)"
echo "═══════════════════════════════════════════════════════════"
