#!/bin/bash
IMAGE_NAME="gcr.io/agentics-foundation25lon-1899/rvc-trainer"
SERVICE_NAME="rvc-trainer"
REGION="us-central1"

echo "Deploying $SERVICE_NAME to Cloud Run (GPU)..."

# Note: nvidia-l4 is recommended for inference/light training. 
# If unavailable, try nvidia-t4 or check quotas.
gcloud beta run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --no-allow-unauthenticated \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --no-gpu-zonal-redundancy \
  --memory 16Gi \
  --cpu 4 \
  --no-cpu-throttling \
  --max-instances 1 \
  --timeout 3600
