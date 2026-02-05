# OpenClaw Security Hardening Report

**Date:** February 5, 2026  
**Status:** Comprehensive hardening guide for self-hosted OpenClaw instances  
**Applicable Versions:** OpenClaw 2026.1.14+

---

## Executive Summary

Recent security research (January 2026) identified **900+ exposed OpenClaw instances** on Shodan with unauthenticated access to:
- API keys (Anthropic, Telegram, Slack tokens)
- Full chat histories with attachments
- Configuration files with credentials
- Command execution capabilities

**Root cause:** Localhost auto-approval in auth logic exploitable behind reverse proxies when `trustedProxies` is misconfigured.

**Good news:** Most instances can be secured in **5 minutes** by following this guide.

---

## Vulnerability Assessment: The Threat

### Attack Vector
1. Attacker discovers exposed OpenClaw instance on Shodan (fingerprint: Control UI title "Clawdbot Control")
2. Port 18789 is publicly accessible (default)
3. `gateway.auth` is misconfigured or unauthenticated
4. Attacker gains full access to:
   - Configuration (API keys, OAuth secrets)
   - Conversation history (private messages, files)
   - Command execution (root shell if running as root container)
   - Channel integration URIs (Signal, WhatsApp pairing info)

### Impact Classification
| Asset | Exposure | Risk |
|-------|----------|------|
| API Keys | Credential theft | 🔴 Critical |
| Chat History | Data exfiltration | 🔴 Critical |
| Root Access | RCE / Host compromise | 🔴 Critical |
| Channel Tokens | Account takeover | 🔴 Critical |

---

## Pre-Hardening Audit

### Step 1: Check Public Exposure

**Is your instance discoverable on Shodan?**

```bash
# From your local machine (not EC2):
curl -s "https://www.shodan.io/host/YOUR_EC2_PUBLIC_IP"
```

If you see an HTML page with **"404: Not Found"**, you're not indexed (good). Otherwise, proceed immediately to hardening.

**Find your EC2 public IP:**
```bash
# On your local machine:
curl ifconfig.me
```

### Step 2: Verify Port Exposure

**Is port 18789 open to the internet?**

```bash
# From your EC2 instance (via SSH):
netstat -tuln | grep 18789
# or:
ss -tuln | grep 18789
```

Look for output like:
```
tcp  0  0 127.0.0.1:18789      0.0.0.0:*      LISTEN    ← GOOD (localhost only)
tcp  0  0 0.0.0.0:18789        0.0.0.0:*      LISTEN    ← BAD (open to internet)
```

**Check AWS Security Group:**
1. AWS Console → EC2 → Instances → your instance
2. Security tab → Security Groups
3. Inbound Rules: Is port 18789 listed with source `0.0.0.0/0` or `::/0`?
   - ✅ NOT listed → Safe
   - 🔴 Listed with `0.0.0.0/0` → Requires immediate closure

---

## Hardening Steps (Critical: Do All 5)

### Step 1: Close Port 18789 to Internet (AWS Security Group)

**Even if you use a reverse proxy or Tailscale, this is foundational.**

1. AWS Console → EC2 → Security Groups
2. Select your instance's security group
3. Edit Inbound Rules
4. Find any rule allowing port 18789
5. **Delete it** or restrict source to your IP only
6. Save

**Result:** Port 18789 is no longer publicly discoverable.

---

### Step 2: Enable Gateway Authentication (Token Mode)

**Protects Control UI from unauthenticated access.**

```bash
# SSH into your EC2:
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Run the interactive config wizard:
openclaw config

# Navigate to:
# - Gateway bind mode → Keep "Loopback"
# - Gateway auth → Select "Token" (recommended)
# - Tailscale exposure → Keep "Off"
# - Let wizard generate new token (rotate from default)

# Once complete:
openclaw gateway restart
```

**What this does:**
- ✅ Generates cryptographically strong random token
- ✅ Stores in `~/.openclaw/openclaw.json` (encrypted at rest)
- ✅ Requires token for Control UI access
- ✅ Zero impact on WhatsApp/Telegram/Discord messaging

**Verification:**
```bash
# The gateway should restart cleanly:
# "Gateway: reachable" in the summary
```

---

### Step 3: Rotate All API Keys (Critical)

**If your instance was ever exposed, assume keys are compromised.**

#### 3a. Anthropic API Key
1. Go to **https://console.anthropic.com/account/keys**
2. Delete old key
3. Generate new key
4. Update locally:
   ```bash
   # On your EC2:
   nano ~/.openclaw/openclaw.json
   # Find: "anthropic:default" → "apiKey"
   # Replace with new key
   openclaw gateway restart
   ```

