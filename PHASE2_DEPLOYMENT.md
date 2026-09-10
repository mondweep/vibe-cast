# Phase 2: Backend Deployment & Frontend API Integration
**Status**: Ready for Deployment  
**Date**: 2026-09-10  
**Target**: Complete end-to-end API integration

---

## Overview

Phase 2 completes the development loop by:
1. Deploying the backend API to Google Cloud Run
2. Integrating frontend with backend API calls
3. Setting up graceful fallback for local-only mode
4. Testing end-to-end session management

## Backend Deployment

### Prerequisites

Before deploying the backend, ensure you have:

- **Google Cloud Project**: `e-vidhayak` (or your project ID)
- **Docker**: Installed and daemon running
- **gcloud CLI**: Installed and authenticated
- **Firebase Service Account Key**: JSON file with credentials

### Step 1: Prepare Firebase Credentials

```bash
# Set your GCP project ID
export PROJECT_ID="e-vidhayak"
gcloud config set project $PROJECT_ID

# Create or use existing Firebase service account
# Download the service account key from:
# https://console.firebase.google.com/project/$PROJECT_ID/settings/serviceaccounts/adminsdk

# Store the key path
export FIREBASE_KEY_PATH="/path/to/service-account-key.json"
```

### Step 2: Build Backend Docker Image

```bash
cd /home/user/vibe-cast

# Build the Docker image
docker build -t gcr.io/${PROJECT_ID}/navier-stokes-backend:latest backend/

# Verify the build
docker images | grep navier-stokes-backend
```

### Step 3: Push to Google Container Registry

```bash
# Configure Docker authentication for GCR
gcloud auth configure-docker

# Push the image
docker push gcr.io/${PROJECT_ID}/navier-stokes-backend:latest

# Verify the push
gcloud container images list --repository=gcr.io/${PROJECT_ID}
```

### Step 4: Deploy to Cloud Run

```bash
# Get Firebase project ID (should match PROJECT_ID)
export FIREBASE_PROJECT_ID=$(gcloud config get-value project)

# Read the service account key and encode it
export FIREBASE_SERVICE_ACCOUNT=$(cat $FIREBASE_KEY_PATH)

# Deploy to Cloud Run
gcloud run deploy navier-stokes-backend \
  --image=gcr.io/${PROJECT_ID}/navier-stokes-backend:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --timeout=3600s \
  --set-env-vars=FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID} \
  --set-env-vars=FIREBASE_SERVICE_ACCOUNT="${FIREBASE_SERVICE_ACCOUNT}" \
  --quiet

# Wait for deployment (typically 2-3 minutes)
echo "Deployment in progress..."
sleep 30

# Get the backend URL
export BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)')

echo "Backend deployed at: $BACKEND_URL"
```

### Step 5: Verify Backend Health

```bash
# Test the health endpoint
curl -X GET "$BACKEND_URL/health"

# Expected response:
# {"success":true,"data":{"status":"healthy"},"timestamp":"2026-09-10T..."}
```

### Step 6: Update Frontend Configuration

Edit `frontend/.env` or `frontend/.env.production`:

```bash
# Add this line
VITE_API_URL=$BACKEND_URL
```

Or pass as environment variable during build:

```bash
cd frontend
VITE_API_URL=$BACKEND_URL npm run build
```

## Frontend API Integration

### What Changed

The frontend has been updated to call the backend API for:
- **Session Creation** (`POST /api/sessions`)
- **Module Progress** (`PUT /api/sessions/:userId/progress`)
- **Session Retrieval** (`GET /api/sessions/:userId`)

### Graceful Fallback

If the backend is unavailable:
- Frontend falls back to local-only mode
- Session stored in browser localStorage
- Progress saved locally (not synced to backend)
- No errors shown to user (expected behavior)

### How It Works

1. **Login Flow**:
   - User clicks "Continue as Guest"
   - Frontend tries to create session on backend
   - If successful: session stored on Firestore
   - If failed: session stored in localStorage only

