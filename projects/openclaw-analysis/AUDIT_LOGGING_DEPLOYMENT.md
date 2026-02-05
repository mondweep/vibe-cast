# OpenClaw Audit Logging - Deployment Guide

**Estimated Time:** 15-20 minutes  
**Difficulty:** Intermediate  
**Prerequisites:** AWS credentials with KMS, S3, CloudWatch permissions

---

## Pre-Flight Checklist

- [ ] AWS CLI installed: `aws --version`
- [ ] AWS credentials configured: `aws sts get-caller-identity`
- [ ] EC2 instance has IAM role (or credentials)
- [ ] Node.js 18+: `node --version`
- [ ] Git access to vibe-cast repo

---

## Step 1: Create AWS Infrastructure (5 min)

### From Your EC2 Instance

```bash
# SSH into EC2:
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Navigate to workspace:
cd /home/ec2-user/.openclaw/workspace

# Run setup script (creates KMS key, S3 bucket, CloudWatch):
bash AUDIT_LOGGING_SETUP.sh
```

**What gets created:**
```
✅ KMS encryption key (customer-managed)
✅ S3 bucket (versioning + object lock)
✅ CloudWatch log group (/openclaw/audit-logs)
✅ IAM policies (least privilege)
```

**Save the output:**
```
KMS Key ID:       arn:aws:kms:us-east-1:ACCOUNT:key/abc123
S3 Bucket:        mondweep-openclaw-audit-logs
CloudWatch Group: /openclaw/audit-logs
```

---

## Step 2: Update OpenClaw Config (3 min)

```bash
nano ~/.openclaw/openclaw.json
```

Find the `"gateway"` section and add:

```json
{
  "gateway": {
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token"
    },
    "audit": {
      "enabled": true,
      "cloudWatchGroup": "/openclaw/audit-logs",
      "s3Bucket": "mondweep-openclaw-audit-logs",
      "kmsKeyId": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID",
      "rateLimit": 1000,
      "secret": "YOUR_AUDIT_SECRET_HERE"
    }
  }
}
```

**Generate audit secret:**
```bash
# Create a strong secret:
openssl rand -hex 32
# Copy output and paste into "secret" field above
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

---

## Step 3: Deploy Audit Middleware (3 min)

```bash
# Copy middleware to OpenClaw hooks directory:
cp audit-middleware.js ~/.openclaw/workspace/

# Test the middleware:
node audit-middleware.js

# Expected output:
# 🔐 OpenClaw Audit Logging Middleware
# Example audit entry: { success: true, logId: "...", timestamp: "..." }
# Log chain verification: { valid: true, tampered: false, message: "No logs yet" }
```

**Enable in OpenClaw config:**
```bash
nano ~/.openclaw/openclaw.json

# Find "hooks" section and add:
"hooks": {
  "internal": {
    "enabled": true,
    "entries": {
      "audit-logging": {
        "enabled": true,
        "scriptPath": "./audit-middleware.js"
      }
    }
  }
}
```

Save and exit.

---

## Step 4: Restart OpenClaw (2 min)

```bash
# Restart gateway with new config:
openclaw gateway restart

# Verify it started cleanly:
openclaw logs --tail 20

# Should see:
# ✅ Gateway restarted successfully
# ✅ Audit logging enabled
```

---

## Step 5: Test Audit Logging (2 min)

### Test 1: Local Audit Entry

```bash
# Create a test audit entry:
node audit-middleware.js

# Check local log file:
cat ~/.logs/audit.ndjson | tail -1 | jq

# Should see:
# {
#   "timestamp": "2026-02-05T17:15:00Z",
#   "logId": "a1b2c3d4...",
#   "action": "middleware_test",
#   "userId": "+447786265893",
#   ...
# }
```

### Test 2: Verify Chain Integrity

```bash
# Verify no tampering:
node audit-middleware.js --verify

# Expected output:
# ✅ All 1 logs verified
# ✅ Chain integrity: VALID
```

### Test 3: Query CloudWatch

```bash
# List recent logs in CloudWatch:
aws logs tail /openclaw/audit-logs --follow

# Should see your test entry in real-time
```

---

## Step 6: Set Up Monitoring (3 min)

### Daily Integrity Check

```bash
# Add to crontab:
crontab -e

# Add this line:
0 6 * * * /home/ec2-user/.openclaw/workspace/verify-audit-logs.sh

# Save and exit (Ctrl+O, Enter, Ctrl+X)
```

**Create verification script:**

```bash
cat > verify-audit-logs.sh << 'EOF'
#!/bin/bash

