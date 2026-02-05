# Step 5: Harden SSH (Optional)

**Objective:** Restrict SSH access to your IP only (defense in depth).  
**Time:** 2 minutes  
**Risk:** Low; easily reversible (but be careful not to lock yourself out)

---

## Is This Step Necessary?

| Scenario | SSH Hardening Needed? |
|----------|----------------------|
| You have a strong SSH key (asymmetric auth) | 🟡 Optional but recommended |
| You're behind a corporate firewall | 🟡 Optional |
| You use dynamic IP (ISP changes IP) | 🔴 Skip (or use Session Manager) |
| You value maximum security | ✅ Recommended |

**Our recommendation:** Do it if you have a static IP.

---

## Why Harden SSH?

Even with key-based authentication (which is strong), restricting SSH to your IP only:
- ✅ Eliminates bot scanning noise
- ✅ Eliminates brute force attempts (even unsuccessful)
- ✅ Reduces attack surface at network level
- ✅ Defense-in-depth (network + key-based auth)

**Downside:** If your ISP reassigns your IP, you'll need to update the rule.

---

## Prerequisites

**Have ready:**
- Your public IP (from Step 1 audit, or run `curl ifconfig.me`)
- AWS Console access

---

## Get Your Public IP

### From Your Local Machine

```bash
curl ifconfig.me
```

Example output: `95.166.3.217`

**Note this down.** You'll use it in the next step.

---

## Update AWS Security Group

### Option 1: AWS Console (Recommended)

1. **AWS Console** → EC2 → Instances
2. Select your instance
3. **Security** tab
4. Click security group name
5. **Edit inbound rules**
6. Find SSH rule (port 22) with source `0.0.0.0/0`
7. Click **Edit** (pencil icon)
8. Change source from `0.0.0.0/0` to `YOUR_PUBLIC_IP/32`
   - Example: `95.166.3.217/32`
9. Click **Save rules**

### Option 2: AWS CLI

```bash
# Get your security group ID (from Step 2, or):
aws ec2 describe-instances \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text
# Example output: sg-0123456789abcdef0

# Revoke old rule (0.0.0.0/0):
aws ec2 revoke-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp --port 22 --cidr 0.0.0.0/0

# Add new rule (your IP only):
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp --port 22 --cidr 95.166.3.217/32
```

---

## Verification

### From Your Local Machine (Should Work)

```bash
# Should connect normally:
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# You're logged in ✅
```

### From Another Machine/IP (Should Fail)

```bash
# From a different location, this should timeout:
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
# ssh: connect to host ... port 22: Connection timed out
```

---

## ⚠️ IMPORTANT: What If You Lock Yourself Out?

**If your IP changes and you can't SSH in:**

Use **AWS Systems Manager Session Manager** (no SSH needed):

1. AWS Console → Systems Manager → Session Manager
2. Click **Start session**
3. Select your instance
4. You're in a shell (like SSH)
5. Update the Security Group rule to your new IP:
   ```bash
   aws ec2 authorize-security-group-ingress \
     --group-id sg-XXXXXXXXX \
     --protocol tcp --port 22 --cidr NEW_IP/32
   ```

---

## Dynamic IP Workaround

If your ISP assigns dynamic IPs, you have options:

### Option 1: Keep SSH Open (0.0.0.0/0)
- ✅ Can SSH from anywhere
- 🔴 Less secure
- 🟡 Key auth still strong

```bash
# Keep this rule (don't restrict to IP)
```

### Option 2: Use VPN
- ✅ VPN IP is usually static
- ✅ Secure
- 🟡 Adds complexity

```bash
# Restrict SSH to your VPN's IP instead:
# aws ec2 authorize-security-group-ingress \
#   --group-id sg-XXXXXXXXX \
#   --protocol tcp --port 22 --cidr YOUR_VPN_IP/32
```

### Option 3: Use AWS Systems Manager Session Manager
- ✅ No SSH needed; no port to restrict
- ✅ IAM-based auth
- 🟡 Slightly more complex

(No Security Group changes needed; uses AWS API instead of SSH)

---

## Monitoring

### Weekly: Check SSH Rule

```bash
# Verify rule is still in place:
aws ec2 describe-security-groups \
  --group-ids sg-XXXXXXXXX \
  --query 'SecurityGroups[0].IpPermissions' \
  | grep -A 5 "22"
```

### If Your IP Changes

```bash
# Get new public IP:
curl ifconfig.me

# Update Security Group rule:
aws ec2 revoke-security-group-ingress \
  --group-id sg-XXXXXXXXX \
  --protocol tcp --port 22 --cidr OLD_IP/32

aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXXX \
  --protocol tcp --port 22 --cidr NEW_IP/32
```

---

## Rollback

If you want to revert to open access (not recommended):

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXXX \
  --protocol tcp --port 22 --cidr 0.0.0.0/0
```

But remember: this recreates the vulnerability.

---

## Summary

✅ **Steps completed:**
1. ✅ Port 18789 closed (AWS Security Group)
2. ✅ Gateway token enabled (application auth)
3. ✅ API keys rotated (credentials invalidated)
4. ✅ SSH restricted (optional; you did it)

**Your OpenClaw instance is now fully hardened.** 🎯

---

## What's Next?

1. **Run verification checklist** (see `tools/verification-checklist.md`)
2. **Monitor weekly** for unauthorized access attempts
3. **Rotate API keys quarterly** (best practice)
4. **Stay updated** on OpenClaw security advisories

---

## Troubleshooting

### "Connection refused" when trying SSH

```bash
# Check if you're using the right key:
ssh -i correct-key.pem -v ec2-user@YOUR_EC2_PUBLIC_IP

# Check if your IP is correct:
curl ifconfig.me

# Check if rule is in place:
aws ec2 describe-security-groups \
  --group-ids sg-XXXXXXXXX \
  | grep -i "22"
```

### "Connection timed out" from different IP

✅ **Expected.** Your rule is working (blocking other IPs).

### Lost SSH access and can't recover

Use AWS Session Manager:
1. AWS Console → Systems Manager → Session Manager → Start session
2. Fix the rule from within the session

---

**Time saved:** 1 of 2 minutes allocated for this step  
**Reversibility:** ✅ Can be undone at any time

---

**Congratulations!** Your OpenClaw instance is hardened. 🎉
