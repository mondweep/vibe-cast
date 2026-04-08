# Netlify Deployment Guide

Deploy the Customer Support Triage demo to Netlify in 10 minutes.

---

## Prerequisites

1. **Netlify Account**: https://netlify.com (free tier works)
2. **GitHub Account**: Already have this (repo is on GitHub)
3. **Claude API Key**: Get from https://console.anthropic.com
4. **Supabase Account** (optional, for production DB): https://supabase.com

---

## Step 1: Prepare Database (Choose One)

### Option A: Use SQLite (Simplest - Recommended for Demo)

**Pros**: Zero configuration, works immediately, deterministic  
**Cons**: Data resets on function restart (fine for 30-min demo)

Skip to Step 2. The system uses `/tmp/demo.db` which Netlify Functions support.

### Option B: Use Supabase (Recommended for Longer Demos)

Data persists across function restarts.

1. **Create Supabase project**:
   - Go to https://supabase.com
   - Click "New Project"
   - Project name: `vibe-cast-demo`
   - Database password: (save this)
   - Region: Pick closest to you
   - Wait 2 min for creation

2. **Get connection string**:
   - In Supabase dashboard, go to "Settings" → "Database"
   - Copy "Connection string" (PostgreSQL)
   - Format: `postgresql://[user]:[password]@[host]:5432/[database]`

3. **Create tables**:
   - In Supabase, go to "SQL Editor"
   - Click "New Query"
   - Paste content from `public/schema.sql`
   - Click "Run"

4. **Save connection string** for Step 3

---

## Step 2: Connect GitHub to Netlify

1. Go to https://app.netlify.com
2. Click **"New site from Git"**
3. Click **"GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select **`mondweep/vibe-cast`** repository
6. Select branch: **`london-meetup-8Apr`**
7. Click **"Deploy site"**

Netlify will auto-detect Next.js and create the site. You'll get a URL like `https://xxx.netlify.app`.

---

## Step 3: Configure Environment Variables

### In Netlify Dashboard:

1. Go to your site settings
2. Click **"Build & Deploy"** → **"Environment"**
3. Click **"Edit variables"** (or **"New variable"**)

**Add these variables**:

```
CLAUDE_API_KEY = sk-ant-xxxxx... (your Claude API key)
```

**If using Supabase** (Option B):
```
DATABASE_URL = postgresql://[user]:[password]@[host]:5432/[database]
```

**If using SQLite** (Option A):
```
# No additional variables needed
```

4. Click **"Save"**
5. Trigger a new deployment:
   - Go to **"Deploys"**
   - Click **"Trigger deploy"** → **"Deploy site"**

---

## Step 4: Verify Deployment

Wait for build to complete (2-3 min):

```
✅ Build succeeded
✅ Functions deployed
✅ Site published
```

Visit your site: `https://xxx.netlify.app`

### Test endpoints:

```bash
# List all tickets
curl https://xxx.netlify.app/api/tickets

# Get agent status
curl https://xxx.netlify.app/api/agents/status

# View dashboard
open https://xxx.netlify.app/dashboard
```

---

## Step 5: Run Demo on Netlify

1. Open https://xxx.netlify.app/dashboard
2. Click **"Process All"** button
3. Watch agents process tickets live
4. Share URL with your team!

---

## Database Options Comparison

| Feature | SQLite | Supabase |
|---------|--------|----------|
| Setup time | 0 min | 5 min |
| Cost | $0 | $0 (free tier) |
| Data persistence | No (resets on restart) | Yes |
| Query performance | Fast | Very fast |
| Best for | 30-min demo | Production |

---

## Troubleshooting

### Build Fails: "Cannot find module 'better-sqlite3'"

**Issue**: Netlify can't build C++ extensions for SQLite

**Solution**: Use Supabase (Option B) instead, or add to `package.json`:

```json
{
  "engines": {
    "node": "18.x"
  }
}
```

Then redeploy.

### Database Connection Fails

**Check**:
1. Environment variable `DATABASE_URL` is set correctly
2. Supabase project is active (not paused)
3. You're using PostgreSQL connection string, not others

### "No CLAUDE_API_KEY" Error

**Fix**:
1. Go to Netlify dashboard
2. Site settings → Build & Deploy → Environment
3. Add `CLAUDE_API_KEY` variable
4. Trigger new deploy

### Dashboard Shows "Loading..." Forever

**Check**:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab - are API calls succeeding?
4. If 502 errors: wait 30 sec for cold start, then refresh

