# Navier-Stokes Learning Platform - Implementation Guide
**Date**: 2026-09-10  
**Status**: Phase 1 Complete - Ready for Phase 2 (Backend Deployment & OAuth)

---

## Project Overview

The Navier-Stokes Interactive Learning Platform is an educational web application designed to teach the fundamental physics and mathematics of fluid dynamics through interactive visualization, real-time simulations, and adaptive assessments.

**Key Features**:
- 9-module progressive learning curriculum
- Interactive Navier-Stokes equation solver (WebAssembly)
- 3D/2D visualizations (Three.js, D3.js)
- Multi-language support (English, Spanish, Mandarin)
- Real-time simulation controls with parameter adjustment
- Assessment system with instant feedback
- Learner progress tracking and analytics

**Live URL**: https://navier-stokes-frontend-58061828953.us-central1.run.app/

---

## Phase 1: Foundation (COMPLETE ✅)

### What's Working
1. **Frontend Application**
   - React 19 + TypeScript with Vite build system
   - Landing page with guest login functionality
   - 9-module navigation system (modules 0-8)
   - Zustand state management with localStorage persistence
   - Responsive CSS layout
   - i18n internationalization (en, es, zh)

2. **Backend API (Code-Complete)**
   - Express.js REST API
   - Firebase Firestore integration
   - Session management endpoints
   - Assessment submission handling
   - Simulation state persistence

3. **Deployment Infrastructure**
   - Docker containerization (frontend & backend)
   - Google Cloud Build CI/CD configuration
   - Cloud Run deployment configuration
   - Environment variable management

4. **Documentation**
   - Comprehensive ADR (Architecture Decision Record)
   - Deployment guide with step-by-step instructions
   - Development status tracking
   - PRD and project summary

### Current Implementation Details

#### Frontend Architecture
```
frontend/
├── src/
│   ├── components/
│   │   ├── Layout.tsx          # Header, footer, navigation
│   │   ├── ModuleSelector.tsx  # Grid of 9 modules
│   │   ├── Module.tsx          # Single module view
│   │   └── App.tsx             # Main app shell
│   ├── store/
│   │   ├── learner.ts          # Zustand store (session + progress)
│   │   └── simulation.ts       # Simulation state management
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── i18n/
│   │   ├── config.ts           # i18next configuration
│   │   └── locales/            # Language files (en, es, zh)
│   ├── styles/                 # CSS modules
│   ├── App.tsx                 # Main component
│   └── main.tsx                # Entry point
├── Dockerfile                  # Multi-stage build
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript strict mode
├── jest.config.cjs             # Jest test setup
└── package.json
```

#### Backend Architecture
```
backend/
├── src/
│   ├── routes/
│   │   └── sessions.ts         # Session CRUD endpoints
│   ├── services/
│   │   └── firestore.ts        # Database operations
│   ├── middleware/
│   │   └── auth.ts             # Firebase token verification
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── index.ts                # Express server setup
├── Dockerfile                  # Node.js Alpine image
├── tsconfig.json               # TypeScript configuration
├── dist/                       # Compiled JavaScript (ready to deploy)
└── package.json
```

#### Authentication (Phase 1)
- **Current**: Local guest sessions (ADR-016)
  - No server-side authentication required
  - Sessions stored in browser localStorage
  - User ID: `guest_<timestamp>`
  
- **Next**: Google OAuth (ADR-012)
  - Will verify identity on backend
  - Enable multi-device progress persistence
  - Secure assessment submissions

---

## Phase 2: Backend Deployment & API Integration (NEXT)

### Prerequisites
Before deploying the backend, you'll need:

1. **Google Cloud Project**
   ```bash
   export PROJECT_ID="e-vidhayak"
   gcloud config set project $PROJECT_ID
   ```

2. **Firebase Service Account Key**
   - Generated from Google Cloud Console
   - Contains: `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` (JSON key)

3. **Docker & gcloud CLI**
   - Docker for building images
   - gcloud for Cloud Run deployment

### Deployment Steps

#### Step 1: Build Backend Docker Image
```bash
cd backend
npm install
npm run build
docker build -t gcr.io/e-vidhayak/navier-stokes-backend:latest .
```

#### Step 2: Push to Google Container Registry
```bash
docker push gcr.io/e-vidhayak/navier-stokes-backend:latest
```

#### Step 3: Deploy to Cloud Run
```bash
gcloud run deploy navier-stokes-backend \
  --image gcr.io/e-vidhayak/navier-stokes-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 3600s \
  --set-env-vars=FIREBASE_PROJECT_ID=$PROJECT_ID \
  --set-env-vars=FIREBASE_SERVICE_ACCOUNT="$(cat path/to/service-key.json)"
```

#### Step 4: Verify Backend
```bash
export BACKEND_URL=$(gcloud run services describe navier-stokes-backend \
  --platform managed \
  --region us-central1 \
  --format='value(status.url)')

curl $BACKEND_URL/health
# Expected: {"success":true,"data":{"status":"healthy"},"timestamp":"..."}
```

