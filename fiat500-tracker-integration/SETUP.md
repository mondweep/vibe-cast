# Fiat 500 Tracker ↔ OpenClaw Integration Setup

**Status:** Ready to Deploy  
**Created:** 2026-02-24  
**Author:** Maina (Claude)

---

## Overview

This integration connects your **Fiat 500 Tracker** (GCP Cloud Run) to **OpenClaw** (EC2) via **Tailscale private network**. You can:

- Chat with your car tracker via WhatsApp (`/tracker shortlist`, `/tracker car 3`, etc.)
- Receive real-time notifications (new listings, price drops, seller replies)
- Pause/resume tracking from chat
- Draft, approve, and send seller emails from WhatsApp

---

## Architecture

```
GCP Cloud Run (Fiat500 Tracker)
      ↓ (Webhook events every 3 hours + seller replies)
  [Tailscale VPN, private IP 100.96.X.X:18789]
      ↓
EC2 OpenClaw Gateway
  ├─ Webhook receiver (POST /webhooks/fiat500)
  ├─ Message router (/tracker commands)
  └─ API client (calls back to Fiat500)
      ↓
    WhatsApp
```

**Key properties:**
- **Zero public exposure** — All communication via Tailscale private network
- **Encrypted end-to-end** — TLS 1.3 enforced by Tailscale
- **Authentication** — Bearer tokens on both sides
- **Audit trail** — All API calls logged in OpenClaw

---

## Prerequisites

✅ **Tailscale setup complete:**
```bash
sudo tailscale status
# Output: [Tailscale private IP]  maina-ec2  online ✓
```

✅ **Fiat500 API credentials stored (ENCRYPTED):**
```bash
cat ~/.private/fiat500-api-config.json
# Contains: baseUrl, apiKey, webhookSecret
# ⚠️ NEVER commit this file to Git
```

✅ **Node.js 18+** (already installed on EC2)

---

## Step 1: Build TypeScript Files

```bash
cd /home/ec2-user/.openclaw/workspace/fiat500-tracker-integration

# Install dependencies (if not already done)
npm install typescript @types/node

# Compile TypeScript
npx tsc client.ts webhook-handler.ts message-router.ts openclaw-integration.ts --target ES2020 --module commonjs --outDir ./dist

# Verify output
ls -la dist/
```

---

## Step 2: Add Webhook Route to OpenClaw Gateway

Edit your OpenClaw gateway configuration to add the webhook endpoint:

**File:** `~/.openclaw/openclaw.json`

Add to the `hooks.internal.entries` section:

```json
{
  "hooks": {
    "internal": {
      "enabled": true,
      "entries": {
        "command-logger": { "enabled": true },
        "fiat500-tracker": {
          "enabled": true,
          "module": "[YOUR_OPENCLAW_WORKSPACE]/fiat500-tracker-integration/dist/openclaw-integration.js",
          "export": "createFiat500Integration",
          "routes": [
            {
              "method": "POST",
              "path": "/webhooks/fiat500",
              "handler": "handleWebhook"
            }
          ]
        }
      }
    }
  }
}
```

**Note:** Replace `[YOUR_OPENCLAW_WORKSPACE]` with your actual OpenClaw workspace path (e.g., `/home/[username]/.openclaw/workspace`)

Then restart OpenClaw:

```bash
openclaw gateway restart
```

---

## Step 3: Configure GCP App to Send Webhooks

In your **Fiat500 Tracker** environment variables (GCP Cloud Run):

```bash
OPENCLAW_WEBHOOK_URL=http://[TAILSCALE_PRIVATE_IP]:18789/webhooks/fiat500
OPENCLAW_WEBHOOK_SECRET=[YOUR_WEBHOOK_SECRET]
```

**Replace with actual values:**
- `[TAILSCALE_PRIVATE_IP]` — Output of `sudo tailscale status` (e.g., 100.96.X.X)
- `[YOUR_WEBHOOK_SECRET]` — Generated webhook secret (never hardcode, use GCP Secret Manager)

Redeploy the GCP app:
```bash
gcloud run deploy fiat500-tracker \
  --update-env-vars OPENCLAW_WEBHOOK_URL=http://[TAILSCALE_PRIVATE_IP]:18789/webhooks/fiat500 \
  --set-secrets OPENCLAW_WEBHOOK_SECRET=projects/[PROJECT_ID]/secrets/openclaw-webhook-secret/versions/latest
```

