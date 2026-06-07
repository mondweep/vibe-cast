# Vercel Environment Variables Setup Guide

**For Vibe-Cast Learning Platform**

---

## Quick Setup (5 minutes)

```bash
# 1. Connect your GitHub repo to Vercel
vercel link

# 2. Set environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_SECRET_KEY
vercel env add SUPABASE_PUBLISHABLE_KEY

# 3. Deploy
vercel deploy --prod
```

---

## Complete Environment Variables List

### Backend Environment Variables (src/api/)

These are used by the Fastify REST API server.

#### **Database Connection** (Required)

```bash
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY_HERE
SUPABASE_PUBLISHABLE_KEY=sb_public_YOUR_PUBLIC_KEY_HERE
```

**Where to find these**:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Settings" → "API"
4. Copy the values:
   - `SUPABASE_URL` = "Project URL"
   - `SUPABASE_SECRET_KEY` = Service Role Key (kept secret)
   - `SUPABASE_PUBLISHABLE_KEY` = Anon Public Key (public, safe to expose)

#### **Application Config** (Recommended)

```bash
NODE_ENV=production
API_PORT=3000
LOG_LEVEL=info
```

- `NODE_ENV=production` → Enables production optimizations
- `API_PORT=3000` → API port (Vercel ignores, shown for reference)
- `LOG_LEVEL=info` → Logging verbosity (debug, info, warn, error)

#### **Security** (Optional but Recommended)

```bash
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=3600000
```

- `RATE_LIMIT_REQUESTS=1000` → Requests per hour per IP
- `RATE_LIMIT_WINDOW_MS=3600000` → 1 hour in milliseconds

#### **Monitoring & Observability** (Optional)

```bash
SENTRY_DSN=https://KEY@ACCOUNT.ingest.sentry.io/PROJECT_ID
DATADOG_API_KEY=YOUR_DATADOG_KEY
```

- For error tracking (Sentry, Datadog)
- Only needed if you set up these services

---

### Frontend Environment Variables (src/web/)

These are used by the React application. **Important: Public variables must start with `VITE_`**

#### **API Integration** (Required)

```bash
VITE_API_URL=https://YOUR_DOMAIN.vercel.app
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sb_public_YOUR_PUBLIC_KEY_HERE
```

**Explanation**:
- `VITE_API_URL` = Your backend API domain (after deployment, use your Vercel URL)
- `VITE_SUPABASE_URL` = Same as backend
- `VITE_SUPABASE_ANON_KEY` = Public key (safe to expose on frontend)

#### **Application Config** (Optional)

```bash
VITE_APP_NAME=VibeCast
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
```

---

## Step-by-Step Setup in Vercel Dashboard

### Method 1: Via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/dashboard
   ```

2. **Select Your Project**
   - Click on "vibe-cast" project

3. **Go to Settings**
   - Click "Settings" tab

4. **Navigate to Environment Variables**
   - Left sidebar → "Environment Variables"

5. **Add Each Variable**
   - Click "Add New"
   - Name: `SUPABASE_URL`
   - Value: `https://xxxxx.supabase.co`
   - Select environments: Production, Preview, Development
   - Click "Save"

6. **Repeat for all variables** (see list above)

7. **Deploy**
   - Git push or click "Deploy" button

### Method 2: Via CLI (Faster)

```bash
# Login to Vercel
vercel login

# Set production environment variables
vercel env add SUPABASE_URL
# Paste: https://xxxxx.supabase.co

vercel env add SUPABASE_SECRET_KEY
# Paste: sb_secret_xxxxx

vercel env add SUPABASE_PUBLISHABLE_KEY
# Paste: sb_public_xxxxx

vercel env add VITE_API_URL
# Paste: https://vibe-cast-prod.vercel.app

vercel env add VITE_SUPABASE_URL
# Paste: https://xxxxx.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Paste: sb_public_xxxxx

# Deploy
vercel deploy --prod
```

---

## Environment-Specific Values

### Development (Local)

Use `.env.local` file:

```bash
# .env.local (Local development)
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxx
SUPABASE_PUBLISHABLE_KEY=sb_public_xxxxx
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sb_public_xxxxx
NODE_ENV=development
LOG_LEVEL=debug
```

### Preview (Staging)

Set different values for preview deployments:
- Use staging Supabase project (different project ID)
- Use preview API URL
- Set `LOG_LEVEL=debug` for troubleshooting

### Production

Use production values:
- Production Supabase project
- Production API URL
- `LOG_LEVEL=info` or `warn`

---

## Configuration Files

### vercel.json (Optional)

Create a `vercel.json` file in root directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "envPrefix": "VITE_",
  "framework": "vite",
  "regions": ["iad1"]
}
```

### .env.local (Do NOT commit)

```bash
# .env.local - Local development only
# Never commit this file

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxx
SUPABASE_PUBLISHABLE_KEY=sb_public_xxxxx

VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_public_xxxxx

NODE_ENV=development
LOG_LEVEL=debug
```

### .gitignore (Already configured)

```
.env.local
.env.*.local
```

---

## Where to Get Supabase Keys

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Select organization and database
4. Create project (takes ~2 minutes)

### Step 2: Get Project URL

1. In Supabase Dashboard
2. Click "Settings" → "API"
3. Copy "Project URL"
4. Looks like: `https://abc123def456.supabase.co`

### Step 3: Get API Keys

In same "Settings" → "API" page:

