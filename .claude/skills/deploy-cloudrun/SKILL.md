---
name: deploy-cloudrun
description: Deploy the fiat500-tracker app to Google Cloud Run. Handles gcloud CLI installation, OAuth authentication, Cloud Build, and Cloud Run deployment.
argument-hint: [service-name]
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
---

# Deploy to Google Cloud Run

Deploy the fiat500-tracker application to Google Cloud Run. This skill handles the full deployment pipeline from this sandbox environment where `gcloud` is not pre-installed and interactive auth is not available.

Service name defaults to `fiat500-tracker` unless overridden via `$ARGUMENTS`.

## Configuration

- **GCP Project**: `fiat500-tracker`
- **Region**: `europe-west2`
- **Artifact Registry**: `europe-west2-docker.pkg.dev/fiat500-tracker/fiat500-tracker`
- **Service URL**: `https://fiat500-tracker-83829553594.europe-west2.run.app`
- **App directory**: `fiat500-tracker/` (relative to repo root)

## Deployment Steps

### Step 1: Install gcloud CLI (if not present)

```bash
which gcloud || (cd /tmp && curl -sSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz | tar xz && ./google-cloud-sdk/install.sh --quiet --path-update true)
export PATH="/tmp/google-cloud-sdk/bin:$PATH"
```

Always ensure `export PATH="/tmp/google-cloud-sdk/bin:$PATH"` is prepended to every gcloud command.

### Step 2: Authenticate via OAuth PKCE flow

Since this environment cannot run interactive `gcloud auth login`, use a manual OAuth flow:

1. Generate a PKCE code verifier and challenge:
```bash
VERIFIER=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
CHALLENGE=$(python3 -c "import hashlib,base64,sys; v=sys.argv[1]; print(base64.urlsafe_b64encode(hashlib.sha256(v.encode()).digest()).rstrip(b'=').decode())" "$VERIFIER")
echo "VERIFIER=$VERIFIER" > /tmp/oauth_state
echo "CHALLENGE=$CHALLENGE" >> /tmp/oauth_state
```

2. Present the auth URL to the user:
```
https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=32555940559.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fsdk.cloud.google.com%2Fauthcode.html&scope=openid%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcloud-platform%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcompute&prompt=consent&access_type=offline&code_challenge=${CHALLENGE}&code_challenge_method=S256
```

3. Ask the user to open the URL, sign in, and paste the verification code.

4. Exchange the code for tokens:
```bash
source /tmp/oauth_state
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "code=<USER_CODE>" \
  -d "client_id=32555940559.apps.googleusercontent.com" \
  -d "client_secret=ZmssLNjJy2998hD4CTg2ejr2" \
  -d "redirect_uri=https://sdk.cloud.google.com/authcode.html" \
  -d "grant_type=authorization_code" \
  -d "code_verifier=$VERIFIER" > /tmp/token_response.json
```

5. Configure gcloud credential databases using Python:
   - Write `credentials.db` with the refresh token (table: `credentials`, columns: `account_id TEXT PRIMARY KEY, value TEXT`)
   - Write `access_tokens.db` with the access token (table: `access_tokens`, columns: `account_id TEXT PRIMARY KEY, access_token TEXT, token_expiry TIMESTAMP, rapt_token TEXT, id_token TEXT`)
   - **IMPORTANT**: The `token_expiry` column must be a Python `datetime` object, NOT a string, or gcloud will crash with `AttributeError: 'str' object has no attribute 'tzinfo'`
   - Write `properties` file with `[core]\naccount = <email>\nproject = fiat500-tracker`
   - The config directory is at the path returned by: `gcloud info --format="value(config.paths.global_config_dir)"`

6. Verify auth: `gcloud auth list` should show the account as active.

### Step 3: Build Docker image via Cloud Build

```bash
gcloud builds submit <APP_DIR> \
  --tag europe-west2-docker.pkg.dev/fiat500-tracker/fiat500-tracker/fiat500-tracker:latest \
  --region europe-west2
```

The Dockerfile is a multi-stage build:
- Stage 1 (builder): `node:20-slim` — installs deps and compiles TypeScript
- Stage 2 (production): `mcr.microsoft.com/playwright` — copies compiled JS, runs as non-root

### Step 4: Deploy to Cloud Run

Read environment variables from `fiat500-tracker/.env` and pass them via `--set-env-vars`.

**IMPORTANT**: Do NOT include `PORT` — Cloud Run sets it automatically and will reject the deployment if you try to set it.

```bash
gcloud run deploy fiat500-tracker \
  --image europe-west2-docker.pkg.dev/fiat500-tracker/fiat500-tracker/fiat500-tracker:latest \
  --region europe-west2 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,SUPABASE_URL=...,SUPABASE_SERVICE_KEY=...,..."
```

### Step 5: Verify deployment

```bash
curl -s https://fiat500-tracker-83829553594.europe-west2.run.app/health
```

Expected: `{"status":"healthy","timestamp":"..."}`

Also test an authenticated endpoint:
```bash
curl -s -H "Authorization: Bearer <API_KEY>" https://fiat500-tracker-83829553594.europe-west2.run.app/api/config
```

## Troubleshooting

- **gcloud crash `ValueError: not enough values to unpack`**: credentials.db schema mismatch. Recreate it.
- **gcloud crash `AttributeError: 'str' object has no attribute 'tzinfo'`**: access_tokens.db `token_expiry` was stored as string. Must be a `datetime` object.
- **Cloud Build fails on `COPY dist/`**: Dockerfile needs multi-stage build. The `.dockerignore` excludes `dist/` so it must be built inside the container.
- **Cloud Run rejects `PORT` env var**: PORT is reserved. Remove it from `--set-env-vars`.
- **Docker daemon not available**: Use `gcloud builds submit` instead of local `docker build`.
