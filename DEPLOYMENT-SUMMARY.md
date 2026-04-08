# Deployment Summary & Quick Start

Everything you need to deploy and demo the system.

---

## Files You Need to Read

In this order:

1. **DEPLOYMENT-CHECKLIST.md** ← **START HERE** (5 min read)
   - Quick step-by-step to deploy to Netlify
   - Copy-paste ready

2. **NETLIFY-DEPLOYMENT.md** (10 min read)
   - Detailed explanation of each step
   - Troubleshooting section
   - Database options (SQLite vs Supabase)

3. **DEMO-GUIDE.md** (5 min read)
   - How to explain the system during the demo
   - Demo flow (30 min presentation)
   - FAQ section

---

## TL;DR (Fastest Path)

```bash
# 1. Get Claude API key
# https://console.anthropic.com → API keys → Copy key

# 2. Connect GitHub to Netlify
# https://app.netlify.com → "New site from Git"
# Select: mondweep/vibe-cast, branch london-meetup-8Apr

# 3. Add environment variable
# Netlify UI → Site settings → Build & Deploy → Environment
# Add: CLAUDE_API_KEY = sk-ant-xxxxx

# 4. Trigger deploy
# Netlify UI → Deploys → Trigger deploy

# 5. Wait 5 min, then open dashboard
# https://your-site.netlify.app/dashboard
# Click "Process All"

# 6. Demo!
```

---

## Deployment Options

### Option A: SQLite (Simplest)
- ✅ Zero setup
- ✅ Works immediately
- ❌ Data resets on function restart
- **Best for**: 30-min demo

### Option B: Supabase (Best)
- ✅ Data persists
- ✅ Real database (production-ready)
- ⏳ 5 min setup
- **Best for**: Extended demos, production

**Recommendation**: Use Option A (SQLite) for your first demo. You can always upgrade to Option B later.

---

## What Happens After You Deploy

1. **Netlify builds your Next.js app** (2 min)
2. **Deploys to global CDN** (1 min)
3. **Your site is live** at `https://xxx.netlify.app`
4. **Database auto-seeds** on first API call
5. **You click "Process All"** and watch agents work

---

## Key Environment Variables

Only ONE is required:

| Variable | Required | Value |
|----------|----------|-------|
| `CLAUDE_API_KEY` | ✅ YES | Your Claude API key (sk-ant-...) |
| `DATABASE_URL` | ❌ No | Only if using Supabase |

---

## After Deployment

### Share with Team

Send them: `https://your-site.netlify.app/dashboard`

They'll see:
- Live ticket queue
- Agent status (token usage, budget)
- Real-time metrics
- "Process All" button to watch demo

### Show Them the Code

Point them to:
- **Agents**: `agents/` directory (intake, billing, technical, account, escalation)
- **Prompts**: `docs/prompts/` directory (see how agents are configured)
- **API**: `pages/api/` directory (REST endpoints)
- **Database**: `lib/db.ts` (SQLite layer)

### Explain the Architecture

Show them:
- `docs/spec/SPEC-001-support-triage.md` (overall design)
- `docs/adr/ADR-001-agent-orchestration.md` (why event-driven)
- `DEMO-GUIDE.md` (how to present)

---

## Estimated Costs

| Item | Cost |
|------|------|
| Netlify (Functions + Hosting) | $0 (free tier) |
| Supabase (if used) | $0 (free tier) |
| Claude API | ~$0.10-2.00 (depends on usage) |
| Custom domain | $10-15/year (optional) |
| **Total** | **~$0-20/month** |

For a one-time demo: **<$1**

---

## Troubleshooting Quick Links

Having an issue? Go to NETLIFY-DEPLOYMENT.md section:

- **Build fails**: "Troubleshooting" → "Build Fails"
- **Database issues**: "Troubleshooting" → "Database Connection"
- **API errors**: "Troubleshooting" → "No CLAUDE_API_KEY"
- **Dashboard blank**: "Troubleshooting" → "Dashboard Shows Loading"
- **Need more help**: Bottom of NETLIFY-DEPLOYMENT.md has links

---

## Timeline

| Step | Time |
|------|------|
| Create Netlify account | 2 min |
| Connect GitHub | 3 min |
| Set environment variables | 1 min |
| Wait for build | 3 min |
| Verify deployment | 1 min |
| **Total** | **10 min** |

---

## After Demo: Next Steps

1. **Get feedback**: What did your team think?
2. **Try modifications**: Change a prompt, add a new agent
3. **Integrate with real system**: Connect to your actual ticket system
4. **Upgrade database**: Move from SQLite to Supabase for persistence
5. **Add monitoring**: Set up error tracking, performance monitoring
6. **Production deployment**: Add auth, rate limiting, logging

---

## Important Notes

✅ **Everything is ready**: Code is complete, tested, pushed to GitHub

✅ **Auto-seeding works**: Database seeded automatically on first use

✅ **SQLite is fine**: Works perfectly for demos and small scale

⚠️ **Cold starts**: First request takes 3-5 sec (Netlify Functions), subsequent requests are fast

⚠️ **Data persistence**: SQLite data is ephemeral (resets when function restart). Use Supabase for permanent storage.

✅ **Costs low**: Even with heavy usage, should be <$5/month

---

## Quick Command Reference

```bash
# Test locally before deploying
npm install
npm run dev
# Visit http://localhost:3000/dashboard

# Build for production
npm run build

# Check for errors
npx tsc --noEmit

# After pushing to GitHub:
# Netlify auto-deploys to london-meetup-8Apr
```

---

## You're Ready!

1. ✅ Read DEPLOYMENT-CHECKLIST.md (5 min)
2. ✅ Follow the 4 steps
3. ✅ Share the URL with your team
4. ✅ Click "Process All" and demo!

**Questions?** See NETLIFY-DEPLOYMENT.md for detailed explanations.

---

**One command to remember**: Everything else is in the Netlify UI.

*Happy deploying!* 🚀
