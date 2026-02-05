# OpenClaw Security Hardening Skill

**Framework:** 5-step security hardening process for self-hosted OpenClaw instances  
**Duration:** 10-15 minutes  
**Risk Level:** Straightforward, low-risk operational tasks  
**Prerequisites:** SSH access to EC2 instance, AWS Console access, terminal familiarity

---

## Skill Overview

This skill guides you through securing an exposed or at-risk OpenClaw instance following the January 2026 Shodan vulnerability disclosure (900+ exposed instances with unauthenticated access).

**What you'll accomplish:**
- ✅ Verify if your instance is publicly exposed
- ✅ Close port 18789 to the internet
- ✅ Enable gateway authentication (token-based)
- ✅ Rotate all API keys
- ✅ Harden SSH access (optional)

**Outcome:** Fully hardened, production-ready OpenClaw instance with zero compromise to functionality.

---

## Prerequisite Knowledge

- Comfort with SSH and terminal commands
- Basic familiarity with AWS Console (EC2, Security Groups)
- Understanding of API keys and secrets management

---

## 5-Step Process

### Step 1: Audit Your Exposure (5 min)

**Objective:** Determine if your instance is publicly discoverable.

**From your local machine:**

```bash
# Get your EC2 public IP:
curl ifconfig.me
# Note: This is YOUR_PUBLIC_IP

# Check Shodan for exposure:
curl -s "https://www.shodan.io/host/YOUR_PUBLIC_IP"
```

**Expected results:**
- ✅ HTML page with "404: Not Found" → You're NOT indexed (safe)
- 🔴 Detailed service listing → You ARE indexed (proceed to hardening)

**From your EC2 instance (via SSH):**

```bash
# Check if port 18789 is bound to all interfaces:
ss -tuln | grep 18789
```

**Interpretation:**
```
tcp  0  0 127.0.0.1:18789      0.0.0.0:*      LISTEN    ← GOOD
tcp  0  0 0.0.0.0:18789        0.0.0.0:*      LISTEN    ← BAD
```

**Next:** If port is open to all interfaces OR you're indexed on Shodan, proceed to Step 2.

---

### Step 2: Close Port 18789 (AWS Security Group) (3 min)

**Objective:** Prevent public internet access to the gateway.

**Via AWS Console:**

1. Navigate to **EC2 → Instances**
2. Select your instance
3. Click **Security** tab
4. Under **Security groups**, click the group name
5. **Edit inbound rules**
6. Find any rule with:
   - Port: 18789
   - Source: 0.0.0.0/0 or ::/0
7. **Delete that rule** or change source to your personal IP (e.g., `123.45.67.89/32`)
8. Click **Save rules**

**Verification:**
```bash
# From EC2, should show localhost only:
ss -tuln | grep 18789
```

Expected:
```
tcp  0  0 127.0.0.1:18789      0.0.0.0:*      LISTEN    ✅
```

---

### Step 3: Enable Gateway Token Authentication (3 min)

**Objective:** Protect Control UI with strong authentication.

**From your EC2 (via SSH):**

```bash
# Launch interactive config wizard:
openclaw config

# Navigate these prompts:
# 1. "Gateway bind mode" → Select: Loopback (Local only)
# 2. "Gateway auth" → Select: Token
# 3. "Tailscale exposure" → Select: Off
# 4. Let wizard generate NEW token (rotates from default)

# Wizard will show:
# ✅ "Gateway: reachable"
# ✅ "Web UI: http://127.0.0.1:18789/"
```

**Restart gateway:**
```bash
openclaw gateway restart
```

**Verification:**
```bash
# Should see clean startup:
openclaw logs --tail 10 | grep -i "connected\|gateway\|ready"
```

---

### Step 4: Rotate All API Keys (5 min)

**Objective:** Invalidate any keys that may have been exposed.

#### 4a. Anthropic API Key

1. Open https://console.anthropic.com/account/keys
2. **Delete** the old key
3. **Create new key**
4. Copy it

```bash
# SSH into EC2:
nano ~/.openclaw/openclaw.json

# Find the section:
# "auth": {
#   "profiles": {
#     "anthropic:default": {
#       "apiKey": "sk-..."

# Replace the apiKey value with your new key
# Save (Ctrl+O, Enter, Ctrl+X)

# Restart:
openclaw gateway restart
```

#### 4b. Telegram Token (if configured)

1. Message `@BotFather` on Telegram
2. Type `/revoke` → select your bot
3. Type `/newtoken` → copy token
4. Update `~/.openclaw/openclaw.json` → restart

#### 4c. Slack Token (if configured)

1. Go to Slack App Console → your app → OAuth & Permissions
2. Revoke token(s)
3. Generate new token
4. Update config → restart

#### 4d. Discord Token (if configured)

1. Discord Developer Portal → your bot
2. Click "Reset Token"
3. Copy new token
4. Update config → restart

