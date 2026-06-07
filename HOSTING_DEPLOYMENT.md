# Hosting & Deployment Guide

**Vibe-Cast Learning Platform**

---

## Quick Answer: Netlify + Vercel Recommended

**Frontend**: Netlify (or Vercel)  
**Backend**: Vercel Serverless Functions (or Railway/Heroku)  
**Database**: Supabase (PostgreSQL managed)  
**Total Cost**: ~$20-50/month for MVP

---

## Hosting Options Comparison

### Option 1: Vercel (Full-Stack) ✅ RECOMMENDED

**Best for**: Full-stack Node.js application  
**Frontend**: Vercel static hosting  
**Backend**: Vercel Serverless Functions  
**Database**: Supabase  

**Pros**:
- Unified dashboard for frontend + backend
- Automatic deployments from Git
- Zero-config TypeScript support
- Environment variables management
- Preview deployments
- 100GB bandwidth/month free tier

**Cons**:
- Serverless cold starts (~1-2 seconds)
- Limited to 10 seconds function timeout

**Cost**: $0-20/month for MVP (free tier + optional pro)

**Setup**:
```bash
# 1. Push code to GitHub
git push origin ruflo-demonstration

# 2. Connect to Vercel
vercel link

# 3. Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY

# 4. Deploy
vercel deploy --prod
```

---

### Option 2: Netlify + Railway (Recommended for Clarity)

**Frontend**: Netlify  
**Backend**: Railway  
**Database**: Supabase  

**Frontend (Netlify)**:
- Free tier: 100GB/month bandwidth, unlimited sites
- Perfect for static React/Vue builds
- Automatic Git deployments
- Custom domain support

**Backend (Railway)**:
- $5/month base
- Pay-as-you-go compute ($0.000463/hour)
- Perfect for Node.js/Express
- Automatic deployments from Git
- Built-in environment variables

**Pros**:
- Simple, separate concerns
- No serverless cold starts
- Easy to scale independently
- Clear deployment process

**Cons**:
- 2 services to manage
- Railway has smaller ecosystem than Vercel

**Cost**: ~$15-30/month

**Setup**:
```bash
# Frontend on Netlify
1. Connect GitHub repo to Netlify
2. Build command: npm run build
3. Publish directory: dist/
4. Deploy

# Backend on Railway
1. Connect GitHub repo to Railway
2. Add environment variables
3. Railway detects Node.js and deploys automatically
4. Get backend URL
5. Update frontend API endpoint
```

---

### Option 3: AWS + Vercel

**Frontend**: Vercel  
**Backend**: AWS Lambda + API Gateway  
**Database**: Supabase  

**Pros**:
- Highly scalable
- Enterprise-grade
- Extensive customization

**Cons**:
- Complex setup
- Cost: $20-50+/month
- Steeper learning curve

**Not recommended for MVP**

---

### Option 4: Heroku (Legacy)

**Note**: Heroku free tier discontinued (Nov 2022)

**Pricing**: $7/month minimum (Eco Dynos)

**Not recommended** - Railway is better

---

## Detailed Setup: Vercel (Recommended)

### Prerequisites
```bash
npm install -g vercel
git push origin ruflo-demonstration
```

### Step 1: Create Vercel Account
```bash
vercel login
# Opens browser for authentication
```

### Step 2: Link Project
```bash
cd /home/user/vibe-cast
vercel link
# Select "Create new project" > "vibe-cast"
```

### Step 3: Set Environment Variables
```bash
vercel env add SUPABASE_URL
# Paste Supabase project URL

vercel env add SUPABASE_SECRET_KEY
# Paste Supabase secret key

vercel env add NODE_ENV
# production
```

### Step 4: Configure vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  },
  "env": {
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_SECRET_KEY": "@supabase_secret_key"
  }
}
```

### Step 5: Deploy
```bash
vercel deploy --prod
```

### Step 6: Configure Custom Domain
```bash
vercel domains add vibe-cast.com
# Follow DNS setup instructions
```

---

## Detailed Setup: Railway (For Backend Only)

### Step 1: Create Railway Account
```
https://railway.app
Sign up with GitHub
```

### Step 2: Create New Project
```
New Project > GitHub repo > vibe-cast
```

### Step 3: Set Environment Variables
```bash
SUPABASE_URL = <your-supabase-url>
SUPABASE_SECRET_KEY = <your-secret-key>
NODE_ENV = production
PORT = 8080
```

### Step 4: Configure package.json
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc",
    "dev": "ts-node src/server.ts"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### Step 5: Deploy
```bash
git push origin ruflo-demonstration
# Railway auto-detects and deploys
```

### Step 6: Get Backend URL
```
Railway Dashboard > Deployments > Copy public URL
# https://vibe-cast-prod-abc123.up.railway.app
```

---

## Deployment Architecture

### Option 1: Vercel (Recommended)

```
┌─────────────────────────────────────────────────┐
│                  User Browser                    │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │   Vercel CDN            │
        │  (Frontend - React)      │
        │  vibe-cast.vercel.app    │
        └────────────┬────────────┘
                     │ API calls
        ┌────────────▼────────────────┐
        │  Vercel Serverless API      │
        │  /api/learner/:id           │
        │  /api/enrollment            │
        │  /api/exam                  │
        └────────────┬────────────────┘
                     │
        ┌────────────▼────────────┐
        │     Supabase            │
        │   PostgreSQL Database   │
        │   (ruflo_demo schema)   │
        └─────────────────────────┘
