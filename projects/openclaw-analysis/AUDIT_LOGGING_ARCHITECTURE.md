# OpenClaw Audit Logging Architecture

**Date:** February 5, 2026  
**Status:** Comprehensive audit logging with architectural safeguards  
**Scope:** All actions (messages, API calls, searches, commands)

---

## Executive Summary

This document describes a **defense-in-depth audit logging system** for OpenClaw that provides:

✅ **Immutable audit trail** (tamper-evident cryptographic chaining)  
✅ **Request authentication** (verify requests are from authorized user)  
✅ **Rate limiting** (1000 requests/hour per user)  
✅ **Encryption at rest** (AES-256 + KMS)  
✅ **Long-term archival** (365-day S3 retention with object lock)  
✅ **Active monitoring** (30-day CloudWatch retention for real-time search)  
✅ **Compliance-ready** (SOX, HIPAA, GDPR audit trail)  

---

## Architecture Overview

```
┌─────────────────────┐
│  OpenClaw Agent     │ (Haiku 4.5)
│  (CLI, WhatsApp)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────┐
│  Audit Middleware (audit-middleware.js)              │
│  ✓ Verify request signature (HMAC-SHA256)           │
│  ✓ Check rate limits (1000/hour)                    │
│  ✓ Create tamper-evident entry (hash chain)         │
│  ✓ Record to local NDJSON log                       │
└──────────┬──────────────────────────────────────────┘
           │
      ┌────┴────┬─────────────────────────────┐
      │          │                             │
      ▼          ▼                             ▼
  Local Disk  CloudWatch Logs            S3 Archive
  (NDJSON)    (30-day retention)         (365-day retention)
              (encrypted, searchable)    (object lock, immutable)
```

---

## Components

### 1. Request Verification

**What it does:**
- Verifies all actions come from authorized phone number (+447786265893)
- Uses HMAC-SHA256 signature to prevent spoofing
- Rejects unauthorized requests immediately

**Example:**
```javascript
// Request must include:
phoneNumber: "+447786265893"
signature: crypto.createHmac('sha256', SECRET)
  .update(phoneNumber)
  .digest('hex')

// If signature doesn't match → Request rejected
```

**Protection:** Prevents attackers (even with EC2 access) from spoofing as authorized user

---

### 2. Rate Limiting

**What it does:**
- Limits to 1,000 requests/hour per user
- Tracks in-memory, resets hourly
- Prevents bulk exfiltration attacks

**Example:**
```
Request 1-1000:  ✅ Allowed
Request 1001:    ❌ Rate limit exceeded. Retry in 60 minutes.
```

**Protection:** Even if attacker gains access, they can't dump all emails at once

---

### 3. Tamper-Evident Logging

**What it does:**
- Every log entry is hashed (SHA-256)
- Each entry links to previous via "chainHash"
- Deletion or modification breaks the chain immediately

**Example entry:**
```json
{
  "timestamp": "2026-02-05T17:04:00Z",
  "logId": "a1b2c3d4e5f6g7h8",
  "action": "gmail_search",
  "userId": "+447786265893",
  "details": {
    "query": "password reset",
    "results": 5
  },
  "hash": "sha256(above)",
  "chainHash": "sha256(previous_entry)"
}
```

**Protection:** If attacker modifies/deletes a log entry, the chain breaks → tamper is detectable

**Verification:**
```bash
node audit-middleware.js
# ✅ All logs verified
# or
# ❌ LOG TAMPERING DETECTED at entry 42
```

---

### 4. Multi-Layer Storage

#### Layer 1: Local NDJSON (Real-time)
```
~/.logs/audit.ndjson
- Contains: All entries since startup
- Format: Newline-delimited JSON
- Protection: Chain hash verification
- Searchable: Via grep, jq, etc.
```

#### Layer 2: CloudWatch Logs (30-day Active)
```
/openclaw/audit-logs
- Retention: 30 days (searchable)
- Encryption: KMS (customer-managed key)
- Access: IAM role-based
- Query: CloudWatch Logs Insights
```