2. **Module Selection**:
   - User selects a module
   - Frontend updates local state immediately
   - Async API call in background to sync with backend
   - No blocking UI while waiting for backend

3. **Module Completion**:
   - User marks module complete
   - Frontend updates local state immediately
   - Async backend sync in background
   - Progress always available locally

## Testing Phase 2

### Local Testing (Before Deployment)

```bash
# Terminal 1: Start backend locally
cd backend
PORT=3000 npm run dev

# Terminal 2: Start frontend dev server
cd frontend
VITE_API_URL=http://localhost:3000 npm run dev

# Terminal 3: Test API endpoints
curl http://localhost:3000/health

# Create a test session
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "email": "test@example.com",
    "display_name": "Test User"
  }'
```

### End-to-End Testing Checklist

- [ ] Backend health endpoint responds: `curl $BACKEND_URL/health`
- [ ] Frontend loads and landing page displays
- [ ] Click "Continue as Guest" button
- [ ] Guest session created (check browser DevTools > Application > localStorage)
- [ ] Module selection page displays
- [ ] Click "Start Module" on any module
- [ ] Module content displays with simulator
- [ ] Click "Mark Complete & Continue"
- [ ] Next module loads successfully
- [ ] Refresh page and verify progress persisted (check localStorage)
- [ ] Check backend logs for API calls: `gcloud run logs read navier-stokes-backend`

### Debugging

If API calls fail, check:

```bash
# Check backend logs
gcloud run logs read navier-stokes-backend --region us-central1 --limit 50

# Check frontend console for errors
# Open browser DevTools > Console tab

# Verify backend is accessible from frontend location
curl -i $BACKEND_URL/health

# Check CORS headers (should allow all origins for MVP)
curl -i -X OPTIONS $BACKEND_URL/api/sessions \
  -H "Origin: https://navier-stokes-frontend-58061828953.us-central1.run.app"
```

## Deployment Checklist

### Pre-Deployment
- [ ] Docker image builds successfully locally
- [ ] Firebase service account key obtained
- [ ] gcloud CLI authenticated with correct project
- [ ] Backend environment variables prepared
- [ ] Frontend .env updated with BACKEND_URL

### Deployment
- [ ] Docker image pushed to GCR
- [ ] Cloud Run service deployed
- [ ] Health endpoint responds successfully
- [ ] Backend logs show no errors
- [ ] CORS configured correctly

### Post-Deployment
- [ ] Frontend loads and connects to backend
- [ ] Guest login creates session on backend
- [ ] Module progress syncs to backend
- [ ] Firestore collections show session data
- [ ] No console errors in browser
- [ ] All API endpoints responding correctly

## Automated Deployment Script

Save as `deploy-phase2.sh`:

```bash
#!/bin/bash
set -e

PROJECT_ID="${1:-e-vidhayak}"
FIREBASE_KEY_PATH="${2:-./service-account-key.json}"
REGION="us-central1"

echo "🚀 Phase 2 Deployment: Backend + API Integration"
echo "================================================"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Key: $FIREBASE_KEY_PATH"
echo ""

# Set project
gcloud config set project $PROJECT_ID
export FIREBASE_PROJECT_ID=$PROJECT_ID

# Build backend
echo "🏗️  Building backend Docker image..."
docker build -t gcr.io/${PROJECT_ID}/navier-stokes-backend:latest backend/

# Push to GCR
echo "📤 Pushing image to Google Container Registry..."
gcloud auth configure-docker
docker push gcr.io/${PROJECT_ID}/navier-stokes-backend:latest

# Deploy to Cloud Run
echo "🚀 Deploying backend to Cloud Run..."
export FIREBASE_SERVICE_ACCOUNT=$(cat $FIREBASE_KEY_PATH)

gcloud run deploy navier-stokes-backend \
  --image=gcr.io/${PROJECT_ID}/navier-stokes-backend:latest \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --memory=512Mi \
  --timeout=3600s \
  --set-env-vars=FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID} \
  --set-env-vars=FIREBASE_SERVICE_ACCOUNT="${FIREBASE_SERVICE_ACCOUNT}" \
  --quiet

# Get backend URL
BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
  --platform=managed \
  --region=$REGION \
  --format='value(status.url)')

echo ""
echo "✅ Backend Deployment Complete!"
echo "================================================"
echo ""
echo "📱 Service URLs:"
echo "  Frontend: https://navier-stokes-frontend-58061828953.us-central1.run.app"
echo "  Backend:  $BACKEND_URL"
echo "  Health:   $BACKEND_URL/health"
echo ""
echo "📋 Next Steps:"
echo "  1. Update frontend .env with: VITE_API_URL=$BACKEND_URL"
echo "  2. Run: cd frontend && npm run build"
echo "  3. Deploy frontend: gcloud run deploy navier-stokes-frontend ..."
echo "  4. Test: Click 'Continue as Guest' and verify API calls in DevTools"
echo ""
```

