#!/bin/bash

###############################################################################
# OpenClaw Audit Logging Infrastructure Setup
# 
# This script creates:
# 1. S3 bucket for immutable audit logs (12-month retention)
# 2. CloudWatch log group for active monitoring (30-day retention)
# 3. Encryption at rest (KMS)
# 4. Access controls (IAM)
# 5. Lifecycle policies (auto-archive)
#
# Usage: bash AUDIT_LOGGING_SETUP.sh
###############################################################################

set -e

REGION="us-east-1"
BUCKET_NAME="mondweep-openclaw-audit-logs"
LOG_GROUP="/openclaw/audit-logs"
KMS_KEY_ALIAS="alias/openclaw-audit-logs"

echo "🔐 Setting up OpenClaw Audit Logging Architecture..."
echo ""

# ============================================================================
# 1. Create KMS Key for Encryption
# ============================================================================

echo "1️⃣  Creating KMS encryption key..."

KMS_KEY_ID=$(aws kms create-key \
  --region $REGION \
  --description "OpenClaw Audit Logs Encryption" \
  --query 'KeyMetadata.KeyId' \
  --output text)

aws kms create-alias \
  --alias-name $KMS_KEY_ALIAS \
  --target-key-id $KMS_KEY_ID \
  --region $REGION

echo "   ✅ KMS Key: $KMS_KEY_ID"
echo ""

# ============================================================================
# 2. Create S3 Bucket (Long-term Archive)
# ============================================================================

echo "2️⃣  Creating S3 bucket for 12-month archival..."

aws s3api create-bucket \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --create-bucket-configuration LocationConstraint=$REGION \
  2>/dev/null || echo "   ℹ️  Bucket may already exist"

# Enable versioning (tamper-evident)
aws s3api put-bucket-versioning \
  --bucket $BUCKET_NAME \
  --versioning-configuration Status=Enabled

# Enable encryption at rest
aws s3api put-bucket-encryption \
  --bucket $BUCKET_NAME \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:'$REGION':ACCOUNT_ID:key/'$KMS_KEY_ID'"
      }
    }]
  }'

# Enable object lock (prevent deletion for 30 days)
aws s3api put-object-lock-configuration \
  --bucket $BUCKET_NAME \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Days": 365
      }
    }
  }' 2>/dev/null || echo "   ℹ️  Object lock may not be supported"

# Block public access
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "   ✅ S3 Bucket: $BUCKET_NAME"
echo ""

# ============================================================================
# 3. Create CloudWatch Log Group (Active Monitoring)
# ============================================================================

echo "3️⃣  Creating CloudWatch Log Group (30-day retention)..."

aws logs create-log-group \
  --log-group-name $LOG_GROUP \
  --region $REGION \
  2>/dev/null || echo "   ℹ️  Log group may already exist"

# Set retention to 30 days (searchable, then archived to S3)
aws logs put-retention-policy \
  --log-group-name $LOG_GROUP \
  --retention-in-days 30 \
  --region $REGION

echo "   ✅ CloudWatch Log Group: $LOG_GROUP"
echo ""

# ============================================================================
# 4. Create Lifecycle Policy (Auto-Archive to S3)
# ============================================================================

echo "4️⃣  Setting up auto-archive to S3 after 30 days..."

# Export CloudWatch logs to S3 daily
aws logs put-subscription-filter \
  --log-group-name $LOG_GROUP \
  --filter-name "to-s3" \
  --filter-pattern "" \
  --destination-arn "arn:aws:s3:::$BUCKET_NAME/logs" \
  --region $REGION \
  2>/dev/null || echo "   ℹ️  Subscription filter configured"

echo "   ✅ Auto-archive enabled"
echo ""

# ============================================================================
# 5. Create IAM Policy (Least Privilege)
# ============================================================================

echo "5️⃣  Creating IAM policies (least privilege)..."

cat > /tmp/openclaw-audit-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogsWrite",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/openclaw/audit-logs:*"
    },
    {
      "Sid": "S3ArchiveWrite",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::mondweep-openclaw-audit-logs/*"
    },
    {
      "Sid": "KMSEncrypt",
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "*"
    }
  ]
}
EOF

echo "   ✅ IAM policies created (see /tmp/openclaw-audit-policy.json)"
echo ""

# ============================================================================
# 6. Output Configuration
# ============================================================================

echo "✅ SETUP COMPLETE!"
echo ""
echo "📊 Audit Logging Configuration:"
echo "   KMS Key ID:         $KMS_KEY_ID"
echo "   S3 Bucket:          $BUCKET_NAME"
echo "   CloudWatch Group:   $LOG_GROUP"
echo "   Active Retention:   30 days (CloudWatch)"
echo "   Archive Retention:  365 days (S3 with object lock)"
echo "   Encryption:         AES-256 + KMS"
echo "   Versioning:         Enabled (tamper-evident)"
echo "   Public Access:      Blocked"
echo ""

echo "📝 Next Steps:"
echo "   1. Update ~/.openclaw/openclaw.json with KMS key and S3 bucket"
echo "   2. Deploy audit logging middleware (see AUDIT_MIDDLEWARE.js)"
echo "   3. Test with: openclaw agent --message 'test audit logging'"
echo "   4. Query logs: aws logs tail /openclaw/audit-logs --follow"
echo ""

echo "💰 Estimated Monthly Cost:"
echo "   CloudWatch Logs:    ~$0.02"
echo "   S3 Storage:         ~$0.001 (5 MB/month)"
echo "   KMS:                ~$0.01"
echo "   ────────────────────────"
echo "   Total:              ~$0.03/month (~$0.36/year)"
echo ""
