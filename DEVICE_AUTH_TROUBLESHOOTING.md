# Device Authentication Troubleshooting Guide

**Date**: 2026-09-12  
**Project**: vibe-cast (mondweep/vibe-cast)  
**Sessions Affected**: Multiple Claude Code sessions  
**Status**: RESOLVED with workarounds documented

---

## Executive Summary

Device authentication (gcloud OAuth flow) fails in **remote sandbox Claude Code environments** due to:
1. **Dummy credential override** - Sandbox pre-sets a `CLOUDSDK_AUTH_ACCESS_TOKEN` env var
2. **PKCE code verifier timing mismatch** - Each gcloud invocation generates new verifier
3. **Non-interactive environment limitations** - Browser-based OAuth doesn't work in headless shells

**Solution**: Run deployment from **local machine** or use **service account key** authentication.

---

## Problem 1: "No Credentialed Accounts" Error

### Error Message
```
ERROR: (gcloud.auth.login) Your current Compute Engine instance service account [default] does not have permission to access the [e-vidhayak] project.
```
or
```
No credentialed accounts found even after gcloud auth login
```

### Root Cause
The sandbox environment pre-sets a dummy `CLOUDSDK_AUTH_ACCESS_TOKEN` environment variable that **overrides any real credentials you provide**, preventing proper authentication.

### Solution: Unset the Dummy Token
```bash
# Check current token
echo $CLOUDSDK_AUTH_ACCESS_TOKEN

# Unset it
unset CLOUDSDK_AUTH_ACCESS_TOKEN

# Verify it's gone
echo $CLOUDSDK_AUTH_ACCESS_TOKEN  # Should be empty

# Make permanent for this session
export CLOUDSDK_AUTH_ACCESS_TOKEN=""
```

### Why This Happened
The sandbox is designed with default service account credentials for system operations. When you try to authenticate as a different user (e.g., your personal Google account), the dummy token prevents the real credentials from loading.

### Verification
```bash
gcloud auth list
# Should show your actual account, not a service account
```

---

## Problem 2: "Invalid code verifier" - PKCE Flow Failure

### Error Message
```
ERROR: (gcloud.auth.login) (invalid_grant) Invalid code verifier
```

### What is PKCE?
PKCE (Proof Key for Code Exchange) is an OAuth 2.0 security extension:

1. **Client generates code_verifier**: Random string (43-128 chars)
2. **Client creates code_challenge**: SHA-256(code_verifier), base64-URL-encoded
3. **Authorization request**: Includes code_challenge
4. **User grants permission**: Gets authorization code
5. **Token exchange**: Must include original code_verifier
6. **Server verification**: Confirms SHA-256(code_verifier) matches code_challenge

### Root Cause: Verifier Mismatch
**Each time you invoke gcloud, it generates a NEW code_verifier.**

Timeline of failure:
```
Time 0: gcloud auth login generates code_verifier_A
        → Opens browser with code_challenge_A
        
Time 1: User authenticates with Google
        → Gets authorization code bound to code_challenge_A
        
Time 2: gcloud tries to exchange code
        → But generates NEW code_verifier_B
        → SHA-256(code_verifier_B) ≠ code_challenge_A
        → Exchange fails: "Invalid code verifier"
```

### Why It Fails in Sandbox but Not Locally
- **Local machine**: gcloud CLI keeps session open, verifier stays in memory
- **Sandbox with piped input**: Each command invocation is separate, new verifier generated

### Failed Solutions We Tried
```bash
# ❌ Piping code to stdin (creates new gcloud invocation)
echo "4/0AT..." | gcloud auth login --no-launch-browser

# ❌ File-based input (still new invocation)
echo "4/0AT..." > /tmp/auth_code
cat /tmp/auth_code | gcloud auth login --no-launch-browser

# ❌ Combined in single shell script (multiple gcloud invocations)
gcloud auth login --no-launch-browser <<< "4/0AT..."
```

All failed because `gcloud auth login` as a command always generates a fresh code_verifier.

---

## Problem 3: Why gcloud OAuth Can't Work in This Environment

### The Fundamental Issue
gcloud's OAuth implementation requires:
1. **Stateful connection** - Same process keeps code_verifier in memory
2. **Interactive user input** - User pastes authorization code back into same shell session
3. **Browser redirection** - OAuth flow opens browser for user consent