**Verification:**
```bash
# After each restart, check logs for auth errors:
openclaw logs --tail 20 | grep -i "error\|auth\|failed"

# Should see no authentication failures
```

---

### Step 5: Harden SSH (Optional, 2 min)

**Objective:** Limit SSH access to your IP only (defense in depth).

**Get your public IP:**
```bash
# From your local machine:
curl ifconfig.me
# Note: This is YOUR_LOCAL_PUBLIC_IP
```

**Update AWS Security Group:**

1. AWS Console → EC2 → Security Groups
2. Edit Inbound Rules
3. Find SSH rule (port 22) with source `0.0.0.0/0`
4. Change source to: `YOUR_LOCAL_PUBLIC_IP/32`
5. Save

**Why:** Eliminates bot scanning and brute force noise.

**⚠️ Risk:** If your ISP assigns dynamic IPs, you may lock yourself out. In that case:
- Keep it at 0.0.0.0/0 (your key auth is strong anyway), OR
- Use AWS Systems Manager Session Manager (no SSH needed)

---

## Post-Hardening Verification

**Run this checklist:**

```bash
✅ Port 18789 not accessible from internet
   ssh ec2-user@YOUR_IP
   ss -tuln | grep 18789
   # Should show: 127.0.0.1:18789 (not 0.0.0.0)

✅ Gateway token enabled
   openclaw config | grep "Gateway auth"
   # Should show: Token mode enabled

✅ All API keys rotated
   openclaw logs | grep -i "auth.*success"
   # Should see no old key errors

✅ SSH restricted (optional)
   # AWS Console → Security Group → Inbound Rules
   # SSH source should be your IP (not 0.0.0.0/0)

✅ Gateway healthy
   openclaw health
   # Should show: "status": "ok"
```

---

## Rollback / Emergency Recovery

### If gateway won't start after changes:

```bash
# Check config syntax:
openclaw config.get

# If corrupted, backup and reset:
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup
openclaw reset
openclaw configure

# Restore from backup if needed:
cp ~/.openclaw/openclaw.json.backup ~/.openclaw/openclaw.json
openclaw gateway restart
```

### If WhatsApp stops working:

✅ **This shouldn't happen.** Gateway token only protects Control UI, not messaging.

If it does:
```bash
# Verify token didn't corrupt auth:
openclaw logs --tail 50 | grep -i "whatsapp\|websocket"

# Restart fresh:
openclaw gateway restart
```

---

## Monitoring & Maintenance

### Weekly
```bash
# Check for access anomalies:
openclaw logs --grep "unauthorized\|denied" --tail 100

# Verify port still local-only:
ss -tuln | grep 18789
```

### Monthly
- Review AWS Security Group rules (no unintended changes)
- Scan Shodan to confirm not re-indexed

### Quarterly
- Rotate API keys (best practice, every 90 days)
- Run `openclaw doctor` for health check

---

## Troubleshooting Guide

| Problem | Cause | Solution |
|---------|-------|----------|
| Port 18789 still shows in netstat after closing SG | Expected behavior | Security Group blocks internet traffic; local binding remains OK |
| WhatsApp stops after token change | Unlikely; gateway token ≠ messaging auth | Restart gateway; check logs for auth errors |
| Config wizard won't save | Permission issue or corrupted JSON | Run `sudo openclaw configure`; or reset |
| Old API key still accepted | Restart didn't pick up new key | Verify key in `openclaw.json`; restart again |
| Can't SSH after restricting to your IP | IP changed or rule misconfigured | Use AWS Session Manager to fix; or ask colleague to revert rule |

---

## FAQ

**Q: Does the gateway token affect WhatsApp/Telegram/Discord messaging?**  
A: No. Token only secures the Control UI. Messaging channels are unaffected.

**Q: What if I'm behind a Tailscale network?**  
A: Keep Loopback selected. Tailscale isn't needed for local-only access. If you want remote access, use SSH port-forwarding instead.

**Q: How often should I rotate API keys?**  
A: Every 90 days as best practice. Immediately if exposed.

**Q: Can I run this on a different machine (not EC2)?**  
A: Yes, process is identical. Just replace AWS Security Group with your firewall/network rules.

---

## Reference: What the Vulnerability Was

**Shodan Discovery Method:**
```
Attackers query: http.title:"Clawdbot Control" port:18789
Result: 900+ exposed instances
Access: Unauthenticated, full control
Data exposed: API keys, chat histories, file attachments
```

**Our hardening prevents:**
1. Port 18789 not discoverable (closed at SG level)
2. Even if discovered, token auth blocks access
3. Keys rotated, so old exposure is worthless

---

## Need Help?

- **Community Discord:** https://discord.com/invite/clawd
- **GitHub Issues:** https://github.com/openclaw/openclaw/issues
- **Docs:** https://docs.openclaw.ai

---

**Skill Version:** 1.0  
**Last Updated:** February 5, 2026  
**Estimated Time:** 10-15 minutes  
**Difficulty:** Intermediate
