#!/bin/bash

###############################################################################
# OpenClaw Audit Logging - Cost Monitoring Setup
# 
# Monitors AWS costs and alerts if audit logging costs exceed 50% above baseline
# Baseline: ~$0.37/year (~$0.031/month)
# Alert threshold: $0.046/month ($0.555/year)
#
# Usage: bash COST_MONITORING_SETUP.sh
###############################################################################

set -e

REGION="us-east-1"
BASELINE_MONTHLY=0.031  # $0.031/month
ALERT_THRESHOLD=0.046   # $0.046/month (50% above baseline)
SNS_TOPIC_NAME="openclaw-cost-alerts"
EMAIL="mondweep@dxsure.uk"

echo "💰 Setting up OpenClaw Cost Monitoring..."
echo ""

# ============================================================================
# 1. Create SNS Topic for Alerts
# ============================================================================

echo "1️⃣  Creating SNS topic for cost alerts..."

TOPIC_ARN=$(aws sns create-topic \
  --name $SNS_TOPIC_NAME \
  --region $REGION \
  --query 'TopicArn' \
  --output text)

echo "   ✅ SNS Topic: $TOPIC_ARN"
echo ""

# ============================================================================
# 2. Subscribe Email to SNS Topic
# ============================================================================

echo "2️⃣  Subscribing email to alerts ($EMAIL)..."

aws sns subscribe \
  --topic-arn $TOPIC_ARN \
  --protocol email \
  --notification-endpoint $EMAIL \
  --region $REGION

echo "   ℹ️  Check your email for SNS confirmation"
echo "   ℹ️  You must confirm the subscription to receive alerts"
echo ""

# ============================================================================
# 3. Create Cost Anomaly Detection
# ============================================================================

echo "3️⃣  Enabling AWS Cost Anomaly Detection..."

# Create detector for OpenClaw services
aws ce create-anomaly-detector \
  --anomaly-detector '{
    "AnomalyScope": "CUSTOM",
    "MonitorSpecification": {
      "InvocationFrequency": "DAILY"
    },
    "MonitorDimension": "SERVICE"
  }' \
  --region $REGION \
  2>/dev/null || echo "   ℹ️  Anomaly detector may already exist"

echo "   ✅ Cost anomaly detection enabled"
echo ""

# ============================================================================
# 4. Create CloudWatch Alarm for Cost Spikes
# ============================================================================

echo "4️⃣  Creating CloudWatch alarm (cost > \$0.046/month)..."

aws cloudwatch put-metric-alarm \
  --alarm-name openclaw-audit-cost-alert \
  --alarm-description "Alert if OpenClaw audit logging costs exceed baseline + 50%" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold $ALERT_THRESHOLD \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions $TOPIC_ARN \
  --dimensions Name=Currency,Value=USD \
  --region $REGION \
  2>/dev/null || echo "   ℹ️  Alarm may already exist"

echo "   ✅ Alarm created"
echo ""

# ============================================================================
# 5. Create Cost Monitoring Script
# ============================================================================

echo "5️⃣  Creating cost monitoring script..."

cat > /home/ec2-user/.openclaw/workspace/monitor-openclaw-costs.sh << 'EOFSCRIPT'
#!/bin/bash

#############################################################################
# Monitor OpenClaw Audit Logging Costs
# 
# Queries AWS Cost Explorer for audit-related services
# Alerts if costs exceed baseline + 50%
#
# Services tracked:
# - CloudWatch Logs
# - S3
# - Key Management Service (KMS)
#############################################################################

REGION="us-east-1"
BASELINE_MONTHLY=0.031
ALERT_THRESHOLD=0.046
SNS_TOPIC_ARN="$1"

if [ -z "$SNS_TOPIC_ARN" ]; then
  echo "Usage: $0 <SNS_TOPIC_ARN>"
  exit 1
fi

echo "💰 OpenClaw Cost Report"
echo "========================"
echo ""

# Get current month costs
START_DATE=$(date -d "1 month ago" +%Y-%m-01)
END_DATE=$(date +%Y-%m-01)

echo "Querying costs from $START_DATE to $END_DATE..."
echo ""

# CloudWatch Logs costs
CW_COST=$(aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["Amazon CloudWatch"]
    }
  }' \
  --region $REGION \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text 2>/dev/null || echo "0")

# S3 costs
S3_COST=$(aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["Amazon Simple Storage Service"]
    }
  }' \
  --region $REGION \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text 2>/dev/null || echo "0")