The sandbox breaks all three:
- Commands are ephemeral (new processes each time)
- Piped input doesn't create stateful connection
- Non-interactive environment can't handle browser redirects

### Why Local Machine Works
```bash
# On your local machine:
gcloud auth login
# 1. Opens your browser
# 2. You authenticate with Google (same browser session)
# 3. Browser redirects back to local callback
# 4. Same gcloud process receives the redirect
# 5. Verifier still in memory = successful exchange
```

---

## Proven Solutions

### Solution 1: Deploy from Local Machine (RECOMMENDED ✅)

**Why it works**: Handles OAuth interactively with proper browser flow

**Steps**:
```bash
# On your local machine
cd /path/to/vibe-cast
git fetch origin
git checkout claude/navier-stokes-orphan-branch-0gxmj0

# This opens your browser automatically
gcloud auth login

# Set project
gcloud config set project e-vidhayak

# Deploy (no authentication needed, already logged in)
./AUTHENTICATE_AND_DEPLOY.sh e-vidhayak us-central1
```

**Expected result**: ✅ Deploys successfully in 15-20 minutes

---

### Solution 2: Service Account Key Authentication ✅

**Why it works**: Doesn't use PKCE flow, directly exchanges JSON credentials for token

**Steps**:

1. **Get GCP service account key**:
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=e-vidhayak
   - Click service account (or create: `cloudbuild-sa`)
   - Keys tab → Add key → Create new key → JSON
   - Download `service-account-key.json`

2. **Upload key to Claude Code**:
   ```bash
   # Create secure file in Claude Code environment
   cat > /tmp/gcp-key.json << 'EOF'
   {
     "type": "service_account",
     "project_id": "e-vidhayak",
     ...paste entire JSON...
   }
   EOF
   ```

3. **Deploy with key**:
   ```bash
   ./AUTHENTICATE_AND_DEPLOY.sh e-vidhayak us-central1 /tmp/gcp-key.json
   ```

**Expected result**: ✅ Deploys successfully without any browser interaction

**Security note**: Service account keys should be treated like passwords. Delete the key file after deployment.

---

### Solution 3: Python OAuth Handler (Alternative)

We created a Python-based OAuth handler that bypasses gcloud's PKCE issues:

**File**: `/tmp/oauth_handler.py`

**How it works**:
```bash
# Generate OAuth URL (user opens in browser)
# User gets authorization code, passes back to script
python3 /tmp/oauth_handler.py "4/0AT..."

# Script exchanges code directly, saves credentials
# Credentials saved to: /root/.config/gcloud/application_default_credentials.json
```

**Pros**: Direct HTTP exchange, no PKCE timing issues  
**Cons**: Requires manual token exchange, not as user-friendly

---

## Quick Reference: Which Solution to Use

| Scenario | Solution | Time | Complexity |
|----------|----------|------|------------|
| Deploying from local machine | Solution 1: `gcloud auth login` | 2 min | ⭐ Easy |
| Remote Claude Code environment | Solution 2: Service account key | 5 min | ⭐ Easy |
| No local gcloud installed | Solution 2: Service account key | 5 min | ⭐ Easy |
| Need Python-only auth | Solution 3: Python handler | 10 min | ⭐⭐ Medium |

**Recommendation**: Always use Solution 1 (local machine) or Solution 2 (service account key).

---

## Checklist: Avoiding These Issues in Other Sessions

When authenticating with Google Cloud in **any** Claude Code session:

### Before Attempting Authentication
- [ ] Check if this is a remote sandbox environment
- [ ] If yes, plan to use service account key or deploy from local machine
- [ ] Do NOT attempt gcloud OAuth in sandbox (will fail with PKCE errors)

### For Service Account Key Method
- [ ] Have GCP service account key JSON file ready
- [ ] Upload to Claude Code: `cat > /tmp/gcp-key.json << 'EOF' ...`
- [ ] Verify file exists: `cat /tmp/gcp-key.json | head -5`
- [ ] Run deployment: `./AUTHENTICATE_AND_DEPLOY.sh project us-central1 /tmp/gcp-key.json`