```

### Option 2: Netlify + Railway

```
┌─────────────────────────────────────────────────┐
│                  User Browser                    │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────▼──────────────┐
        │   Netlify CDN             │
        │ (Frontend - React)         │
        │ vibe-cast.netlify.app      │
        └────────────┬──────────────┘
                     │ API calls
        ┌────────────▼──────────────────┐
        │  Railway Node.js Server       │
        │  /api/learner/:id             │
        │  /api/enrollment              │
        │  /api/exam                    │
        │ vibe-cast-prod.railway.app    │
        └────────────┬──────────────────┘
                     │
        ┌────────────▼────────────┐
        │     Supabase            │
        │   PostgreSQL Database   │
        │   (ruflo_demo schema)   │
        └─────────────────────────┘
```

---

## Cost Breakdown

### Vercel Option
| Service | Cost | Notes |
|---------|------|-------|
| Vercel Frontend | $0 | Free tier |
| Vercel Serverless | $0 | 100 function invocations/day free |
| Supabase | $25 | Pro tier (5GB, 500k auth users) |
| Domain | $12 | .com domain |
| **Total** | **~$37/month** | Scales with usage |

### Railway Option
| Service | Cost | Notes |
|---------|------|-------|
| Netlify Frontend | $0 | Free tier |
| Railway Backend | $5-20 | Pay-as-you-go |
| Supabase | $25 | Pro tier |
| Domain | $12 | .com domain |
| **Total** | **~$42-57/month** | Scales with usage |

---

## Environment Variables Setup

### Supabase Credentials
```bash
# .env.production
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_SECRET_KEY=sb_secret_abc123...
SUPABASE_PUBLISHABLE_KEY=sb_public_abc123...
```

### Application Config
```bash
NODE_ENV=production
API_PORT=3000
LOG_LEVEL=info
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=3600000
```

### Monitoring
```bash
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=...
```

---

## CI/CD Pipeline with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: vercel/action@v4
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
```

---

## Monitoring & Observability

### Uptime Monitoring
- **Uptime Robot**: https://uptimerobot.com (free)
- Monitor: `https://vibe-cast.vercel.app/health`

### Error Tracking
- **Sentry**: https://sentry.io
- Auto-capture JavaScript errors
- Server-side error logging

### Performance Monitoring
- **Vercel Analytics**: Built-in
- **Supabase Logs**: Built-in
- **Custom**: MetricsCollector integration

### Logging
```bash
# View Vercel logs
vercel logs <deployment-id>

# View Railway logs
railway logs

# View Supabase logs
supabase logs --prod
```

---

## Scaling Considerations

### Current (MVP)
- 10-100 concurrent users
- Vercel free tier sufficient
- Single Supabase project

### Growth (100-1000 users)
- Upgrade Vercel to Pro ($20/month)
- Upgrade Supabase to Team tier ($50/month)
- Enable CDN caching

### Scale (1000+ users)
- Multi-region Vercel deployments
- Supabase read replicas
- Redis caching layer
- Database connection pooling (PgBouncer)

---

## Recommended Path for MVP

1. **Use Vercel for simplicity**
   - Single dashboard
   - Automatic Git deployments
   - No serverless cold starts with Serverless Functions

2. **Use Supabase for database**
   - Already configured in migrations
   - RLS policies ready
   - Built-in authentication

3. **Deploy immediately after API + Frontend complete**
   - Push to GitHub
   - Vercel auto-detects and deploys
   - Custom domain setup (5 minutes)

4. **Monitor in production**
   - Set up error tracking (Sentry)
   - Enable analytics (Vercel built-in)
   - Monitor database (Supabase console)

---

## Costs Summary

| Scenario | Monthly Cost |
|----------|-------------|
| MVP (100 users) | $37 |
| Growth (1000 users) | $75 |
| Scale (10000+ users) | $150+ |

All costs scale with usage. Start cheap, scale as needed.

---

## Next Steps

1. ✅ Decide: Vercel or Netlify+Railway
2. ⏳ Complete REST API implementation
3. ⏳ Complete Frontend UI
4. ⏳ Create Supabase project
5. ⏳ Apply database migrations
6. ⏳ Deploy to chosen platform
7. ⏳ Configure custom domain
8. ⏳ Set up monitoring

Recommended: **Proceed with REST API and Frontend implementation, then deploy to Vercel.**