#### 3b. Telegram Token (if configured)
1. Message @BotFather on Telegram
2. `/revoke` → select your bot
3. `/newtoken` → copy new token
4. Update in `openclaw.json` → restart gateway

#### 3c. Slack Token (if configured)
1. Slack App console → OAuth & Permissions
2. Revoke all tokens
3. Regenerate
4. Update config → restart

#### 3d. Discord Token (if configured)
1. Discord Developer Portal → your bot
2. Reset token
3. Copy new token
4. Update config → restart

**Verification:**
```bash
# Restart gateway:
openclaw gateway restart

# Verify no auth errors in logs:
openclaw logs --tail 50
```

---

### Step 4: Harden SSH Access (Defense in Depth)

**Restrict SSH to your IP only (optional but recommended).**

1. Get your public IP:
   ```bash
   curl ifconfig.me
   ```
   
2. AWS Security Group → Edit Inbound Rules
3. Find SSH (port 22) rule with source `0.0.0.0/0`
4. Change source to: `YOUR_PUBLIC_IP/32`
5. Save

**Why:** Eliminates port scanning noise and brute force attempts.

**Note:** If your ISP assigns dynamic IPs, you may need to update this periodically. Alternatively, use AWS Systems Manager Session Manager (no inbound SSH needed).

---

### Step 5: If Using Reverse Proxy (nginx/Caddy) - Set trustedProxies

**Only needed if port 18789 is behind a reverse proxy. If you're using Loopback only, skip this.**

If you ARE using a reverse proxy:

```bash
# Edit config:
nano ~/.openclaw/openclaw.json

# Find "gateway" section, add:
"gateway": {
  "trustedProxies": ["127.0.0.1"],
  ...
}

# Restart:
openclaw gateway restart
```

This prevents auth bypass attacks via X-Forwarded-For header spoofing.

---

## Post-Hardening Verification Checklist

✅ **Port 18789 closed to internet** (AWS Security Group or firewall)  
✅ **Gateway token enabled** (new, rotated)  
✅ **All API keys rotated** (Anthropic, Telegram, Slack, Discord)  
✅ **SSH restricted to your IP** (optional but recommended)  
✅ **trustedProxies configured** (if behind reverse proxy)  

Run this quick check:

```bash
# Should show Loopback + token auth enabled:
openclaw config

# Should show no 0.0.0.0 binding on 18789:
ss -tuln | grep 18789

# Should show recent restart in logs:
openclaw logs --tail 20
```

---

## Monitoring & Ongoing Security

### Weekly Checks
```bash
# Monitor for unauthorized access attempts:
openclaw logs --grep "error\|unauthorized\|denied" --tail 100

# Verify port 18789 still local-only:
ss -tuln | grep 18789
```

### Monthly Actions
- Audit AWS Security Groups for unintended rules
- Review conversation history for unexpected access
- Rotate API keys every 90 days (best practice)

### Annual Actions
- Update to latest OpenClaw version (security patches)
- Run full `openclaw doctor` health check
- Review Shodan to confirm instance not indexed

---

## Troubleshooting

### Gateway Won't Start After Token Change
```bash
# Verify config syntax:
openclaw config.get

# If corrupted, restore:
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup
openclaw reset
openclaw config
```

### WhatsApp Still Works After Gateway Password?
✅ **Expected.** Gateway token only protects the Control UI, not messaging channels.

### Port 18789 Still Shows in netstat After Security Group Change?
✅ **Expected.** Security Group blocks internet traffic, but local binding remains. This is correct.

### Old API Keys Still Valid After Rotation?
❌ **Problem.** Immediately verify new key is in use:
```bash
openclaw config.get | grep "apiKey"
```

Restart if using old key:
```bash
openclaw gateway restart
```

---

## Reference: Shodan Fingerprint Detection

Attackers use this to find exposed instances:

```
http.title:"Clawdbot Control"
port:18789
```

**Our hardening prevents:**
- Port 18789 not publicly accessible → Shodan doesn't index
- Gateway token enabled → Control UI is authenticated
- Credentials rotated → Even if old instance was exposed, keys are invalidated

---

## Additional Resources

- **Docs:** https://docs.openclaw.ai
- **GitHub:** https://github.com/openclaw/openclaw
- **Shodan Research:** https://cybersecuritynews.com/clawdbot-chats-exposed/
- **AWS Security Groups:** https://docs.aws.amazon.com/vpc/latest/userguide/VPC_SecurityGroups.html

---

## Questions or Issues?

Join the OpenClaw community:
- **Discord:** https://discord.com/invite/clawd
- **GitHub Issues:** https://github.com/openclaw/openclaw/issues

---

**Report Status:** ✅ Complete  
**Confidentiality:** All PII and secrets masked; safe to share publicly
