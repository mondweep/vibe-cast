# Phase 2 Cloud Build Deployment Guide

## Overview
This guide shows how to deploy the Navier-Stokes backend and frontend using Google Cloud Build (no local Docker daemon required).

## Prerequisites

1. **GCP Project**: `e-vidhayak` (or your project ID)
2. **gcloud CLI**: Installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project e-vidhayak
   ```
3. **Cloud Build API**: Enabled in your GCP project
4. **Cloud Run API**: Enabled in your GCP project
5. **Service Account**: With Cloud Run admin and Container Registry permissions

## Method 1: Trigger from GitHub (Recommended)

### Option A: Cloud Build GitHub Integration
1. Go to [Cloud Build Console](https://console.cloud.google.com/cloud-build/builds)
2. Click **Manage repositories**
3. Connect your GitHub `mondweep/vibe-cast` repository
4. Create a trigger:
   - **Name**: `navier-stokes-phase2-deploy`
   - **Source**: GitHub
   - **Repository**: `mondweep/vibe-cast`
   - **Branch**: `claude/navier-stokes-orphan-branch-0gxmj0`
   - **Configuration**: Cloud Build (cloudbuild.yaml)
5. Click **Create** to save

Then, any push to the branch automatically triggers deployment.

### Option B: Manual Trigger
```bash
# Trigger build from specific branch
gcloud builds submit \
  --branch=claude/navier-stokes-orphan-branch-0gxmj0 \
  --config=cloudbuild.yaml \
  https://github.com/mondweep/vibe-cast.git
```

## Method 2: Local Trigger (Alternative)

If you have gcloud CLI but not Docker daemon:

```bash
# Clone the repo if needed
git clone https://github.com/mondweep/vibe-cast.git
cd vibe-cast
git checkout claude/navier-stokes-orphan-branch-0gxmj0

# Submit build to Cloud Build
gcloud builds submit . --config=cloudbuild.yaml --project=e-vidhayak
```

## What the Build Does

The `cloudbuild.yaml` configuration:

1. **Builds backend** from `backend/Dockerfile`
2. **Pushes** to `gcr.io/e-vidhayak/navier-stokes-backend:latest`
3. **Deploys** to Cloud Run service `navier-stokes-backend`
4. **Builds frontend** from `frontend/Dockerfile`
5. **Pushes** to `gcr.io/e-vidhayak/navier-stokes-frontend:latest`
6. **Deploys** to Cloud Run service `navier-stokes-frontend`

**Total build time**: ~10-15 minutes

## Monitor the Build

### In Cloud Console
```
https://console.cloud.google.com/cloud-build/builds
```
Look for your build and watch the logs in real-time.

### Via CLI
```bash
# List recent builds
gcloud builds list --limit=10 --sort-by=START_TIME

# Watch a specific build
gcloud builds log BUILD_ID --stream

# Get build details
gcloud builds describe BUILD_ID
```

## Verify Deployment

### Check Cloud Run Services

```bash
# List services
gcloud run services list --region=us-central1

# Get backend URL
gcloud run services describe navier-stokes-backend \
  --region=us-central1 \
  --format='value(status.url)'

# Get frontend URL
gcloud run services describe navier-stokes-frontend \
  --region=us-central1 \
  --format='value(status.url)'
```

### Test Backend Health

```bash
# Get backend URL
BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
  --region=us-central1 \
  --format='value(status.url)')

# Test health endpoint
curl $BACKEND_URL/health
```

Expected response:
```json
{"status": "ok"}
```

### Test Frontend

Open the frontend URL in a browser and verify:
1. Landing page loads
2. Login button works
3. Modules appear after login
4. Backend logs show session API calls

## Environment Variables

### Backend
The backend uses these environment variables (set in Cloud Run):
- `NODE_ENV=production`
- `FIREBASE_SERVICE_ACCOUNT` (optional, for Firestore)
- Port: `3000` (Cloud Run handles this)

### Frontend
The frontend needs this build argument:
- `VITE_API_URL` - Set to backend Cloud Run URL during build

The `cloudbuild.yaml` automatically handles this by detecting the backend service name.

## Common Issues

### Build Fails: "Docker build failed"
- Check backend `Dockerfile` exists at `backend/Dockerfile`
- Verify `backend/package.json` has `npm run build` script
- Check Cloud Build service account has Container Registry permissions

### Build Fails: "Cloud Run deployment failed"
- Verify Cloud Run API is enabled: `gcloud services enable run.googleapis.com`
- Check service account permissions:
  ```bash
  gcloud projects get-iam-policy e-vidhayak \
    --flatten="bindings[].members" \
    --filter="bindings.role:roles/run.admin"
  ```

### Build Times Out
- Check if `npm ci --legacy-peer-deps` takes >10min in backend
- Increase `machineType` in `cloudbuild.yaml` from `N1_HIGHCPU_8` to `N1_HIGHCPU_32`

### Frontend Can't Reach Backend
- Frontend loads the backend URL from build-time `VITE_API_URL`
- If URL is wrong, rebuild frontend with correct backend URL:
  ```bash
  BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
    --region=us-central1 \
    --format='value(status.url)')
  
  gcloud builds submit . \
    --config=cloudbuild.yaml \
    --substitutions=_BACKEND_URL=$BACKEND_URL
  ```

## Rollback

If deployment has issues:

```bash
# Rollback backend to previous version
gcloud run deploy navier-stokes-backend \
  --region=us-central1 \
  --image=gcr.io/e-vidhayak/navier-stokes-backend:previous

# Or delete service to disable
gcloud run services delete navier-stokes-backend --region=us-central1
```

## Next Steps

1. **Set up automated triggers**: Connect GitHub to Cloud Build
2. **Add Firebase credentials**: If using Firestore, configure `FIREBASE_SERVICE_ACCOUNT`
3. **Configure custom domain**: Set up Cloud Run custom domain
4. **Set up monitoring**: Configure Cloud Logging and Cloud Monitoring alerts
5. **Begin Phase 3**: Implement Google OAuth authentication

## Additional Resources

- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Pricing](https://cloud.google.com/build/pricing)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)

---

**Status**: Phase 2 deployment configuration complete ✅  
**Ready for**: Cloud Build trigger setup and deployment  
**Estimated Time**: 10-15 minutes from trigger to live services
