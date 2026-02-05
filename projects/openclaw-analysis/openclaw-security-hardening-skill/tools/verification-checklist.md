# Post-Hardening Verification Checklist

Run after completing all 5 steps. Each check should pass ✅.

---

## Check 1: Port 18789 Not Publicly Accessible

**Command:**
```bash
ss -tuln | grep 18789
```

**Expected output:**
```
tcp  0  0 127.0.0.1:18789    0.0.0.0:*    LISTEN
tcp6 0  0 ::1:18789          :::*         LISTEN
```

**Result:** ✅ PASS / ❌ FAIL

---

## Check 2: Gateway Token Enabled

**Command:**
```bash
openclaw config | grep -A 2 "Gateway auth"
```

**Expected output:**
```
Gateway auth: Token
```

**Result:** ✅ PASS / ❌ FAIL

---

## Check 3: Gateway Healthy

**Command:**
```bash
openclaw health
```

**Expected output:**
```json
{
  "status": "ok",
  "gateway": "connected",
  ...
}
```

**Result:** ✅ PASS / ❌ FAIL

---

## Check 4: No Auth Errors in Logs

**Command:**
```bash
openclaw logs --tail 50 | grep -i "error\|unauthorized\|denied\|failed"
```

**Expected output:**
```
(no lines returned)
```

**Result:** ✅ PASS / ❌ FAIL

---

## Check 5: WhatsApp/Telegram Working

**Manual test:**
- Send a message to your OpenClaw instance via WhatsApp/Telegram
- Verify you receive a response

**Result:** ✅ PASS / ❌ FAIL

---

## Check 6: API Keys Rotated (Anthropic)

**Command:**
```bash
openclaw logs --tail 100 | grep -i "anthropic.*success"
```

**Expected:**
Lines showing successful Anthropic API authentication (no old key errors).

**Result:** ✅ PASS / ❌ FAIL

---

## Check 7: SSH Restricted (Optional)

**AWS Console:**
1. EC2 → Security Groups → your group
2. Inbound Rules
3. SSH rule source should be your IP (not 0.0.0.0/0)

**Result:** ✅ PASS / ❌ FAIL

---

## Overall Status

| Check | Pass | Fail |
|-------|------|------|
| 1. Port 18789 localhost | ☐ | ☐ |
| 2. Gateway token enabled | ☐ | ☐ |
| 3. Gateway healthy | ☐ | ☐ |
| 4. No auth errors | ☐ | ☐ |
| 5. Messaging works | ☐ | ☐ |
| 6. API keys rotated | ☐ | ☐ |
| 7. SSH restricted (opt) | ☐ | ☐ |

**Score:** ___ / 7 (6/7 = good, 7/7 = excellent)

---

## If Any Check Failed

**Troubleshooting:**

### Check 1 Failed (port not localhost)
```bash
# Close port at AWS Security Group immediately
# Then verify:
ss -tuln | grep 18789
# Restart gateway:
openclaw gateway restart
```

### Check 2 Failed (token not enabled)
```bash
# Run config wizard again:
openclaw config
# Select: Gateway auth → Token
# Restart:
openclaw gateway restart
```

### Check 3 Failed (gateway unhealthy)
```bash
# Check recent logs:
openclaw logs --tail 50

# If corrupted, reset:
openclaw reset
openclaw configure
```

### Check 4 Failed (auth errors in logs)
```bash
# Verify all keys in config:
openclaw config.get

# Rotate keys if needed:
# - Anthropic: https://console.anthropic.com/account/keys
# - Telegram: @BotFather /revoke then /newtoken
# - Slack: OAuth & Permissions → revoke and regenerate
```

### Check 5 Failed (messaging broken)
```bash
# This shouldn't happen after hardening
# Check if message plugin is enabled:
openclaw plugins

# Restart messaging services:
openclaw gateway restart
# Wait 10 seconds, then test again
```

### Check 6 Failed (API key not rotated)
```bash
# Verify new key is in config:
cat ~/.openclaw/openclaw.json | grep -A 5 "anthropic:default"

# If old key showing, update with new one
# Then restart:
openclaw gateway restart
```

### Check 7 Failed (SSH not restricted)
```bash
# Go to AWS Console and manually fix Security Group
# Or use AWS CLI:
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXXX \
  --protocol tcp --port 22 \
  --cidr YOUR_PUBLIC_IP/32
```

---

## Success!

If all checks pass (especially 1-5), your OpenClaw instance is **hardened and secure.** ✅

**Next steps:**
- Monitor weekly: `openclaw logs | grep "unauthorized"`
- Rotate keys quarterly
- Review AWS Security Group monthly
- Run `openclaw doctor` quarterly for health check

---

**Date completed:** ________________  
**Completed by:** ________________  
**Notes:** ________________________________________________________________________