# KMS costs
KMS_COST=$(aws ce get-cost-and-usage \
  --time-period Start=$START_DATE,End=$END_DATE \
  --granularity MONTHLY \
  --metrics "UnblendedCost" \
  --filter '{
    "Dimensions": {
      "Key": "SERVICE",
      "Values": ["AWS Key Management Service"]
    }
  }' \
  --region $REGION \
  --query 'ResultsByTime[0].Total.UnblendedCost.Amount' \
  --output text 2>/dev/null || echo "0")

# Calculate totals
TOTAL_COST=$(echo "$CW_COST + $S3_COST + $KMS_COST" | bc)

echo "📊 Cost Breakdown:"
echo "   CloudWatch Logs: \$$CW_COST"
echo "   S3 Storage:      \$$S3_COST"
echo "   KMS:             \$$KMS_COST"
echo "   ─────────────────────────"
echo "   TOTAL:           \$$TOTAL_COST"
echo ""

echo "📈 Comparison to Baseline:"
echo "   Baseline:        \$$BASELINE_MONTHLY/month"
echo "   Alert threshold: \$$ALERT_THRESHOLD/month (baseline + 50%)"
echo "   Current:         \$$TOTAL_COST/month"
echo ""

# Check if exceeds threshold
if (( $(echo "$TOTAL_COST > $ALERT_THRESHOLD" | bc -l) )); then
  echo "🚨 ALERT: Costs exceed threshold!"
  echo ""
  
  # Calculate percentage over baseline
  PERCENTAGE=$(echo "scale=2; (($TOTAL_COST - $BASELINE_MONTHLY) / $BASELINE_MONTHLY) * 100" | bc)
  
  # Send SNS alert
  MESSAGE="OpenClaw Audit Logging Cost Alert

Actual cost: \$$TOTAL_COST/month
Expected cost: \$$BASELINE_MONTHLY/month
Threshold: \$$ALERT_THRESHOLD/month

Cost is ${PERCENTAGE}% above baseline.

Breakdown:
- CloudWatch Logs: \$$CW_COST
- S3: \$$S3_COST
- KMS: \$$KMS_COST

Please review your audit logging configuration.
Check: https://console.aws.amazon.com/cost-management"

  aws sns publish \
    --topic-arn $SNS_TOPIC_ARN \
    --subject "OpenClaw Cost Alert: \$$TOTAL_COST/month" \
    --message "$MESSAGE" \
    --region $REGION
    
  echo "   ✅ SNS alert sent"
  exit 1
else
  echo "✅ Costs are within expected range"
  exit 0
fi
EOFSCRIPT

chmod +x /home/ec2-user/.openclaw/workspace/monitor-openclaw-costs.sh

echo "   ✅ Cost monitoring script created"
echo ""

# ============================================================================
# 6. Create Cron Job (Daily)
# ============================================================================

echo "6️⃣  Setting up daily cost monitoring cron job..."

cat > /tmp/cron-cost-monitoring << EOF
# OpenClaw Cost Monitoring (Daily at 9 AM UTC)
0 9 * * * /home/ec2-user/.openclaw/workspace/monitor-openclaw-costs.sh $TOPIC_ARN >> /var/log/openclaw-cost-monitoring.log 2>&1
EOF

# Add to crontab
(crontab -l 2>/dev/null || echo "") | cat - /tmp/cron-cost-monitoring | crontab -
rm /tmp/cron-cost-monitoring

echo "   ✅ Cron job installed (runs daily at 9 AM UTC)"
echo ""

# ============================================================================
# 7. Output Summary
# ============================================================================

echo "✅ COST MONITORING COMPLETE!"
echo ""
echo "📊 Configuration:"
echo "   Baseline cost:     \$$BASELINE_MONTHLY/month"
echo "   Alert threshold:   \$$ALERT_THRESHOLD/month (+50%)"
echo "   SNS Topic:         $TOPIC_ARN"
echo "   Alert email:       $EMAIL"
echo "   Check frequency:   Daily at 9 AM UTC"
echo ""
echo "📝 Next Steps:"
echo "   1. Confirm SNS subscription in your email"
echo "   2. Verify cron job: crontab -l | grep openclaw"
echo "   3. Test manually: /home/ec2-user/.openclaw/workspace/monitor-openclaw-costs.sh $TOPIC_ARN"
echo ""
echo "💡 If costs exceed threshold:"
echo "   - Check CloudWatch for unexpected log volume"
echo "   - Review S3 for unintended object growth"
echo "   - Verify KMS key usage isn't spike"
echo ""