#### Step 5: Update Frontend Configuration
Add to `frontend/src/config.ts`:
```typescript
export const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 
  'https://navier-stokes-backend-xxxxx.run.app';
```

#### Step 6: Integrate Frontend with Backend API
Update `frontend/src/store/learner.ts` to call backend:
```typescript
startSession: async () => {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    body: JSON.stringify({ user_id, email, name })
  });
  // Handle response...
}
```

---

## Phase 3: Google OAuth & Authentication (Planning)

### Requirements
1. Enable Firebase Authentication in GCP Console
2. Configure Google sign-in provider
3. Register Firebase Web App
4. Add Firebase SDK to frontend
5. Wire ID tokens to backend API

### Implementation Checklist
- [ ] Create Firebase Web App configuration
- [ ] Add `@react-firebase/auth` to frontend
- [ ] Implement login/logout UI components
- [ ] Update backend middleware to verify ID tokens
- [ ] Test OAuth flow end-to-end

---

## Phase 4: Visualization & Simulation (Planning)

### Rust WebAssembly Solver
1. Create Rust project: `cargo new --lib navier-stokes-wasm`
2. Implement 2D incompressible Navier-Stokes solver
3. Compile to WebAssembly: `wasm-pack build`
4. Integrate with frontend simulation store

### Three.js Visualization
1. Set up WebGL scene
2. Render velocity field as particle system
3. Render pressure field as color overlay
4. Add camera controls and zoom

### D3.js Data Visualization
1. Parameter space graphs (Re vs. Drag)
2. Equation annotations
3. Interactive sliders

---

## Development Workflow

### Local Development

#### Frontend
```bash
cd frontend
npm install
npm run dev           # Starts dev server on http://localhost:5173
npm run build         # Production build
npm run test          # Jest tests
npm run lint          # ESLint check
```

#### Backend
```bash
cd backend
npm install
npm run dev           # ts-node development server (port 3000)
npm run build         # TypeScript compilation
npm run start         # Run compiled code
npm run test          # Jest tests
```

### Deployment

#### Using deploy.sh (Recommended)
```bash
./deploy.sh e-vidhayak us-central1
```

#### Manual Deployment
```bash
# Frontend
docker build -t gcr.io/e-vidhayak/navier-stokes-frontend:latest frontend/
docker push gcr.io/e-vidhayak/navier-stokes-frontend:latest
gcloud run deploy navier-stokes-frontend \
  --image gcr.io/e-vidhayak/navier-stokes-frontend:latest

# Backend
docker build -t gcr.io/e-vidhayak/navier-stokes-backend:latest backend/
docker push gcr.io/e-vidhayak/navier-stokes-backend:latest
gcloud run deploy navier-stokes-backend \
  --image gcr.io/e-vidhayak/navier-stokes-backend:latest \
  --set-env-vars=FIREBASE_PROJECT_ID=$PROJECT_ID \
  --set-env-vars=FIREBASE_SERVICE_ACCOUNT="$(cat key.json)"
```

---

## Key Files Reference

### Critical Files (Don't Delete)
- `frontend/src/App.tsx` - Main React component
- `backend/src/index.ts` - Express server
- `frontend/src/store/learner.ts` - State management
- `ADR-NavierStokes-Tech-Architecture.md` - Architecture decisions
- `DEPLOYMENT.md` - Deployment guide

### Configuration Files
- `vite.config.ts` - Frontend build configuration
- `tsconfig.json` - TypeScript compiler options
- `cloudbuild.yaml` - CI/CD pipeline
- `.env` - Environment variables (git-ignored)

### Documentation
- `README.md` - Project overview
- `STATUS.md` - Development tracking
- `ADR-*.md` - Architecture decisions
- `LINKEDIN_ARTICLE.html` - Public education article

---

## Troubleshooting

### Frontend Issues

**White screen on load**
- Check browser console for errors
- Verify Zustand store initialization
- Confirm i18n configuration loaded

**Module navigation not working**
- Ensure `useLearnerStore` hook initialized
- Verify `ModuleSelector` component rendered
- Check module IDs (0-8)

### Backend Issues

**Port already in use**
- `lsof -i :3000` (find process)
- Kill with `kill -9 <PID>`
- Or use different port: `PORT=3001 npm run dev`

**TypeScript compilation errors**
- Run `npm run build` to see detailed errors
- Check types in `src/types/index.ts`
- Ensure `tsconfig.json` strict mode enabled

**Firestore connection fails**
- Verify `FIREBASE_PROJECT_ID` set
- Check service account key is valid JSON
- Ensure Cloud Firestore API enabled in GCP

### Deployment Issues

**Cloud Run deployment fails**
- Check Docker image builds: `docker build .`
- Verify image pushed to registry: `docker push`
- Review Cloud Build logs in GCP Console
- Check IAM permissions for service account

**Backend unreachable from frontend**
- Verify backend Cloud Run URL correct
- Check CORS configuration in backend
- Ensure frontend environment variable set
- Test with `curl $BACKEND_URL/health`

