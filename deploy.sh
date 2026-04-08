#!/bin/bash

# Supportive Agents: Google Cloud Run Deployment Script
# This script builds the container and deploys the agentic triage demo.

PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="support-triage-demo"
REGION="us-central1"

echo "🚀 Starting migration to Google Cloud Run..."
echo "📍 Project ID: $PROJECT_ID"
echo "📍 Service Name: $SERVICE_NAME"

# Check for GEMINI_API_KEY
if [[ -z "${GEMINI_API_KEY}" ]]; then
  echo "⚠️  GEMINI_API_KEY environment variable is not set locally."
  read -p "Please enter your Gemini API Key: " API_KEY
else
  API_KEY=$GEMINI_API_KEY
fi

# Step 1: Build the image using Cloud Build
echo "📦 Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Step 2: Deploy to Cloud Run
echo "🚢 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 2Gi \
  --cpu 1 \
  --set-env-vars "GEMINI_API_KEY=$API_KEY,GEMINI_MODEL=gemini-2.0-flash,NODE_ENV=production"

echo "✅ Deployment complete!"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)'