**Security best practice:** Store secrets in [Google Cloud Secret Manager](https://cloud.google.com/secret-manager), not as plaintext env vars.

---

## Step 4: Enable Tailscale on GCP Instance

If your Fiat500 app is on a separate GCP instance, install Tailscale there:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up  # Follow auth URL using same Tailscale account
```

Verify it joined the network:
```bash
sudo tailscale status
# You should see maina-ec2 in the list
```

---

## Step 5: Test Integration

### Test 1: Health Check

```bash
# From EC2, test Fiat500 API connectivity
# Load credentials from secure config file (NEVER hardcode!)
source ~/.private/fiat500-api-config.json
curl -H "Authorization: Bearer $apiKey" \
  $baseUrl/health
```

### Test 2: Get Shortlist

```bash
# Load credentials from secure config file
source ~/.private/fiat500-api-config.json
curl -H "Authorization: Bearer $apiKey" \
  $baseUrl/api/shortlist | jq .
```

### Test 3: Send WhatsApp Message

Send a message on WhatsApp:
```
/tracker shortlist
```

You should receive:
- ✅ Top 10 cars formatted nicely
- ✅ Prices, insurance, scores, distance
- ✅ Ranking numbers for further commands

### Test 4: Trigger Webhook Manually

From your Fiat500 app, post a test event:

```bash
# Load credentials from config (NEVER hardcode in scripts!)
source ~/.private/fiat500-api-config.json

curl -X POST http://[TAILSCALE_PRIVATE_IP]:18789/webhooks/fiat500 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $webhookSecret" \
  -d '{
    "event": "new_shortlist_entry",
    "timestamp": "2026-02-24T22:50:00Z",
    "data": {
      "listing": {
        "title": "2022 Fiat 500 1.2 Lounge",
        "price": 795000,
        "mileage": 45000,
        "year": 2022,
        "composite_score": 85,
        "insurance_estimate": 150000,
        "distance_miles": 3.2,
        "url": "https://example.com"
      }
    }
  }'
```

**Replace `[TAILSCALE_PRIVATE_IP]` with output of `sudo tailscale status`**

---

## Commands Reference

Send any of these via WhatsApp:

```
/tracker help                    — Show all commands
/tracker shortlist              — View top 10
/tracker car 3                  — Details for car #3
/tracker scrape                 — Trigger scraping
/tracker status                 — Check scrape progress
/tracker config                 — View search config
/tracker pause                  — Stop auto-scraping
/tracker resume                 — Resume auto-scraping
/tracker conversations          — List seller emails
/tracker email car 3 initial    — Draft email to seller
```

---

## Webhook Events

Your Fiat500 app will send these events to OpenClaw:

| Event | When | Example |
|-------|------|---------|
| `new_shortlist_entry` | Car enters top 10 | New Toyota Corolla found |
| `price_drop` | Tracked car got cheaper | Car #3: £8,000 → £7,500 |
| `listing_removed` | Car disappeared (sold) | Car #5 no longer available |
| `seller_reply` | Seller replied to email | "Yes, available! When can you view?" |
| `daily_digest` | 6pm summary | 5 new cars, 2 price drops, 1 removed |

Each webhook becomes a formatted WhatsApp message.

---

## Troubleshooting

### "Unauthorized: invalid webhook secret"

**Cause:** GCP app sending wrong secret  
**Fix:** Verify `OPENCLAW_WEBHOOK_SECRET` in Cloud Run env vars matches the value in `~/.private/fiat500-api-config.json` → `webhookSecret`

### "API unreachable"

**Cause:** Tailscale not connected on Fiat500 instance  
**Fix:** Run `sudo tailscale up` on GCP instance and authenticate

### "Command failed: Unknown action"

**Cause:** Typo in `/tracker` command  
**Fix:** Send `/tracker help` to see valid commands

### "Car not found in shortlist"

**Cause:** No scraping has run yet, or car is not in top 10  
**Fix:** Send `/tracker scrape` to trigger a fresh scan

---

## Monitoring

### Check OpenClaw Logs

```bash
# Real-time gateway logs (includes webhook processing)
tail -f ~/.openclaw/logs/gateway.log

# Check Fiat500-specific messages
grep fiat500 ~/.openclaw/logs/gateway.log
```

### Check Tailscale Connection

```bash
# Verify EC2 is still connected
sudo tailscale status

# Check latency to GCP app
ping -c 3 $(echo "Fiat500 IP here")
```

### Test API Directly

```bash
# Check latest shortlist from command line
source ~/.private/fiat500-api-config.json
curl -H "Authorization: Bearer $apiKey" $baseUrl/api/shortlist | jq .
```

---

## Security Notes

✅ **What's protected:**
- API key stored encrypted in `.private/` (user-readable only)
- All communication encrypted via Tailscale
- Bearer token validation on webhook
- Rate limiting (100 req/min) enforced by OpenClaw

⚠️ **What to monitor:**
- API key rotation — regenerate in Fiat500 if compromised
- Tailscale network ACLs — lock down which devices can connect
- CloudWatch logs — audit all outbound API calls

---

## Educational Value

This integration demonstrates:

1. **Service-to-service communication** securely (Tailscale)
2. **Webhook handling** (validation, parsing, formatting)
3. **Message routing** (parsing user commands, calling APIs, formatting responses)
4. **Zero-trust architecture** (no public IPs, all private network)
5. **Audit trails** (logging all requests for compliance)

**For teaching others:**
- This pattern works for any external GCP/AWS/Azure app
- Tailscale is simpler and more secure than VPN
- Bearer tokens are sufficient for service auth
- Message routers are reusable components

---

## Deployment Checklist

- [ ] TypeScript files compiled to ./dist/
- [ ] `openclaw.json` updated with fiat500-tracker hook
- [ ] OpenClaw gateway restarted
- [ ] GCP Cloud Run env vars updated
- [ ] Tailscale connected on both EC2 and GCP
- [ ] Webhook test succeeds (manual curl test)
- [ ] `/tracker help` returns command list
- [ ] `/tracker shortlist` returns cars or "no cars yet"
- [ ] Fiat500 app configured to send webhooks

---

**Ready to deploy!** Questions? Check the main README.md or test incrementally. 🧠
