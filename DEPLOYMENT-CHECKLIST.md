# Netlify Deployment Checklist (5 Minutes)

Quick reference for deploying to Netlify.

---

## Pre-Deployment (2 min)

- [ ] Have Gemini API key ready (from https://aistudio.google.com/app/apikeys - FREE!)
- [ ] Have GitHub account logged in
- [ ] Have Netlify account created (https://netlify.com)

---

## Step 1: GitHub Branch (Already Done ✅)

```bash
# You're on branch: london-meetup-8Apr
git branch
# Output: london-meetup-8Apr

# Everything is already pushed
git status
# Output: working tree clean
```

---

## Step 2: Connect Netlify to GitHub (3 min)

1. Go to https://app.netlify.com
2. Click **"New site from Git"**
3. Click **"GitHub"**
4. Authorize Netlify
5. Find **`mondweep/vibe-cast`** and click it
6. Branch: **`london-meetup-8Apr`**
7. Build command: **`npm run build`** (auto-detected)
8. Publish directory: **`.next`** (auto-detected)
9. Click **"Deploy site"**

Wait 2-3 minutes for build.

---

## Step 3: Add Environment Variables (1 min)

After deployment starts:

1. Go to **"Site settings"**
2. Click **"Build & Deploy"** → **"Environment"**
3. Click **"Edit variables"**
4. Add variable:
   - Name: `GEMINI_API_KEY`
   - Value: Your Gemini API key (from https://aistudio.google.com/app/apikeys)
5. Click **"Save"**
6. Go to **"Deploys"** tab
7. Click **"Trigger deploy"** → **"Deploy site"**

Wait 2 minutes for new deploy.

---

## Step 4: Verify (1 min)

1. Check build status: ✅ "Deploy succeeded"
2. Click **"Preview"** or visit your URL: `https://xxx.netlify.app`
3. Go to `/dashboard`
4. Click **"Process All"**
5. Watch tickets get processed

**Success!** Share the URL with your team.

---

## If Something Fails

### Build Error: "better-sqlite3 failed"

**Solution**: Use Supabase instead of SQLite

1. Create Supabase account: https://supabase.com
2. Create new project
3. Get PostgreSQL connection string
4. Add `DATABASE_URL` environment variable in Netlify
5. Run schema.sql in Supabase SQL editor
6. Redeploy

See NETLIFY-DEPLOYMENT.md for detailed steps.

### "No CLAUDE_API_KEY" Error

1. Double-check environment variable is set in Netlify
2. Redeploy site
3. Wait 30 seconds for cold start

### Dashboard Shows Blank

1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab - look for API errors
4. If 502: wait 30 sec, refresh again

---

## URLs

| Page | URL |
|------|-----|
| Dashboard | `https://xxx.netlify.app/dashboard` |
| Home | `https://xxx.netlify.app` |
| API: Tickets | `https://xxx.netlify.app/api/tickets` |
| API: Status | `https://xxx.netlify.app/api/agents/status` |

---

## Estimate

- **Build time**: 2-3 minutes
- **Deployment time**: 1-2 minutes
- **Total**: 5-10 minutes
- **Cost**: ~$0 (free tier)

---

## Next

After deployment succeeds:

1. ✅ Share dashboard URL with team
2. ✅ Click "Process All" to demo
3. ✅ Show agent status and metrics
4. ✅ Explain architecture (see DEMO-GUIDE.md)
5. ✅ Celebrate! 🎉

---

**Done!** Your demo is live on the internet.