### Demo Data Not Showing

**Cause**: Database not seeded

**Fix**:
1. If SQLite: Data resets on cold start, call endpoint to reseed:
   ```bash
   curl -X POST https://xxx.netlify.app/api/agents/process-all
   ```
2. If Supabase: Manually run schema.sql in SQL Editor

---

## Production Considerations

### What to Add Before Production:

1. **Authentication**:
   ```typescript
   // pages/api/middleware/auth.ts
   export function requireAuth(req, res) {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'Unauthorized' });
     // Verify JWT token
   }
   ```

2. **Rate Limiting**:
   ```typescript
   // Use Netlify Blobs for rate limit tracking
   const rateLimit = await getBlob('rate-limits');
   ```

3. **Logging**:
   ```typescript
   // Send logs to CloudWatch/Datadog
   console.log(JSON.stringify({ level: 'info', event, timestamp }));
   ```

4. **Monitoring**:
   - Enable Netlify Analytics
   - Set up error notifications
   - Monitor function execution time

5. **Security**:
   - Add HTTPS (Netlify does this automatically)
   - Implement CORS properly
   - Validate all inputs
   - Use secrets for API keys

---

## Environment Variables Reference

| Variable | Required | Value |
|----------|----------|-------|
| `CLAUDE_API_KEY` | ✅ Yes | Your Claude API key (sk-ant-...) |
| `DATABASE_URL` | ❌ No | Supabase connection string (if using Supabase) |
| `NODE_ENV` | ❌ No | "production" (Netlify sets automatically) |

---

## Netlify Build Settings (Auto-Detected)

```
Build command: npm run build
Publish directory: .next
Node version: 18 (or higher)
Functions directory: netlify/functions (for advanced users)
```

If these aren't auto-detected:

1. Go to Site settings
2. Build & Deploy → Build settings
3. Edit build command: `npm run build`
4. Edit publish directory: `.next`
5. Save

---

## Monitoring After Deployment

### View Logs:

1. Netlify dashboard → **"Deploys"** tab
2. Click latest deploy
3. Scroll to **"Deploy log"** section
4. See build output and any errors

### Monitor Functions:

1. Netlify dashboard → **"Functions"** tab
2. See execution count, duration, errors
3. Click function to see logs

### Check Performance:

1. Open **"Analytics"** tab
2. View page loads, requests, errors
3. Identify slow endpoints

---

## Custom Domain (Optional)

1. Buy domain (e.g., GoDaddy, Namecheap)
2. In Netlify: Site settings → **"Custom domains"**
3. Add your domain
4. Update DNS records (Netlify shows instructions)
5. Wait for DNS propagation (5-30 min)

Your site now runs on your custom domain!

---

## Redeploying

To redeploy after code changes:

**Option 1: Automatic** (recommended)
- Push changes to GitHub branch `london-meetup-8Apr`
- Netlify auto-deploys (2-3 min)

**Option 2: Manual**
- Netlify dashboard → **"Deploys"**
- Click **"Trigger deploy"** → **"Deploy site"**

---

## Cost Estimate

| Item | Monthly Cost |
|------|--------------|
| Netlify Functions | $0-20 (free tier: 125k invocations) |
| Netlify Hosting | $0 (free tier) |
| Supabase Database | $0 (free tier, ~500 MB) |
| Claude API | Depends on usage (~$2-10/month) |
| **Total** | **$2-30/month** |

For a 30-min demo, cost is <$1.

---

## Quick Reference Commands

```bash
# Test locally before deploying
npm run dev
# Open http://localhost:3000/dashboard

# Build for production
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Deploy to Netlify (after git push)
# Netlify auto-deploys, or use dashboard

# View deployment logs
# Netlify dashboard → Deploys → View deploy log
```

---

## Demo Checklist

Before showing to your team:

- [ ] Netlify deployment complete
- [ ] Environment variables set (CLAUDE_API_KEY)
- [ ] Dashboard loads without errors
- [ ] "Process All" button works
- [ ] Tickets are classified
- [ ] Agents complete resolutions
- [ ] Cost tracking is visible
- [ ] Share URL with team: `https://xxx.netlify.app/dashboard`

---

## Need Help?

- **Netlify Docs**: https://docs.netlify.com
- **Next.js Deployment**: https://nextjs.org/docs/deployment/netlify
- **Claude API**: https://docs.anthropic.com
- **Supabase Docs**: https://supabase.com/docs

---

**You're ready to deploy!** Push to GitHub and Netlify will handle the rest. 🚀
