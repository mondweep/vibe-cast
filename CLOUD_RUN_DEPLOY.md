# Deploying RVC Training to Cloud Run (GPU)

This guide explains how to deploy the RVC training container to Google Cloud Run with GPU support.

## Prerequisites
1.  GCP Project with billing enabled.
2.  `gcloud` CLI installed and authenticated.
3.  Quota for Cloud Run GPU (L4 or T4).

## 1. Build and Push Image
First, build the Docker image and push it to Google Artifact Registry (GAR) or Container Registry (GCR).

```bash
# Set your project ID
export PROJECT_ID=agentics-foundation25lon-1899
export IMAGE_NAME=gcr.io/$PROJECT_ID/rvc-trainer

# Build (this takes time as it installs PyTorch)
# Note: You might need to increase build timeout
gcloud builds submit --tag $IMAGE_NAME ./cloud-run-training --timeout=1h
```

## 2. Deploy to Cloud Run
Deploy the service with GPU enabled.

```bash
gcloud run deploy rvc-trainer \
  --image $IMAGE_NAME \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --memory 16Gi \
  --cpu 4 \
  --no-cpu-throttling \
  --max-instances 1 \
  --timeout 3600
```

*Note: If `nvidia-l4` is not available in your region, try `nvidia-t4` or check region availability.*

## 3. Trigger Training
Once deployed, you can trigger training via HTTP POST.

**Payload:**
```json
{
  "dataset_url": "gs://your-bucket/dataset.zip",
  "output_url": "gs://your-bucket/my_model_result.zip",
  "model_name": "my_voice",
  "epochs": 100
}
```

**Example Curl:**
```bash
# Get the URL
export SERVICE_URL=$(gcloud run services describe rvc-trainer --format 'value(status.url)')

# Get Identity Token
export TOKEN=$(gcloud auth print-identity-token)

# Call API
curl -X POST $SERVICE_URL/train \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_url": "gs://my-bucket/dataset.zip",
    "output_url": "gs://my-bucket/model.zip",
    "model_name": "test_voice",
    "epochs": 50
  }'
```
