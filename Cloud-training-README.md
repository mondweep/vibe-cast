# Cloud Run GPU Training for Vibe-Cast

This document details the infrastructure set up to automate the training of RVC (Retrieval-based Voice Conversion) models using **Google Cloud Run with GPU support**.

## 🏗️ Architecture

We use a **Headless Training Service** approach:
1.  **Container**: A custom Docker image based on `nvidia/cuda:11.8.0` that includes Python 3.10, PyTorch, and the RVC codebase.
2.  **Server**: A Flask application (`server.py`) running inside the container that acts as a training worker.
3.  **Storage**: Google Cloud Storage (GCS) is used for input datasets (zips) and output models.
4.  **Compute**: Cloud Run (Gen 2) with NVIDIA L4/T4 GPUs provides on-demand, scalable compute.

## 📂 Project Structure

*   `cloud-run-training/`
    *   `Dockerfile`: Defines the GPU-enabled environment.
    *   `server.py`: The API server that orchestrates the training loop (Download -> Train -> Upload).
*   `deploy.sh`: Helper script to deploy the service to Cloud Run.
*   `CLOUD_RUN_DEPLOY.md`: Detailed deployment guide.

## 🚀 Setup & Deployment

### 1. Prerequisites
*   GCP Project with billing enabled.
*   `gcloud` CLI authenticated (`gcloud auth login`).
*   Quota for Cloud Run GPUs (check "Cloud Run" quotas in console).

### 2. Build the Image
We use Cloud Build to create the container image.
*Note: We use a custom staging bucket to avoid permission issues.*

```bash
# Create staging bucket (one-time)
gcloud storage buckets create gs://rvc-trainer-build-source --location=us-central1

# Submit build
gcloud builds submit --tag gcr.io/agentics-foundation25lon-1899/rvc-trainer ./cloud-run-training --timeout=2h --gcs-source-staging-dir=gs://rvc-trainer-build-source/source
```

### 3. Deploy Service
Run the helper script:
```bash
./deploy.sh
```
This deploys with:
*   GPU: 1 x NVIDIA L4
*   CPU: 4 vCPU
*   Memory: 16 GiB
*   No CPU Throttling (essential for background training)

## 🔌 API Usage

The service exposes a `/train` endpoint.

**Endpoint:** `POST /train`
**Auth:** Bearer Token (Identity Token)

**Payload:**
```json
{
  "dataset_url": "gs://your-bucket/dataset.zip",
  "output_url": "gs://your-bucket/my_model_result.zip",
  "model_name": "my_voice",
  "epochs": 100
}
```

**Example Call:**
```bash
URL=$(gcloud run services describe rvc-trainer --format 'value(status.url)')
TOKEN=$(gcloud auth print-identity-token)

curl -X POST $URL/train \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_url": "gs://my-bucket/dataset.zip",
    "output_url": "gs://my-bucket/model.zip",
    "model_name": "test_voice",
    "epochs": 50
  }'
```

## ⚠️ Important Notes
*   **Cold Starts**: The container is large (~5GB+). Cold starts might take 30-60s.
*   **Training Time**: Training 100 epochs might take 10-30 minutes depending on dataset size. Ensure your Cloud Run timeout is set appropriately (default in script is 1h).
*   **Cost**: You are billed for the GPU instance only while it is processing requests (if min-instances=0).