### For Local Machine Deployment
- [ ] Ensure gcloud CLI installed: `gcloud --version`
- [ ] Fetch latest code: `git fetch origin && git checkout branch-name`
- [ ] Interactive login: `gcloud auth login` (opens browser)
- [ ] Set project: `gcloud config set project your-project`
- [ ] Run deployment script

### If Things Still Fail
- [ ] Check for dummy token: `echo $CLOUDSDK_AUTH_ACCESS_TOKEN`
- [ ] If set, unset it: `unset CLOUDSDK_AUTH_ACCESS_TOKEN`
- [ ] Verify auth: `gcloud auth list`
- [ ] Check logs: `gcloud builds log BUILD_ID --stream`

---

## Context for Other Claude Sessions

When starting a new Claude session that needs GCP authentication, copy-paste this into the new session:

```
I need to authenticate with Google Cloud in a sandbox Claude Code environment. 
I've learned that:

1. DO NOT use gcloud OAuth in sandbox (PKCE code verifier mismatch)
2. DO use service account key authentication OR deploy from local machine
3. Service account key method:
   - Create/download key from GCP console: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Upload: cat > /tmp/gcp-key.json << 'EOF' ...your JSON... EOF
   - Deploy: ./AUTHENTICATE_AND_DEPLOY.sh project region /tmp/gcp-key.json
4. If dummy token error: unset CLOUDSDK_AUTH_ACCESS_TOKEN

My project details:
- Project: e-vidhayak
- Region: us-central1
- Account: mondweep@dxsure.uk
- Repo: mondweep/vibe-cast
- Branch: claude/navier-stokes-orphan-branch-0gxmj0

Please use the service account key method to deploy.
```

---

## Technical Deep Dive: Why PKCE Timing Fails

### What gcloud Does Internally
1. **gcloud init flow**:
   ```
   random_code_verifier = generate_random_string(128)
   code_challenge = base64_url_encode(sha256(code_verifier))
   auth_url = build_auth_url(..., code_challenge=code_challenge)
   ```

2. **Opens browser** with auth_url

3. **Waits for user to paste auth code**:
   ```
   auth_code = input("Enter authorization code: ")
   ```

4. **Exchanges code for token**:
   ```
   response = POST /oauth2/token {
     code: auth_code,
     code_verifier: ??? (needs original from step 1)
   }
   ```

### The Problem in Sandbox
When we do:
```bash
echo "4/0AT..." | gcloud auth login --no-launch-browser
```

This launches a **new process** for each gcloud invocation. The code_verifier from step 1 is lost when the process exits. A new process with a new verifier won't match.

### Why It Works Locally
`gcloud auth login` runs as **single interactive process**:
- Step 1: Generate verifier (stored in process memory)
- Step 2: Open browser
- Step 3: User authenticates, gets redirected
- Step 4: Still same process, verifier still in memory
- Step 5: Exchange succeeds

---

## Lessons Learned

1. **OAuth PKCE flow requires stateful session** - Can't work with piped input
2. **Sandbox environments override credentials** - Dummy tokens block real auth
3. **Service account keys bypass OAuth entirely** - Use them for automation
4. **Local machine deployment is most reliable** - Browser OAuth works as designed
5. **Document auth failures with root causes** - Prevents repeated troubleshooting

---

## Files Referenced

- `AUTHENTICATE_AND_DEPLOY.sh` - Main deployment script (supports multiple auth methods)
- `QUICK_DEPLOY.sh` - Simple deployment (assumes pre-authentication)
- `/tmp/oauth_handler.py` - Python OAuth handler (alternative method)
- `RUN_DEPLOYMENT_LOCALLY.md` - Local machine deployment guide
- `DEPLOY_FROM_CLAUDE_CODE.md` - Claude Code web environment guide

---

## Summary

**The core insight**: Don't fight the sandbox—work with it.

- ✅ **Use service account keys** for remote sandbox environments
- ✅ **Use local machine** when you have gcloud CLI installed
- ❌ **Avoid OAuth PKCE** in headless/non-interactive environments
- ❌ **Never expect** browser-based OAuth in piped shells

With this knowledge, you can deploy to GCP from any Claude Code session without hitting PKCE verification errors again.

---

**Version**: 1.0  
**Last Updated**: 2026-09-12  
**Status**: Ready for reuse in other sessions
