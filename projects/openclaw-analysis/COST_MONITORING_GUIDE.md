# OpenClaw Cost Monitoring Guide

**Objective:** Alert if audit logging costs exceed baseline + 50%  
**Baseline:** ~$0.031/month ($0.37/year)  
**Alert Threshold:** $0.046/month ($0.555/year)  
**Check Frequency:** Daily at 9 AM UTC

---

## Quick Setup (5 minutes)

```bash
# From EC2 instance:
bash COST_MONITORING_SETUP.sh
```

This creates:
- ✅ SNS topic for alerts
- ✅ CloudWatch alarm (cost > $0.046/month)
- ✅ Daily cost monitoring cron job
- ✅ Email notifications

---

## How It Works

### 1. Daily Cost Check

Every day at 9 AM UTC, a script runs that:
1. Queries AWS Cost Explorer API
2. Pulls costs for CloudWatch, S3, KMS
3. Compares to threshold ($0.046/month)
4. Sends SNS alert if exceeded

### 2. SNS Notification

If costs spike, you receive email:
```
Subject: OpenClaw Cost Alert: $0.15/month

Body:
Actual cost: $0.15/month
Expected cost: $0.031/month
Threshold: $0.046/month

Cost is 384% above baseline.

Breakdown:
- CloudWatch Logs: $0.10
- S3: $0.04
- KMS: $0.01

Please review your audit logging configuration.
```

### 3. What Triggers an Alert

| Actual Cost | Status |
|-------------|--------|
| $0.000 | ✅ Normal (0% of baseline) |
| $0.031 | ✅ Normal (100% of baseline) |
| $0.046 | ⚠️ **ALERT** (148% of baseline — threshold hit) |
| $0.100 | 🚨 **CRITICAL** (323% of baseline) |

---

## Manual Cost Check

You can also check costs manually anytime:

```bash
/home/ec2-user/.openclaw/workspace/monitor-openclaw-costs.sh $SNS_TOPIC_ARN
```

Example output:
```
💰 OpenClaw Cost Report
========================

📊 Cost Breakdown:
   CloudWatch Logs: $0.02
   S3 Storage:      $0.001
   KMS:             $0.008
   ─────────────────────────
   TOTAL:           $0.029

📈 Comparison to Baseline:
   Baseline:        $0.031/month
   Alert threshold: $0.046/month (baseline + 50%)
   Current:         $0.029/month

✅ Costs are within expected range
```

---

## Cost Breakdown Details

### CloudWatch Logs
```
Cost: ~$0.02/month
Driven by: Log volume (size of entries)
How to reduce:
- Reduce log retention (currently 30 days)
- Filter out low-value logs
- Compress log data
```

### S3 Storage
```
Cost: ~$0.001/month
Driven by: Storage size (5 MB/month at current usage)
How to reduce:
- Reduce S3 retention (currently 365 days)
- Archive to Glacier after 90 days
- Compress historical logs
```

### KMS (Key Management Service)
```
Cost: ~$0.01/month
Driven by: API calls (encrypt/decrypt operations)
How to reduce:
- Batch encrypt operations
- Use envelope encryption
- Reduce log frequency
```

---

## Cost Scenarios & Responses

### Scenario 1: Cost Spike to $0.15/month (4.8x baseline)

**Possible causes:**
- Log volume increased 5x (very verbose logging)
- New application writing excessive logs
- S3 object growth (unintended archival)

**Response:**
```bash
# 1. Check CloudWatch log size:
aws logs describe-log-groups \
  --log-group-name-prefix /openclaw

# 2. Check S3 bucket size:
aws s3 ls s3://mondweep-openclaw-audit-logs --summarize --human-readable

# 3. Review recent audit entries:
tail -100 ~/.logs/audit.ndjson | jq '.action' | sort | uniq -c

# 4. If logs are too verbose, adjust retention:
aws logs put-retention-policy \
  --log-group-name /openclaw/audit-logs \
  --retention-in-days 14  # Reduce from 30 to 14

# 5. Confirm SNS alert received, investigate root cause
```

### Scenario 2: Cost Spike to $0.05/month (1.6x baseline)

**Possible causes:**
- Usage increased 50% (normal growth)
- Slightly more API calls

**Response:**
```bash
# This is within 50% threshold, so no alert
# But monitor trend — if continues to rise, may exceed next month

# Proactive checks:
- Review action counts: cat ~/.logs/audit.ndjson | jq -s 'map(.action) | group_by(.) | map({action: .[0], count: length})'
- Check for runaway processes
- Verify no accidental bulk operations
```

### Scenario 3: Cost Stays at $0.03/month

✅ **Perfect.** Baseline behavior. No action needed.

---

## AWS Cost Monitoring Tools

You can also monitor costs in AWS Console:

1. **Cost Explorer**
   ```
   AWS Console → Billing & Cost Management → Cost Explorer
   Filter by: Service = CloudWatch, S3, KMS
   Date range: Last 30 days
   ```

2. **Cost Anomaly Detection**
   ```
   AWS Console → Billing & Cost Management → Cost Anomaly Detection
   Monitors for unusual spending patterns (automated)
   ```