Usage:
```bash
chmod +x deploy-phase2.sh
./deploy-phase2.sh e-vidhayak /path/to/service-account-key.json
```

## Files Changed in Phase 2

### New Files
- `frontend/src/config.ts` - API configuration
- `frontend/src/services/api.ts` - API client library

### Modified Files
- `frontend/src/store/learner.ts` - Backend API integration
- `frontend/src/App.tsx` - Async session handling
- `frontend/src/components/Module.tsx` - Async module completion
- `frontend/src/components/ModuleSelector.tsx` - Loading states

### Backend (No Changes - Already Complete)
- Ready to deploy as-is
- All endpoints functional
- Firebase credentials configured

## Performance Expectations

### Backend Cold Start
- First request: ~1-2 seconds (Cloud Run spin-up)
- Subsequent requests: <100ms

### API Response Times
- Session creation: ~500ms
- Progress update: ~300ms
- Session retrieval: ~200ms

### Frontend Changes
- Initial page load: No change
- Login button click: +500ms (session creation)
- Module selection: +300ms (progress sync)
- All operations non-blocking (async)

## Monitoring & Logs

### View Backend Logs
```bash
# Real-time logs
gcloud run logs read navier-stokes-backend --follow

# Last 50 lines
gcloud run logs read navier-stokes-backend --limit 50

# Errors only
gcloud run logs read navier-stokes-backend | grep -i error
```

### Monitor Metrics
```bash
# CPU usage
gcloud monitoring time-series list --filter='resource.type=cloud_run_revision'

# Error rate dashboard
# https://console.cloud.google.com/run
```

## Rollback Plan

If deployment fails or issues arise:

```bash
# Rollback to previous version
gcloud run deploy navier-stokes-backend \
  --image=gcr.io/${PROJECT_ID}/navier-stokes-backend:previous \
  --platform=managed \
  --region=us-central1

# Or disable backend traffic (frontend falls back to local mode)
gcloud run services update-traffic navier-stokes-backend \
  --to-revisions LATEST=0
```

## Success Criteria

✅ Phase 2 is complete when:
1. Backend Cloud Run service is healthy and responding
2. Frontend connects to backend without errors
3. Sessions are created in Firestore
4. Progress updates sync to Firestore
5. All API endpoints return correct data
6. Graceful fallback works if backend unavailable
7. No console errors in browser DevTools
8. Lighthouse performance score > 85

## Next Steps (Phase 3+)

Once Phase 2 is verified:
1. **Phase 3**: Implement Google OAuth authentication
2. **Phase 4**: Build WASM Navier-Stokes solver
3. **Phase 5**: Add Three.js visualizations
4. **Phase 6**: Implement assessment system

---

**Duration**: 1-2 hours (including testing)  
**Difficulty**: Medium  
**Risk**: Low (graceful fallback enabled)  
**Owner**: DevOps / Backend Team  
**Date Completed**: [TBD]
