# Fiat 500 Tracker ↔ OpenClaw Integration

**Status:** Integration Ready  
**Created:** 2026-02-24  
**Mondweep's Fiat 500 Car Tracker** ← Tailscale Private Network → **OpenClaw (EC2)**

---

## Architecture

```
┌─────────────────────────────────┐
│  Fiat 500 Tracker (GCP Cloud Run)│
│  https://fiat500-tracker-XXXXX.  │
│         europe-west2.run.app     │
└──────────────┬──────────────────┘
               │ (1) Webhook events
               │ (POST /webhooks/fiat500)
               ↓
        [Tailscale VPN]
               │
               ↓
┌──────────────────────────────────┐
│  OpenClaw Gateway (EC2)          │
│  Maina (Tailscale private IP)    │
├──────────────────────────────────┤
│ • Webhook receiver (/webhooks)  │
│ • Message routing (/tracker)     │
│ • Outbound API client            │
└──────────────┬───────────────────┘
               │ (2) Command responses
               ↓
         WhatsApp (you)
```

## Integration Points

### 1. Webhook Receiver
- **Endpoint:** `/api/webhooks/fiat500` (registered with OpenClaw gateway)
- **Auth:** Bearer token (OPENCLAW_WEBHOOK_SECRET)
- **Events:** new_shortlist_entry, price_drop, listing_removed, seller_reply, daily_digest
- **Behavior:** Parse event, format for WhatsApp, push to user

### 2. Outbound API Client
- **Auth:** Bearer token (Fiat500 API Key, stored in `.private/fiat500-api-config.json`)
- **Base URL:** `https://fiat500-tracker-XXXXX.europe-west2.run.app` (GCP Cloud Run endpoint, masked for security)
- **Retry:** Exponential backoff on 5xx/timeout
- **Timeout:** 30s per request

### 3. Message Routing
- **Command prefix:** `/tracker`
- **Syntax:** `/tracker <action> [args]`
- **Examples:**
  - `/tracker shortlist` → Show top 10
  - `/tracker car 3` → Details + price history + insurance for car #3
  - `/tracker scrape` → Trigger new scan (runs async)
  - `/tracker config` → View search config
  - `/tracker pause` → Stop auto-scraping
  - `/tracker resume` → Resume auto-scraping

### 4. Webhook Events → WhatsApp Messages
- `new_shortlist_entry` → "🚗 New car: [title] £[price] ([score]%)"
- `price_drop` → "💰 Price drop: Car #[n] £[old] → £[new]"
- `listing_removed` → "⚠️ Car #[n] no longer available (possibly sold)"
- `seller_reply` → "📧 Seller replied to [car]: [preview of message]"
- `daily_digest` → "📊 Daily digest: [stats]"

---

## Security Model

**Defense-in-Depth:**
1. **Network:** Tailscale private VPN (zero-trust, no public exposure)
2. **Transport:** TLS 1.3 (Tailscale enforces)
3. **Auth:** Bearer token (HMAC-compatible, rotatable)
4. **Storage:** API key encrypted at rest in ~/.private/fiat500-api-config.json
5. **Rate Limiting:** 100 req/min per client (standard OpenClaw limit)
6. **Logging:** All API calls logged (audit trail)

**Educational Value:**
- This pattern is **reusable** for other GCP/external app integrations
- Demonstrates secure service-to-service communication
- Shows webhook handling + message routing best practices
- Tailscale provides zero-trust networking without VPN complexity

---

## Files

- `client.ts` — Fiat500 API client (outbound calls)
- `webhook-handler.ts` — Webhook receiver + event parser
- `message-router.ts` — /tracker command parsing + response formatting
- `integration-skill.md` — Full setup guide (for others to replicate)

---

## Next Steps

1. ✅ API config stored securely
2. ⏳ Create webhook receiver (routes.ts update)
3. ⏳ Create outbound API client
4. ⏳ Create message routing logic
5. ⏳ Test end-to-end (webhook → WhatsApp, command → API)
6. ⏳ Document as reusable pattern

Ready? 🧠