3. **Budget Alerts**
   ```
   AWS Console → Billing & Cost Management → Budgets
   Set monthly budget: $0.05 (allows some margin above baseline)
   Alert when spending exceeds: $0.046
   ```

---

## Common Questions

### Q: Will I get alerted every day?
**A:** No. Only when actual costs exceed $0.046/month. At current usage (~$0.03/month), you won't get daily alerts.

### Q: What if I increase logging frequency?
**A:** Costs will rise proportionally. If you add 10x more audit entries, expect costs to rise to ~$0.30/month (would trigger alert).

### Q: Can I adjust the alert threshold?
**A:** Yes, edit `COST_MONITORING_SETUP.sh`:
```bash
ALERT_THRESHOLD=0.046   # Change to whatever you want
```

Then re-run setup.

### Q: What if costs spike legitimately (e.g., new feature)?
**A:** You'll get alerted, investigate, and decide if it's acceptable. Adjust threshold if needed:
```bash
# Update CloudWatch alarm:
aws cloudwatch put-metric-alarm \
  --alarm-name openclaw-audit-cost-alert \
  --threshold 0.10  # New threshold
```

### Q: How do I verify the cron job is running?
**A:** 
```bash
# Check crontab:
crontab -l | grep openclaw

# Check logs:
tail -50 /var/log/openclaw-cost-monitoring.log

# Expected: Runs daily at 9 AM UTC
```

---

## Cost Evolution Over Time

### Month 1 (Current)
```
Audit entries: ~1,000
Cost: $0.029
Status: ✅ Baseline
```

### Month 6 (if usage 2x)
```
Audit entries: ~2,000
Cost: $0.058
Status: ⚠️ Slight overage (+1.26x)
Action: Monitor, may need to adjust retention
```

### Month 12 (if usage 5x)
```
Audit entries: ~5,000
Cost: $0.145
Status: 🚨 Critical (+4.68x)
Action: Reduce retention, archive old logs to Glacier, review logging strategy
```

---

## Cost Optimization Tips

If costs approach threshold, consider:

1. **Reduce CloudWatch Retention** (currently 30 days)
   ```bash
   aws logs put-retention-policy \
     --log-group-name /openclaw/audit-logs \
     --retention-in-days 7  # Reduce to 7 days
   ```

2. **Move S3 to Glacier After 90 Days**
   ```bash
   # Create lifecycle policy:
   aws s3api put-bucket-lifecycle-configuration \
     --bucket mondweep-openclaw-audit-logs \
     --lifecycle-configuration file://lifecycle.json
   ```
   
   lifecycle.json:
   ```json
   {
     "Rules": [{
       "Id": "archive-to-glacier",
       "Status": "Enabled",
       "Days": 90,
       "Transitions": [{
         "StorageClass": "GLACIER",
         "Days": 90
       }]
     }]
   }
   ```

3. **Filter Low-Value Logs**
   ```bash
   # Only log critical actions (not every message)
   # Edit audit-middleware.js to filter by action type
   ```

4. **Compress Historical Logs**
   ```bash
   gzip ~/.logs/audit.ndjson  # Local compression
   ```

---

## Alert Fatigue Prevention

**Threshold is set intentionally high** (+50% above baseline) to:
- ✅ Avoid false positives
- ✅ Give some headroom for normal variance
- ✅ Only alert on genuine problems

If you're getting alerts regularly, it means:
- Either usage has legitimately increased (expected)
- Or there's an issue you should investigate

---

## Verification Checklist

After setup, verify:

- [ ] SNS topic created: `aws sns list-topics`
- [ ] Email confirmed: Check inbox for SNS confirmation
- [ ] Cron job added: `crontab -l | grep openclaw`
- [ ] Cost script is executable: `ls -l monitor-openclaw-costs.sh`
- [ ] Manual test passes: `/path/to/monitor-openclaw-costs.sh $ARN`
- [ ] CloudWatch alarm created: `aws cloudwatch describe-alarms | grep openclaw-audit-cost`

---

## Support & Troubleshooting

### "SNS topic not found"
```bash
aws sns list-topics --region us-east-1
# Look for: arn:aws:sns:us-east-1:ACCOUNT:openclaw-cost-alerts
```

### "Cost script fails with AWS credentials error"
```bash
# Verify AWS CLI is configured:
aws sts get-caller-identity

# Or use IAM role on EC2:
aws ec2 describe-instances --instance-ids i-XXXXXXXX
```

### "Cron job not running"
```bash
# Check cron logs:
grep CRON /var/log/syslog | tail -20

# Verify crontab is correct:
crontab -l

# Manually test:
bash /home/ec2-user/.openclaw/workspace/monitor-openclaw-costs.sh $ARN
```

---

## Integration with OpenClaw

Cost monitoring runs **independently** of OpenClaw:
- ✅ Works even if OpenClaw is down
- ✅ Doesn't impact performance
- ✅ Uses AWS API directly (no local resources)

---

**Status:** ✅ Ready to deploy  
**Last Updated:** February 5, 2026