#### Layer 3: S3 Archive (365-day Immutable)
```
s3://mondweep-openclaw-audit-logs/
- Retention: 365 days with object lock
- Versioning: Enabled (tracks deletions)
- Encryption: KMS + AES-256
- Access: Restricted to audit role only
```

---

## What Gets Logged

### Every action includes:

| Field | Example | Purpose |
|-------|---------|---------|
| timestamp | 2026-02-05T17:04:00Z | When it happened |
| logId | a1b2c3d4e5f6 | Unique identifier |
| action | gmail_search | What happened |
| userId | +447786265893 | Who did it |
| details | {query, results} | Context |
| hash | sha256(...) | Verify entry integrity |
| chainHash | sha256(prev) | Detect tampering |

### Actions logged:

```
✅ WhatsApp messages (incoming)
✅ API calls (Gmail, Telegram, etc.)
✅ Searches (emails, data)
✅ Tagging/labeling
✅ Configuration changes
✅ Errors and exceptions
✅ Rate limit violations
✅ Authentication failures
```

---

## Setup & Deployment

### Step 1: Run Infrastructure Setup

```bash
# From EC2 instance with AWS CLI + credentials:
bash AUDIT_LOGGING_SETUP.sh

# This creates:
# - KMS encryption key
# - S3 bucket (versioning + object lock)
# - CloudWatch log group (30-day retention)
# - IAM policies (least privilege)
```

### Step 2: Update OpenClaw Config

```bash
nano ~/.openclaw/openclaw.json

# Add:
{
  "audit": {
    "enabled": true,
    "cloudWatchGroup": "/openclaw/audit-logs",
    "s3Bucket": "mondweep-openclaw-audit-logs",
    "kmsKeyId": "arn:aws:kms:us-east-1:ACCOUNT:key/KEY_ID",
    "rateLimit": 1000,
    "secret": "$OPENCLAW_AUDIT_SECRET"
  }
}
```

### Step 3: Integrate Middleware

```bash
# Add to OpenClaw startup:
node audit-middleware.js --enable

# Or add to .openclaw/openclaw.json hooks:
"hooks": {
  "internal": {
    "entries": {
      "audit-logging": {
        "enabled": true,
        "path": "./audit-middleware.js"
      }
    }
  }
}
```

---

## Querying & Monitoring

### Real-Time Local Query

```bash
# Search local audit log:
grep "gmail_search" ~/.logs/audit.ndjson | jq

# Filter by user:
cat ~/.logs/audit.ndjson | jq 'select(.userId == "+447786265893")'

# Count actions by type:
cat ~/.logs/audit.ndjson | jq -s 'group_by(.action) | map({action: .[0].action, count: length})'
```

### CloudWatch Query (Last 24 Hours)

```bash
aws logs start-query \
  --log-group-name /openclaw/audit-logs \
  --start-time $(date -d '24 hours ago' +%s)000 \
  --end-time $(date +%s)000 \
  --query-string '
    fields @timestamp, action, userId, logId
    | stats count() as count by action
  '
```

### Verify Log Integrity

```bash
node audit-middleware.js --verify

# Output:
# ✅ All 1,247 logs verified
# or
# ❌ LOG TAMPERING DETECTED at entry 42
```

---

## Tamper Detection Scenarios

### Scenario 1: Attacker Deletes a Log Entry

```
Before:  [Entry 41] → [Entry 42] → [Entry 43]
After:   [Entry 41] → [Entry 43]

Detection:
Entry 43's chainHash = sha256(Entry 42)
But Entry 42 no longer exists
Result: ❌ CHAIN BROKEN - TAMPERING DETECTED
```

### Scenario 2: Attacker Modifies an Entry

```
Entry 42 original:  {"action": "gmail_search"}
Entry 42 modified:  {"action": "gmail_delete"}

Detection:
Entry 42's hash = sha256({"action": "gmail_search"})
Recomputing hash of modified entry ≠ stored hash
Result: ❌ HASH MISMATCH - TAMPERING DETECTED
```

