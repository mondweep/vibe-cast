# Step 2: Close Port 18789 (AWS Security Group)

**Objective:** Prevent public internet access to the OpenClaw gateway.  
**Time:** 3 minutes  
**Risk:** No data loss; easily reversible

---

## Why This Matters

Even if your instance isn't currently indexed on Shodan, closing port 18789 at the network level provides **foundational defense**:
- ✅ Bots can't discover it via port scanning
- ✅ No accidental exposure if configuration changes
- ✅ Defense-in-depth (network + application layer)

---

## Option 1: AWS Console (Recommended)

### Step 1: Navigate to Security Groups

1. Open **AWS Console** → https://console.aws.amazon.com
2. Go to **EC2** → **Instances**
3. Find your instance
4. Click on it to view details
5. Under **Security** tab, click the security group name (e.g., `sg-12345abc`)

### Step 2: View Inbound Rules

You're now in the Security Group details page. Under **Inbound rules**, you'll see a table of allowed traffic.

### Step 3: Find Port 18789 (if it exists)

Look for a rule with:
- **Port range:** 18789
- **Source:** 0.0.0.0/0 or ::/0

**If it doesn't exist:** ✅ You're safe. No action needed. Proceed to Step 3.

**If it exists:** Continue to Step 4.

### Step 4: Delete the Rule

1. Click **Edit inbound rules** button
2. Find the port 18789 rule
3. Click the **X** (delete) button on the right
4. Click **Save rules**

**Expected message:** "Inbound rules have been updated"

---

## Option 2: AWS CLI (Advanced)

### Find Your Security Group ID

```bash
# From your EC2 instance:
aws ec2 describe-instances \
  --instance-ids $(ec2-metadata --instance-id | cut -d' ' -f2) \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text
```

Output: `sg-XXXXXXXXX`

### Check Current Rules

```bash
aws ec2 describe-security-groups \
  --group-ids sg-XXXXXXXXX \
  --query 'SecurityGroups[0].IpPermissions' \
  --output table | grep -A 10 18789
```

### Remove Port 18789 Rule

```bash
# If rule exists with source 0.0.0.0/0:
aws ec2 revoke-security-group-ingress \
  --group-id sg-XXXXXXXXX \
  --protocol tcp \
  --port 18789 \
  --cidr 0.0.0.0/0
```

Expected: `Return value is true.`

### Remove IPv6 Rule (if present)

```bash
aws ec2 revoke-security-group-ingress \
  --group-id sg-XXXXXXXXX \
  --protocol tcp \
  --port 18789 \
  --ipv6-cidr ::/0
```

---

## Verification

### Confirm Port is Closed

**From your local machine (not EC2):**

```bash
# Try to connect to port 18789:
nc -zv YOUR_EC2_PUBLIC_IP 18789

# Expected output:
# nc: connect to YOUR_EC2_PUBLIC_IP port 18789 (tcp) failed: Connection refused
```

✅ **Good:** Connection refused means port is closed.

### From EC2, Port Should Still Be Listening Locally

```bash
# SSH into your EC2:
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Check local binding:
ss -tuln | grep 18789
```

Expected:
```
tcp  0  0 127.0.0.1:18789    0.0.0.0:*    LISTEN
tcp6 0  0 ::1:18789          :::*         LISTEN
```

✅ **Good:** Bound to localhost, not publicly accessible.

---

## Troubleshooting

### "Connection refused" vs "Connection timed out"
- **Refused:** Port is closed at network level ✅
- **Timed out:** Port might still be open; check Security Group rules again

### Rule Won't Delete in Console
1. Refresh the page
2. Try again
3. If still stuck, use AWS CLI method instead

### Need to Re-Enable (Rollback)

If you need to allow port 18789 again (not recommended, but possible):

```bash
# AWS CLI:
aws ec2 authorize-security-group-ingress \
  --group-id sg-XXXXXXXXX \
  --protocol tcp \
  --port 18789 \
  --cidr 0.0.0.0/0
```

But this recreates the vulnerability. **Only do this if absolutely necessary.**

---

## What's Next?

✅ Port 18789 is closed at the network level.

**Next:** [Step 3: Gateway Authentication](STEP_3_GATEWAY_AUTH.md)

This adds authentication at the application layer, providing defense-in-depth.

---

**Time saved:** 2 of 3 minutes allocated for this step  
**Reversibility:** ✅ Can be undone via Security Group
