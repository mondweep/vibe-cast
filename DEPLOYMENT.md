# Navier-Stokes Learning Platform - Deployment Guide

## Prerequisites

- Google Cloud Project with billing enabled
- gcloud CLI installed and configured
- Docker installed locally
- Node.js 20+ and npm installed

> **Deploying from a Claude Code sandbox session (no browser, no local
> machine)?** `gcloud auth login` device-code flow works fine there — see
> [`DEVICE_AUTH_TROUBLESHOOTING.md`](./DEVICE_AUTH_TROUBLESHOOTING.md)
> for the exact recipe and the pitfalls that make it look broken if you don't
> know about them (it is not a fundamental sandbox limitation, despite what
> an earlier deployment attempt concluded).

## Environment Setup

### 1. Create Google Cloud Project

```bash
export PROJECT_ID="navier-stokes-learning"
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage-api.googleapis.com \
  cloudresourcemanager.googleapis.com \
  cloudbuild.googleapis.com
```

### 3. Create Firestore Database

```bash
gcloud firestore databases create \
  --location=us-central1 \
  --type=native-mode
```

### 4. Set Up Firebase Project

1. Visit https://console.firebase.google.com
2. Create a new Firebase project linked to your GCP project
3. Enable Google Sign-In authentication
4. Create a service account for backend authentication:

```bash
gcloud iam service-accounts create navier-stokes-backend \
  --display-name="Navier-Stokes Backend"

gcloud iam service-accounts keys create backend-key.json \
  --iam-account=navier-stokes-backend@$PROJECT_ID.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:navier-stokes-backend@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/datastore.user
```

### 5. Configure Environment Variables

```bash
# For backend
export FIREBASE_PROJECT_ID=$PROJECT_ID
export FIREBASE_SERVICE_ACCOUNT=$(cat backend-key.json | base64 -w 0)

# Create backend .env file
echo "PORT=3000" > backend/.env
echo "FIREBASE_PROJECT_ID=$PROJECT_ID" >> backend/.env
echo "FIREBASE_SERVICE_ACCOUNT='$(cat backend-key.json)'" >> backend/.env
echo "NODE_ENV=production" >> backend/.env
```

## Deployment Steps

### 1. Build and Push Docker Images

```bash
# Backend
docker build -t gcr.io/$PROJECT_ID/navier-stokes-backend:latest backend/
docker push gcr.io/$PROJECT_ID/navier-stokes-backend:latest

# Frontend
docker build -t gcr.io/$PROJECT_ID/navier-stokes-frontend:latest frontend/
docker push gcr.io/$PROJECT_ID/navier-stokes-frontend:latest
```

### 2. Deploy Backend to Cloud Run

```bash
gcloud run deploy navier-stokes-backend \
  --image gcr.io/$PROJECT_ID/navier-stokes-backend:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars=FIREBASE_PROJECT_ID=$PROJECT_ID \
  --set-env-vars=FIREBASE_SERVICE_ACCOUNT="$(cat backend-key.json)" \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 3600s

# Get backend URL
export BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
  --platform managed \
  --region us-central1 \
  --format='value(status.url)')

echo "Backend deployed at: $BACKEND_URL"
```

### 3. Deploy Frontend to Cloud Run

```bash
# Update frontend config with backend URL
# Create frontend/.env.production
echo "VITE_API_URL=$BACKEND_URL" > frontend/.env.production

gcloud run deploy navier-stokes-frontend \
  --image gcr.io/$PROJECT_ID/navier-stokes-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi

# Get frontend URL
export FRONTEND_URL=$(gcloud run services describe navier-stokes-frontend \
  --platform managed \
  --region us-central1 \
  --format='value(status.url)')

echo "Frontend deployed at: $FRONTEND_URL"
```

### 4. Configure CORS in Backend

Update backend to allow requests from frontend:

```bash
gcloud run services update navier-stokes-backend \
  --region us-central1 \
  --set-env-vars=FRONTEND_URL=$FRONTEND_URL
```

## Accessing the Application

The deployed application will be available at:

```
Frontend: $FRONTEND_URL
Backend API: $BACKEND_URL/api
Health Check: $BACKEND_URL/health
```

## Monitoring and Logs

```bash
# View backend logs
gcloud run logs read navier-stokes-backend --region us-central1 --limit 50

# View frontend logs
gcloud run logs read navier-stokes-frontend --region us-central1 --limit 50

# View Cloud Build logs
gcloud builds log $(gcloud builds list --limit 1 --format='value(id)')
```

## Database Backup

```bash
# Export Firestore to Cloud Storage
gcloud firestore export gs://$PROJECT_ID-backups/$(date +%Y%m%d-%H%M%S)
```

## Cleanup

To delete all resources:

```bash
gcloud run services delete navier-stokes-backend --region us-central1
gcloud run services delete navier-stokes-frontend --region us-central1
gcloud firestore databases delete default
gcloud projects delete $PROJECT_ID
```
