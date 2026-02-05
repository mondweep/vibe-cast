# Step 4: Rotate All API Keys

**Objective:** Invalidate any API keys that may have been compromised.  
**Time:** 5 minutes (1-2 minutes per key)  
**Risk:** Temporary service interruption during key update; easily reversible

---

## Why This Matters

If your instance was exposed on Shodan, attackers could have extracted:
- Anthropic API keys (call Claude without paying)
- Telegram bot tokens (send messages as your bot)
- Slack tokens (read/write workspace data)
- Discord tokens (access/modify your servers)

**Rotating keys invalidates old compromised credentials immediately.**

---

## Key Rotation Checklist

| Service | Exposed? | Location | Priority |
|---------|----------|----------|----------|
| Anthropic | 🔴 Yes | ~/.openclaw/openclaw.json | 🔴 CRITICAL |
| Telegram | 🔴 Possible | ~/.openclaw/openclaw.json | 🟡 HIGH |
| Slack | 🔴 Possible | ~/.openclaw/openclaw.json | 🟡 HIGH |
| Discord | 🔴 Possible | ~/.openclaw/openclaw.json | 🟡 HIGH |

---

## 4a. Anthropic API Key (CRITICAL)

### Step 1: Generate New Key

1. Go to **https://console.anthropic.com/account/keys**
2. Sign in with your Anthropic account
3. Click **Create new key**
4. Copy the new key (starts with `sk-ant-...`)

### Step 2: Update Local Config

```bash
# SSH into your EC2:
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Edit config:
nano ~/.openclaw/openclaw.json
```

Find this section:
```json
"auth": {
  "profiles": {
    "anthropic:default": {
      "apiKey": "sk-ant-XXXXX..."
    }
  }
}
```

Replace `sk-ant-XXXXX...` with your **new key**.

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Step 3: Restart Gateway

```bash
openclaw gateway restart
```

### Step 4: Verify

```bash
# Check logs for success:
openclaw logs --tail 20 | grep -i "anthropic"

# Should see successful auth, not errors
```

### Step 5: Delete Old Key (Optional but Recommended)

Go back to https://console.anthropic.com/account/keys
- Find your old key
- Click the trash icon
- Confirm deletion

**This prevents anyone from using the old key.**

---

## 4b. Telegram Bot Token

### Step 1: Revoke Old Token

1. Open Telegram
2. Search for `@BotFather`
3. Send message: `/revoke`
4. Select your bot
5. Confirm revocation

### Step 2: Generate New Token

1. Send to BotFather: `/newtoken`
2. Select your bot
3. Copy the new token

### Step 3: Update Config

```bash
nano ~/.openclaw/openclaw.json

# Find:
"telegram": {
  "botToken": "XXXXX:YYYYY..."
}

# Replace with new token
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

### Step 4: Restart

```bash
openclaw gateway restart
```

---

## 4c. Slack Token (if configured)

### Step 1: Revoke Old Token

1. Go to **https://api.slack.com/apps** (sign in)
2. Select your app
3. **OAuth & Permissions**
4. Under **OAuth Tokens**, find your bot token
5. Click **Revoke**

### Step 2: Generate New Token

1. In OAuth & Permissions, click **Reinstall to Workspace**
2. Grant permissions
3. Copy new bot token (starts with `xoxb-...`)

### Step 3: Update Config

```bash
nano ~/.openclaw/openclaw.json

# Find and replace Slack token
```

Save and restart:
```bash
openclaw gateway restart
```

---

## 4d. Discord Token (if configured)

### Step 1: Reset Token

1. Go to **https://discord.com/developers/applications** (sign in)
2. Select your bot application
3. **Bot** tab
4. Under TOKEN, click **Reset Token**
5. Confirm (this revokes the old one)
6. Copy new token

### Step 2: Update Config

```bash
nano ~/.openclaw/openclaw.json

# Find and replace Discord token
```

Save and restart:
```bash
openclaw gateway restart
```

---

## Verification Checklist

After updating each key:

```bash
# 1. Check config is valid:
openclaw config.get | grep -i "error"
# Should return nothing

# 2. Check gateway is healthy:
openclaw health
# Should show: "status": "ok"

# 3. Check logs for auth failures:
openclaw logs --tail 50 | grep -i "failed\|unauthorized\|denied"
# Should return nothing

# 4. Test messaging:
# Send a message via WhatsApp/Telegram/Discord
# You should receive a response within 5 seconds
```

---

## Rollback (If Something Breaks)

### If You Made a Mistake

```bash
# Restore from backup:
cp ~/.openclaw/openclaw.json.backup ~/.openclaw/openclaw.json

# (assuming you backed up before editing)

# Or manually revert the key you just changed
nano ~/.openclaw/openclaw.json
# Change the key back to the old one

# Restart:
openclaw gateway restart
```

### If You Can't Remember the Old Key

Don't worry — it's invalid anyway (you revoked it). Just:
1. Generate a new key again (using the same process)
2. Update config
3. Restart

---

## Summary

| Service | Old Key | New Key | Verified |
|---------|---------|---------|----------|
| Anthropic | Revoked ✅ | Active ✅ | ☐ |
| Telegram | Revoked ✅ | Active ✅ | ☐ |
| Slack | Revoked ✅ | Active ✅ | ☐ |
| Discord | Revoked ✅ | Active ✅ | ☐ |

---

## What's Next?

✅ All API keys have been rotated and old ones invalidated.

**Next:** [Step 5: Harden SSH (Optional)](STEP_5_SSH_HARDENING.md)

Or skip SSH hardening if you're comfortable with key-based authentication.

---

**Time saved:** 4 of 5 minutes allocated for this step  
**Reversibility:** ✅ Can revert to old keys (if not deleted), but this defeats the purpose
