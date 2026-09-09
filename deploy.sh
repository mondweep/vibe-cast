#!/bin/bash

# Navier-Stokes Learning Platform - Quick Deployment Script
# Usage: ./deploy.sh <project-id> <region>

set -e

if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh <gcp-project-id> [region]"
    echo "Example: ./deploy.sh navier-stokes-learning us-central1"
    exit 1
fi

PROJECT_ID="$1"
REGION="${2:-us-central1}"

echo "🚀 Deploying Navier-Stokes Learning Platform"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo ""

# Set Google Cloud project
echo "📋 Configuring Google Cloud..."
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling Google Cloud APIs..."
gcloud services enable \
    run.googleapis.com \
    firestore.googleapis.com \
    storage-api.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    2>/dev/null || true

# Build backend
echo "🏗️  Building backend Docker image..."
docker build -t gcr.io/"$PROJECT_ID"/navier-stokes-backend:latest backend/

# Build frontend
echo "🏗️  Building frontend Docker image..."
docker build -t gcr.io/"$PROJECT_ID"/navier-stokes-frontend:latest frontend/

# Push images to Container Registry
echo "📤 Pushing images to Container Registry..."
docker push gcr.io/"$PROJECT_ID"/navier-stokes-backend:latest
docker push gcr.io/"$PROJECT_ID"/navier-stokes-frontend:latest

# Deploy backend
echo "🚀 Deploying backend to Cloud Run..."
BACKEND_URL=$(gcloud run deploy navier-stokes-backend \
    --image gcr.io/"$PROJECT_ID"/navier-stokes-backend:latest \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --memory 512Mi \
    --timeout 3600s \
    --format='value(status.url)' \
    --quiet)

echo "✅ Backend deployed at: $BACKEND_URL"

# Deploy frontend
echo "🚀 Deploying frontend to Cloud Run..."
FRONTEND_URL=$(gcloud run deploy navier-stokes-frontend \
    --image gcr.io/"$PROJECT_ID"/navier-stokes-frontend:latest \
    --platform managed \
    --region "$REGION" \
    --allow-unauthenticated \
    --memory 256Mi \
    --format='value(status.url)' \
    --quiet)

echo "✅ Frontend deployed at: $FRONTEND_URL"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 Deployment Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📱 Application URLs:"
echo "   Frontend:  $FRONTEND_URL"
echo "   Backend:   $BACKEND_URL"
echo "   Health:    $BACKEND_URL/health"
echo ""
echo "📝 Next Steps:"
echo "   1. Update Firebase credentials in backend environment"
echo "   2. Configure CORS for cross-origin requests"
echo "   3. Set up custom domain (optional)"
echo "   4. Enable Google OAuth in Firebase console"
echo ""