---

## Performance Metrics

### Current State (Phase 1)
- Frontend bundle: 388 KB gzipped
- TypeScript compilation: ~3 seconds
- Docker build: ~30 seconds
- Cloud Run cold start: ~1-2 seconds
- First contentful paint: ~1 sec (cached) / ~2-3 sec (cold)

### Target Metrics (All Phases)
- Bundle size: < 2 MB gzipped (all features)
- Simulation response: < 50 ms
- Frame rate: 60 FPS during animations
- Lighthouse score: > 90 (all categories)
- API latency: < 100 ms p95

---

## Security Considerations

### Current State
- HTTPS in transit (Cloud Run handles)
- No authentication required (Phase 1)
- No sensitive data stored (guest sessions only)
- CORS headers configured

### Phase 2 Security
- ID token verification on backend
- JWT claims validation
- Rate limiting (100 req/min per IP)
- GDPR data deletion (1 year inactive)

### Phase 3+ Security
- Implement CSP (Content Security Policy)
- Add HSTS (HTTP Strict Transport Security)
- Rate limiting per user
- Input validation on all endpoints
- Regular security audits

---

## Cost Analysis

### Current Monthly Estimate
- **Google Cloud Run (frontend)**: ~$2-3
  - Minimal traffic, scales to zero
- **Google Cloud Run (backend when deployed)**: ~$5-10
  - Sparse API usage, cold starts acceptable
- **Firestore (database)**: ~$1-2
  - Minimal reads/writes
- **Cloud Build (CI/CD)**: ~$0.70 per build
- **Total**: ~$10-20/month for initial deployment

### Scaling Estimate (10,000 learners)
- Frontend: ~$20-30/month (higher traffic)
- Backend: ~$30-50/month (API calls + storage)
- Database: ~$10-20/month (reads/writes)
- Analytics & monitoring: ~$5-10/month
- **Total**: ~$65-110/month at scale

---

## Next Milestones

### Week 1 (Before Next Session)
- [ ] Deploy backend to Cloud Run
- [ ] Verify backend health endpoint
- [ ] Test backend API endpoints manually

### Week 2-3
- [ ] Integrate frontend with backend API
- [ ] Test end-to-end session management
- [ ] Update STATUS.md with progress

### Week 4-5
- [ ] Implement Google OAuth (ADR-012)
- [ ] Set up Firebase Authentication
- [ ] Replace guest auth with real auth

### Week 6-8
- [ ] Create Rust WASM solver
- [ ] Implement Three.js visualization
- [ ] Create interactive simulators

### Week 9-12
- [ ] Assessment system implementation
- [ ] Learning analytics dashboard
- [ ] Full end-to-end testing
- [ ] Performance optimization
- [ ] Security audit

---

## Resources & References

### Official Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [Three.js Documentation](https://threejs.org/docs/)
- [D3.js Learning](https://d3js.org/)

### Educational Resources
- [Navier-Stokes Equations (MIT OpenCourseWare)](https://ocw.mit.edu/)
- [Computational Fluid Dynamics Primer](https://www.youtube.com/results?search_query=CFD+primer)
- [WebAssembly with Rust](https://rustwasm.org/docs/book/)

### Project Documentation
- `ADR-NavierStokes-Tech-Architecture.md` - Full architecture decisions
- `DEPLOYMENT.md` - Detailed deployment guide
- `STATUS.md` - Current development status
- `README.md` - Quick start guide

---

## Team Communication

### Status Updates
- Document progress in `STATUS.md`
- Update ADR if architecture decisions change
- Track blockers in deployment validation report

### Code Review Checklist
- [ ] TypeScript passes strict mode (no `any` types)
- [ ] ESLint passes (npm run lint)
- [ ] Tests pass (npm run test)
- [ ] No console errors/warnings in dev
- [ ] Documentation updated
- [ ] ADR updated if relevant

### Deployment Checklist
- [ ] Code merged to main branch
- [ ] All tests pass
- [ ] Documentation reviewed
- [ ] Deployment credentials ready
- [ ] Rollback plan documented
- [ ] Monitoring configured

---

## FAQs

**Q: Why local auth instead of OAuth in Phase 1?**  
A: ADR-016 explains this choice: unblock content access immediately. Full OAuth adds GCP configuration overhead; guest sessions let learners start learning while we build auth infrastructure.

**Q: When will simulations be available?**  
A: Phase 3+ (weeks 6-8). Currently backend & authentication foundations are priority.

**Q: Can learners share progress across devices?**  
A: Not yet. Phase 2 (backend integration) enables this. Currently progress stored locally only.

**Q: How do I contribute?**  
A: Follow development workflow above. Create feature branch, implement changes, run tests, commit to branch specified in instructions.

**Q: What about the Navier-Stokes WASM solver?**  
A: Designed for Phase 4. Will be Rust crate compiled to WebAssembly for browser execution.

---

**Last Updated**: 2026-09-10  
**Maintained By**: Development Team  
**Status**: Phase 1 Complete, Ready for Phase 2
