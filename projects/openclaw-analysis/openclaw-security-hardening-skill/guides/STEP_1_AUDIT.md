# Step 1: Audit Your Exposure

**Objective:** Determine if your OpenClaw instance is publicly discoverable.  
**Time:** 5 minutes  
**Risk:** Read-only, no changes made

---

## Check 1: Shodan Indexing

### From Your Local Machine

```bash
# Get your EC2 public IP:
curl ifconfig.me
```

This returns your public IP visible to the internet (e.g., `95.166.3.217`).

### Query Shodan

```bash
# Replace ACTUAL_IP with your IP from above:
curl -s "https://www.shodan.io/host/ACTUAL_IP"
```

### Interpret Results

**Scenario A: "404: Not Found"**
```html
<h3 class="heading-highlight"><span>404: Not Found</span></h3>
<p>No information available for YOUR_IP</p>
```
✅ **Good:** Your instance is NOT indexed on Shodan. Proceed to Step 2 (still recommended).

**Scenario B: Service List**
```json
{
  "services": [
    {"port": 18789, "product": "OpenClaw Control UI"},
    {"port": 3000, "product": "RuvBot"},
    ...
  ]
}
```
🔴 **Bad:** Your instance IS indexed. Proceed immediately to Step 2 (critical).

---

## Check 2: Port 18789 Binding

### SSH into Your EC2

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

### Check Socket Binding

```bash
# See what ports are listening:
ss -tuln | grep LISTEN
```

Look for line with 18789:

**Good binding:**
```
tcp  0  0 127.0.0.1:18789    0.0.0.0:*    LISTEN
tcp6 0  0 ::1:18789          :::*         LISTEN
```
✅ Bound to localhost only (127.0.0.1 and ::1). Safe.

**Bad binding:**
```
tcp  0  0 0.0.0.0:18789      0.0.0.0:*    LISTEN
```
🔴 Bound to all interfaces. Publicly accessible. Requires hardening.

---

## Check 3: AWS Security Group

### Via AWS Console

1. **AWS Console** → EC2 → Instances
2. Select your instance
3. **Security** tab
4. Under "Security groups", click group name
5. **Inbound rules** section

### Look for Port 18789

**Good rule:**
- Port 18789 is **NOT listed** → Safe

**Bad rule:**
- Port: 18789
- Source: 0.0.0.0/0 or ::/0
- 🔴 Publicly accessible

### Via AWS CLI

```bash
# From your EC2:
aws ec2 describe-security-groups \
  --group-ids sg-XXXXXXXXX \
  --query 'SecurityGroups[0].IpPermissions' \
  | grep -i 18789
```

---

## Summary: Your Exposure Status

After these three checks, you should know:

| Check | Result | Next Action |
|-------|--------|-------------|
| Shodan | Not indexed | ✅ Good; still harden |
| Shodan | Indexed | 🔴 Critical; proceed immediately |
| Port binding | localhost only | ✅ Good |
| Port binding | 0.0.0.0:18789 | 🔴 Critical; close immediately |
| Security Group | Port 18789 NOT listed | ✅ Good |
| Security Group | Port 18789 listed (0.0.0.0/0) | 🔴 Critical; remove rule |

---

## If You're Exposed

**Priority order:**
1. **First (5 min):** Step 2 — Close port 18789 at AWS Security Group
2. **Then (3 min):** Step 3 — Enable gateway token
3. **Then (5 min):** Step 4 — Rotate all API keys
4. **Finally (2 min):** Step 5 — Harden SSH (optional)

Do not wait. Exposed instances are actively scanned by bots.

---

## If You're Safe

Continue through Steps 2-5 anyway for **defense in depth.** This ensures:
- ✅ Port closed at network level
- ✅ Auth enabled at application level
- ✅ Credentials rotated
- ✅ Multi-layer protection

---

**Next:** [Step 2: Port Closure](STEP_2_PORT_CLOSURE.md)