### Scenario 3: Attacker Tries to S3 Overwrite

```
S3 Object Lock enabled with 365-day GOVERNANCE mode
Attacker tries to overwrite or delete
Result: ❌ ACCESS DENIED - Object locked for 365 days
```

---

## Cost Breakdown (12 Months)

| Component | Monthly | Annual | Notes |
|-----------|---------|--------|-------|
| **CloudWatch Logs** | $0.02 | $0.24 | 5 MB/month @ standard usage |
| **S3 Storage** | $0.001 | $0.01 | 5 MB logs/month |
| **S3 Object Lock** | $0.001 | $0.01 | Tamper-proof metadata |
| **KMS** | $0.01 | $0.12 | 10 API calls/month |
| **S3 Archival** | $0.001 | $0.01 | Lifecycle policies |
| **────────** | **────** | **────** | |
| **TOTAL** | **$0.03** | **$0.37** | Less than a coffee ☕ |

---

## Security Properties

### What This Protects Against

| Attack | Protection |
|--------|-----------|
| **Silent exfiltration** | Rate limiting (max 1000/hour) |
| **Credential theft** | Request authentication (HMAC-SHA256) |
| **Log tampering** | Cryptographic chain (hash verification) |
| **Log deletion** | S3 object lock (365-day immutable) |
| **Key compromise** | KMS (customer-managed encryption keys) |
| **Access abuse** | CloudWatch Logs Insights (audit trail visible) |

### What This Does NOT Protect Against

| Threat | Why |
|--------|-----|
| **Network traffic interception** | HTTPS is handled at infrastructure level |
| **Insider threat (AWS)** | Requires SOC 2 Type II compliance contract |
| **Quantum computing** | Use post-quantum cryptography (future work) |
| **Side-channel attacks** | Beyond scope of audit logging |

---

## Compliance & Standards

This architecture supports:

✅ **SOX (Sarbanes-Oxley)** — Immutable audit trail, access controls  
✅ **HIPAA** — Encryption at rest + in transit, audit logging  
✅ **GDPR** — Data retention policies, right to audit  
✅ **ISO 27001** — Access control, encryption, audit trail  
✅ **CIS Benchmarks** — CloudWatch logging, KMS encryption  

---

## Incident Response

### If You Detect Tampering

1. **Immediately isolate the instance:**
   ```bash
   # Stop the instance (don't terminate):
   aws ec2 stop-instances --instance-ids i-XXXXXXXX
   ```

2. **Preserve evidence:**
   ```bash
   # Download audit logs from S3:
   aws s3 cp s3://mondweep-openclaw-audit-logs /tmp/audit-backup --recursive
   ```

3. **Analyze the breach:**
   ```bash
   # When did tampering start?
   # What logs were modified?
   # What data was exfiltrated?
   ```

4. **Rotate credentials immediately:**
   - Anthropic API key
   - Telegram token
   - Slack token
   - Discord token
   - AWS credentials
   - Gmail OAuth token

---

## Future Enhancements

- [ ] Real-time alerting (SNS) on tampering detection
- [ ] Blockchain timestamp proofs (for legal admissibility)
- [ ] AI anomaly detection (detect unusual access patterns)
- [ ] Federated logging (send to SIEM like Splunk)
- [ ] Hardware security module (HSM) for key storage
- [ ] Multi-signature requirements (multiple approvals for sensitive actions)

---

## References

- **OpenClaw Docs:** https://docs.openclaw.ai
- **AWS CloudWatch Logs:** https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/
- **AWS S3 Object Lock:** https://docs.aws.amazon.com/AmazonS3/latest/userguide/ObjectLock.html
- **KMS Best Practices:** https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html
- **OWASP Logging:** https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html

---

**Status:** ✅ Ready for deployment  
**Security Review:** Pending  
**Last Updated:** February 5, 2026