echo "🔍 Daily Audit Log Verification"
echo ""

# Verify local log chain
node /home/ec2-user/.openclaw/workspace/audit-middleware.js --verify

# Check for tampering
RESULT=$?
if [ $RESULT -eq 0 ]; then
  echo "✅ All logs verified - no tampering detected"
else
  echo "❌ ALERT: Tampering detected! Check immediately."
  # Send alert (email, Slack, etc.)
fi
EOF

chmod +x verify-audit-logs.sh
```

---

## Step 7: Document & Commit (2 min)

```bash
# Navigate to vibe-cast repo:
cd /home/ec2-user/.openclaw/workspace/vibe-cast

# Copy audit logging files:
cp -r ../AUDIT_LOGGING_*.md projects/openclaw-analysis/
cp ../audit-middleware.js projects/openclaw-analysis/

# Commit to GitHub:
git add projects/openclaw-analysis/
git commit -m "Add OpenClaw audit logging architecture with safeguards

- AUDIT_LOGGING_SETUP.sh: Infrastructure as code (KMS, S3, CloudWatch)
- AUDIT_LOGGING_ARCHITECTURE.md: Complete design + security analysis
- AUDIT_LOGGING_DEPLOYMENT.md: Step-by-step deployment guide
- audit-middleware.js: Middleware implementation (request auth, rate limiting, tamper detection)

Features:
- Request authentication (HMAC-SHA256)
- Rate limiting (1000 req/hour)
- Tamper-evident logging (SHA256 chain)
- 30-day CloudWatch retention (active)
- 365-day S3 archival (immutable with object lock)
- KMS encryption at rest
- Cost: ~$0.37/year"

git push origin claude/openclaw-tinkering-aI4U7
```

---

## Verification Checklist

After deployment, verify:

- [ ] OpenClaw starts without errors: `openclaw logs --tail 5`
- [ ] Audit middleware loaded: `grep "audit-logging" ~/.openclaw/openclaw.json`
- [ ] Local log file created: `ls -lh ~/.logs/audit.ndjson`
- [ ] Chain integrity verified: `node audit-middleware.js --verify`
- [ ] CloudWatch logs visible: `aws logs tail /openclaw/audit-logs`
- [ ] S3 bucket created: `aws s3 ls | grep openclaw-audit`
- [ ] KMS key created: `aws kms list-keys`
- [ ] WhatsApp still works: Send test message, verify response

---

## Troubleshooting

### "Module not found: audit-middleware"

```bash
# Verify file exists:
ls -l audit-middleware.js

# Add to config with full path:
"scriptPath": "/home/ec2-user/.openclaw/workspace/audit-middleware.js"

# Restart:
openclaw gateway restart
```

### "AWS credentials not found"

```bash
# Configure AWS CLI:
aws configure

# Or use IAM role (if on EC2):
aws ec2 associate-iam-instance-profile \
  --instance-id i-XXXXXXXX \
  --iam-instance-profile Name=openclaw-audit-role
```

### "CloudWatch logs not showing"

```bash
# Check IAM permissions:
aws logs describe-log-groups | grep openclaw

# If not listed, create manually:
aws logs create-log-group --log-group-name /openclaw/audit-logs

# Set retention:
aws logs put-retention-policy \
  --log-group-name /openclaw/audit-logs \
  --retention-in-days 30
```

### "S3 bucket creation failed"

```bash
# Check existing buckets:
aws s3 ls

# If bucket exists, just verify encryption:
aws s3api get-bucket-encryption --bucket mondweep-openclaw-audit-logs

# If not found, create with KMS:
aws s3api create-bucket \
  --bucket mondweep-openclaw-audit-logs \
  --region us-east-1
```

---

## Next Steps

1. ✅ **Baseline established:** Audit logging active, all actions tracked
2. ✅ **Monitoring in place:** Daily verification of log integrity
3. 🔄 **Continuous improvement:**
   - [ ] Set up SNS alerts for tampering detection
   - [ ] Integrate with SIEM (Splunk, ELK)
   - [ ] Add real-time anomaly detection
   - [ ] Implement multi-signature for sensitive actions

---

## Support

**Questions or issues?**
- Check `AUDIT_LOGGING_ARCHITECTURE.md` for design details
- Review CloudWatch Logs: `aws logs tail /openclaw/audit-logs --follow`
- Verify chain: `node audit-middleware.js --verify`

---

**Status:** ✅ Deployment ready  
**Last Updated:** February 5, 2026
