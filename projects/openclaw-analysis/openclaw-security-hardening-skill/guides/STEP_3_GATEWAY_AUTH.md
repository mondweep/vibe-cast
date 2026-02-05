# Step 3: Enable Gateway Authentication

**Objective:** Protect the OpenClaw Control UI with token-based authentication.  
**Time:** 3 minutes  
**Risk:** Zero impact on messaging; easily reversible

---

## Why This Matters

The gateway token secures the **Control UI** (web interface on port 18789) which provides access to:
- Configuration files (with API keys)
- Conversation history (months of chat data)
- WebSocket connections
- Credential management

Even with port 18789 closed at the network level, this adds **application-layer protection** (defense-in-depth).

---

## Understanding Token vs Password

| Mode | What | Strength | Reversibility |
|------|------|----------|---|
| **Token** | Cryptographically random (auto-generated) | 🔴 Strongest | ✅ Can regenerate |
| **Password** | User-chosen string | 🟡 User-dependent | ✅ Can change |
| **None** | No auth | 🔴 Weakest | ✅ Can add later |

**Recommendation:** Use **Token** mode (what we'll do here).

---

## Enable Gateway Token

### Method 1: Interactive Config Wizard (Recommended)

```bash
# SSH into your EC2:
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Launch config wizard:
openclaw config
```

You'll see prompts. Navigate to these sections:

**Prompt 1: Gateway bind mode**
```
◆  Gateway bind mode
│  ● Loopback (Local only)
│  ○ Tailnet (Tailscale IP)
│  ○ Auto (Loopback → LAN)
│  ○ LAN (All interfaces)
│  ○ Custom IP
```

Keep selected: **Loopback (Local only)** ✅

Press Enter to continue.

**Prompt 2: Gateway auth**
```
◆  Gateway auth
│  ● Token (Recommended default)
│  ○ Password
```

Keep selected: **Token** ✅

Press Enter to continue.

**Prompt 3: Regenerate token?**
```
◇  Regenerate gateway token?
   Yes / No
```

Select: **Yes** (rotates from any old default token)

Press Enter.

**Prompt 4: Tailscale exposure**
```
◆  Tailscale exposure
│  ● Off (No Tailscale exposure)
│  ○ Serve
│  ○ Funnel
```

Keep selected: **Off** ✅

Press Enter.

### Wizard Completion

You should see:
```
✅ Configuration complete.

Control UI ────────────────────────────────
  Web UI: http://127.0.0.1:18789/
  Gateway WS: ws://127.0.0.1:18789
  Gateway: reachable
  Docs: https://docs.openclaw.ai/web/control-ui
```

---

## Restart Gateway

```bash
openclaw gateway restart
```

Expected output:
```
✅ Gateway restarted successfully
```

---

## Verification

### Check Token is Enabled

```bash
openclaw config | grep -A 2 "Gateway auth"
```

Should show:
```
Gateway auth: Token
```

### Verify Gateway is Healthy

```bash
openclaw health
```

Should show:
```json
{
  "status": "ok",
  "gateway": "connected",
  ...
}
```

### Check Logs for Issues

```bash
openclaw logs --tail 20 | grep -i "error\|failed"
```

Should return nothing (no errors).

---

## Test the Control UI (Local Only)

### From Your EC2

```bash
# Try to access locally:
curl -i http://127.0.0.1:18789/

# Expected: 200 OK or redirect to login
```

### From the Internet (Should Fail)

```bash
# From your local machine:
curl -i http://YOUR_EC2_PUBLIC_IP:18789/

# Expected: Connection timed out or refused
# (because port 18789 is closed at Security Group)
```

---

## Impact on Your Messaging

✅ **Zero impact.**

Your WhatsApp, Telegram, Discord messages flow through separate plugins and channels. The gateway token only protects the Control UI.

**Test it:**
Send a message to your OpenClaw instance via WhatsApp/Telegram. You should receive a response as normal.

---

## If You Need to Change the Token Later

```bash
# Regenerate a new token:
openclaw config

# At the "Regenerate token?" prompt, select Yes

# Restart:
openclaw gateway restart

# The new token is stored in ~/.openclaw/openclaw.json
```

---

## Troubleshooting

### "Gateway won't restart"

```bash
# Check for port conflicts:
ss -tuln | grep 18789

# Check recent logs:
openclaw logs --tail 50

# Try hard restart:
openclaw gateway stop
sleep 5
openclaw gateway start
```

### "Control UI won't load locally"

```bash
# Make sure you're using localhost:
curl http://127.0.0.1:18789/

# Not your EC2 IP (that's closed at SG):
curl http://INTERNAL_EC2_IP:18789/  # May not work
curl http://PUBLIC_EC2_IP:18789/    # Will NOT work (port closed)
```

### "Configuration wizard is stuck"

```bash
# Exit wizard with Ctrl+C

# Reset to defaults:
openclaw reset

# Try again:
openclaw configure
```

---

## What's Next?

✅ Gateway is now token-protected.

**Next:** [Step 4: API Key Rotation](STEP_4_API_KEY_ROTATION.md)

This ensures any keys that may have been exposed are invalidated.

---

**Time saved:** 2 of 3 minutes allocated for this step  
**Reversibility:** ✅ Can disable by selecting "None" in config