**Service Role Key** (Keep Secret - Backend Only)
```
sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- Used by backend server
- Never expose to frontend
- Store in Vercel secrets

**Anon Public Key** (Safe to expose - Frontend)
```
sb_public_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
- Used by frontend
- OK to expose in browser
- Store in VITE_ variables

### Step 4: Apply Database Migrations

```bash
# Connect to your Supabase project
supabase link --project-ref YOUR_PROJECT_ID

# Run migrations
supabase db push --dry-run  # Preview changes
supabase db push            # Apply changes

# Or manually in Supabase dashboard:
# 1. Go to "SQL Editor"
# 2. Copy contents of migrations/001_create_saga_state.sql
# 3. Paste and run
# 4. Repeat for migrations/ruflo_demo_schema.sql
```

---

## Verification Checklist

After setting environment variables:

- [ ] SUPABASE_URL is set and accessible
- [ ] SUPABASE_SECRET_KEY is properly stored in Vercel secrets
- [ ] SUPABASE_PUBLISHABLE_KEY is set in VITE_ variables
- [ ] VITE_API_URL points to correct domain
- [ ] VITE_SUPABASE_URL matches backend
- [ ] VITE_SUPABASE_ANON_KEY is public key (not secret)
- [ ] Database migrations applied to Supabase
- [ ] Health check endpoint responding: `https://YOUR_DOMAIN/health`
- [ ] API endpoints responding: `https://YOUR_DOMAIN/api/v1/learning/learners/{id}/profile`
- [ ] Frontend loads: `https://YOUR_DOMAIN`
- [ ] No 401/403 errors in network requests

---

## Troubleshooting

### 401 Unauthorized Error

**Problem**: API returns 401
**Solution**: 
- Check `SUPABASE_SECRET_KEY` is correct
- Verify X-API-Key header is sent by frontend
- Check client.ts Axios configuration includes auth header

### CORS Error

**Problem**: Frontend can't reach backend
**Solution**:
- Ensure `VITE_API_URL` is correct
- Check Fastify CORS is configured in server.ts
- Verify Supabase RLS policies allow requests

### 404 Not Found

**Problem**: `/api/v1/*` endpoints return 404
**Solution**:
- Verify API is deployed (check Vercel logs)
- Check `VITE_API_URL` doesn't have trailing slash
- Verify routes registered in src/api/server.ts

### Environment Variables Not Loading

**Problem**: Variables undefined in code
**Solution**:
- Frontend variables must start with `VITE_`
- Redeploy after adding variables
- Check Vercel Environment Variables page
- Verify variable names match exactly

### Supabase Connection Failed

**Problem**: Database connection errors
**Solution**:
- Verify `SUPABASE_URL` format
- Check `SUPABASE_SECRET_KEY` is not truncated
- Ensure Supabase project is active
- Check RLS policies don't block service role

---

## Security Best Practices

### ✅ DO

- ✅ Store SUPABASE_SECRET_KEY in Vercel Secrets
- ✅ Use SUPABASE_PUBLISHABLE_KEY for frontend (it's meant to be public)
- ✅ Rotate keys periodically (every 90 days)
- ✅ Use different projects for dev/staging/prod
- ✅ Enable RLS policies on all tables
- ✅ Monitor API usage in Vercel dashboard

### ❌ DON'T

- ❌ Commit `.env.local` to git
- ❌ Expose secret key in frontend code
- ❌ Use same keys for dev and production
- ❌ Share environment variables in chat/email
- ❌ Store keys in comments or README
- ❌ Disable RLS policies for convenience

---

## Example Complete Setup

Here's a full working example:

```bash
# Supabase Project: vibe-cast-prod
# Vercel Domain: vibe-cast-prod.vercel.app
# Region: us-east-1

# Backend Variables
SUPABASE_URL=https://abc123def456.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xyzabc1234567890xyzabc1234567890
SUPABASE_PUBLISHABLE_KEY=sb_public_xyzabc1234567890xyzabc1234567890
NODE_ENV=production
API_PORT=3000
LOG_LEVEL=info

# Frontend Variables
VITE_API_URL=https://vibe-cast-prod.vercel.app
VITE_SUPABASE_URL=https://abc123def456.supabase.co
VITE_SUPABASE_ANON_KEY=sb_public_xyzabc1234567890xyzabc1234567890
VITE_APP_NAME=VibeCast
```

---

## After Deployment

### Monitor Health

```bash
# Check API health
curl https://vibe-cast-prod.vercel.app/health

# Expected response
{
  "status": "ok",
  "timestamp": "2026-06-07T10:00:00Z"
}
```

### Check Logs

In Vercel dashboard:
1. Go to "Deployments"
2. Click latest deployment
3. Click "Runtime Logs"
4. Look for errors or warnings

### Verify Database

In Supabase dashboard:
1. Go to "SQL Editor"
2. Run: `SELECT COUNT(*) FROM ruflo_demo_saga_state;`
3. Should return 0 (no errors, connection works)

---

## Summary

**Minimum Required Variables**:
```
Backend:
- SUPABASE_URL
- SUPABASE_SECRET_KEY
- SUPABASE_PUBLISHABLE_KEY

Frontend:
- VITE_API_URL
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
```

**Total Setup Time**: ~10-15 minutes

**Test Command After Deploy**:
```bash
curl https://your-domain.vercel.app/health
```

You're ready to deploy! 🚀
