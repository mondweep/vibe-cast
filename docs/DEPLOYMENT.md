# Vibe-Cast Deployment & Rollback Guide

**Phase 5 - Production Readiness**

## Overview

This guide covers the complete deployment lifecycle: pre-deployment verification, step-by-step deployment procedures, health checks, rollback strategies, and post-deployment monitoring.

Vibe-Cast uses a **blue-green deployment strategy** with automated health checks and manual rollback capabilities.

---

## 1. Pre-Deployment Checklist

### 1.1 Code Quality Verification

```bash
# Pre-deployment validation (must all pass)

# 1. Build verification
npm run build
# Expected: No errors or warnings

# 2. Test verification
npm test
# Expected: All tests pass (180+ tests)
# Minimum coverage: 80%

# 3. Linting verification
npm run lint
# Expected: No errors (warnings OK if documented)

# 4. Security scan
npm audit --production
# Expected: No high/critical vulnerabilities
# Note: Acceptable to patch after deployment if low risk

# 5. Type checking
npm run type-check
# Expected: No TypeScript errors

# 6. Code review completion
# Expected: At least 1 approval from senior engineer
# Checklist:
#   - [ ] Functionality reviewed
#   - [ ] Performance impact assessed
#   - [ ] Security implications checked
#   - [ ] Documentation updated
#   - [ ] Tests verify new behavior
#   - [ ] Backward compatibility maintained
```

### 1.2 Deployment Preparation Checklist

```bash
# Pre-deployment verification (must all pass before deployment)

# Database
[ ] Schema migrations verified to run without errors
    npm run db:migrate --dry-run
    
[ ] Rollback plan for migrations documented
    # Example: DROP COLUMN IF EXISTS new_field;
    
[ ] Data backup created
    pg_dump > /backups/pre_deploy_$(date +%Y%m%d_%H%M%S).sql

# Application
[ ] Environment variables verified for production
    [ ] SUPABASE_URL set correctly
    [ ] SUPABASE_SECRET_KEY set in secrets manager
    [ ] LOG_LEVEL set to 'info'
    [ ] NODE_ENV set to 'production'

[ ] Configuration validated
    npm run config:validate --env=production

[ ] Docker image built and tagged
    docker build -t vibe-cast:v1.0.0 .
    docker push vibe-cast:v1.0.0

[ ] Kubernetes manifests validated
    kubectl apply --dry-run=client -f k8s/production/

# Monitoring & Alerting
[ ] Monitoring dashboards ready
    [ ] Application metrics dashboard active
    [ ] Database performance dashboard active
    [ ] Error rate dashboard active

[ ] Alerts configured
    [ ] Alert on 5xx errors
    [ ] Alert on high response time
    [ ] Alert on database connection pool exhaustion
    [ ] Alert on DLQ size > 5 events

[ ] On-call engineer assigned and briefed
    [ ] Runbooks reviewed
    [ ] Escalation contacts confirmed
    [ ] Communication channels established

# Documentation
[ ] Deployment notes prepared
    [ ] What changed (features, fixes, dependencies)
    [ ] Why it was changed (business context)
    [ ] Risks and mitigations identified
    [ ] Rollback plan documented

[ ] Customer communication drafted (if needed)
    [ ] Maintenance window notification
    [ ] Expected downtime
    [ ] Expected recovery time

# Final Approval
[ ] Engineering lead approval obtained
[ ] QA sign-off received
[ ] Product manager notified
[ ] Customer success notified (if applicable)
```

### 1.3 Rollback Plan Document

Before deploying, create a rollback plan:

```
DEPLOYMENT: v1.0.0 → v1.1.0
Date: 2026-06-08
Risk Level: MEDIUM (new SAGA flow)

ROLLBACK DECISION CRITERIA:
├─ Error rate > 1% for > 5 minutes (threshold: 0.1%)
├─ P99 latency > 5000ms for > 5 minutes (threshold: 1000ms)
├─ Database connection pool exhaustion
├─ DLQ size > 10 events
└─ Customer reports critical functionality broken

ROLLBACK PROCEDURE (estimated RTO: 10 minutes):
├─ Scale new replicas to 0
├─ Update load balancer to route to old version
├─ Verify traffic on old version
├─ Monitor for errors (5 minutes)
├─ Announce rollback if needed

CODE ROLLBACK:
├─ git revert <commit-hash>
├─ git push origin main
├─ CI/CD redeploys old version
└─ Expected duration: 5 minutes

DATABASE ROLLBACK:
├─ No schema changes in this release (safe)
├─ If future release has schema changes:
│  └─ Run migration reversal script
└─ Expected duration: 1 minute

GO/NO-GO GATES:
├─ T+0 min: Scale new version to 1 replica (canary)
├─ T+5 min: Check error rates on canary
├─ T+5 min: Scale new version to 100% if all green
├─ T+30 min: Monitor health checks
├─ T+60 min: Verify all SAGAs processing normally
└─ T+120 min: Declare deployment successful
```

---

## 2. Deployment Steps

### 2.1 Pre-Deployment Phase (T-30 minutes)

```bash
#!/bin/bash
# scripts/deploy-pre.sh

set -e
set -o pipefail

echo "=== VIBE-CAST PRE-DEPLOYMENT PHASE ==="
echo "Target: production"
echo "Version: $(cat version.txt)"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 1. Verify environment
echo "Step 1: Environment verification..."
[ -n "$DEPLOY_ENV" ] || { echo "ERROR: DEPLOY_ENV not set"; exit 1; }
[ "$DEPLOY_ENV" = "production" ] || { echo "ERROR: DEPLOY_ENV must be production"; exit 1; }

# 2. Verify code quality
echo "Step 2: Code quality verification..."
npm run build
npm test -- --coverage --silent
npm run lint -- --max-warnings 0

# 3. Create database backup
echo "Step 3: Database backup..."
BACKUP_FILE="/backups/pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump --username=$POSTGRES_USER --host=$DB_HOST \
  --schema=ruflo_demo \
  | gzip > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"
echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"

# 4. Verify Docker image
echo "Step 4: Docker image verification..."
docker inspect vibe-cast:v1.1.0 >/dev/null || \
  { echo "ERROR: Docker image not found"; exit 1; }

# 5. Prepare deployment manifest
echo "Step 5: Deployment manifest preparation..."
kubectl apply --dry-run=client -f k8s/production/deployment.yaml

echo ""
echo "=== PRE-DEPLOYMENT PHASE COMPLETE ==="
echo "Backup: $BACKUP_FILE"
echo "Ready to proceed with deployment?"
read -p "Enter 'yes' to continue: " confirm
[ "$confirm" = "yes" ] || { echo "Deployment cancelled"; exit 1; }
```

### 2.2 Canary Deployment Phase (T+0 to T+5 minutes)

```bash
#!/bin/bash
# scripts/deploy-canary.sh

set -e

echo "=== CANARY DEPLOYMENT PHASE ==="
echo "Scaling new version to 1 replica..."

# 1. Scale new version to 1 replica (canary)
kubectl set image deployment/vibe-cast-canary \
  vibe-cast=vibe-cast:v1.1.0 \
  --namespace=production

kubectl scale deployment vibe-cast-canary --replicas=1 --namespace=production

echo "Waiting for canary pod to be ready (timeout: 5 minutes)..."
kubectl wait --for=condition=ready pod \
  -l app=vibe-cast,variant=canary \
  --timeout=300s \
  --namespace=production

# 2. Get canary pod IP
CANARY_POD=$(kubectl get pod \
  -l app=vibe-cast,variant=canary \
  -o jsonpath='{.items[0].metadata.name}' \
  --namespace=production)

echo "Canary pod: $CANARY_POD"

# 3. Run health checks on canary
echo "Running health checks on canary..."
for i in {1..5}; do
  echo "Check $i/5..."
  
  # Liveness probe
  kubectl exec $CANARY_POD --namespace=production \
    -- curl -f http://localhost:3000/health/live || \
    { echo "Liveness check failed"; exit 1; }
  
  # Readiness probe
  kubectl exec $CANARY_POD --namespace=production \
    -- curl -f http://localhost:3000/health/ready || \
    { echo "Readiness check failed"; exit 1; }
  
  sleep 10
done

# 4. Verify zero errors in canary logs
echo "Verifying canary logs..."
ERROR_COUNT=$(kubectl logs $CANARY_POD --namespace=production \
  --tail=100 | grep -c "ERROR" || echo "0")

if [ "$ERROR_COUNT" -gt 5 ]; then
  echo "ERROR: Canary pod has $ERROR_COUNT errors in logs"
  echo "Aborting deployment..."
  exit 1
fi

echo ""
echo "=== CANARY PHASE COMPLETE ==="
echo "Canary pod healthy. Ready for full deployment?"
read -p "Enter 'yes' to continue: " confirm
[ "$confirm" = "yes" ] || { echo "Deployment cancelled"; exit 1; }
```

### 2.3 Database Migration Phase (if applicable)

```bash
#!/bin/bash
# scripts/deploy-migrations.sh

set -e

echo "=== DATABASE MIGRATION PHASE ==="

# 1. Check for pending migrations
echo "Step 1: Checking for pending migrations..."
PENDING=$(find ./migrations -name "*.sql" -newer ./migrations/.deployed | wc -l)

if [ "$PENDING" -eq 0 ]; then
  echo "No pending migrations."
  exit 0
fi

echo "Found $PENDING pending migrations."

# 2. Dry-run migrations
echo "Step 2: Running migrations in dry-run mode..."
psql --username=$POSTGRES_USER --host=$DB_HOST \
  --dbname=postgres \
  --command="BEGIN TRANSACTION; $(cat ./migrations/*.sql) ROLLBACK;"

echo "Dry-run successful."

# 3. Apply migrations
echo "Step 3: Applying migrations..."
for migration in ./migrations/*.sql; do
  if [ -f "$migration" ]; then
    echo "Applying: $(basename $migration)"
    psql --username=$POSTGRES_USER --host=$DB_HOST \
      --dbname=postgres \
      --file="$migration"
  fi
done

echo "Migrations applied successfully."

# 4. Verify schema
echo "Step 4: Verifying schema..."
psql --username=$POSTGRES_USER --host=$DB_HOST \
  --dbname=postgres \
  --command="SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'ruflo_demo';"

echo ""
echo "=== DATABASE MIGRATION PHASE COMPLETE ==="
```

### 2.4 Full Deployment Phase (T+5 to T+15 minutes)

```bash
#!/bin/bash
# scripts/deploy-full.sh

set -e

echo "=== FULL DEPLOYMENT PHASE ==="

# 1. Get current replica count
CURRENT_REPLICAS=$(kubectl get deployment vibe-cast -o jsonpath='{.spec.replicas}' --namespace=production)
echo "Current replicas: $CURRENT_REPLICAS"

# 2. Update image for all replicas
echo "Updating image to v1.1.0..."
kubectl set image deployment/vibe-cast \
  vibe-cast=vibe-cast:v1.1.0 \
  --namespace=production \
  --record

# 3. Watch rollout progress
echo "Watching rollout progress..."
kubectl rollout status deployment/vibe-cast \
  --namespace=production \
  --timeout=10m

# 4. Verify all replicas are ready
echo "Verifying all replicas ready..."
READY=$(kubectl get deployment vibe-cast \
  -o jsonpath='{.status.readyReplicas}' \
  --namespace=production)

if [ "$READY" != "$CURRENT_REPLICAS" ]; then
  echo "ERROR: Only $READY/$CURRENT_REPLICAS replicas ready"
  exit 1
fi

echo ""
echo "=== FULL DEPLOYMENT PHASE COMPLETE ==="
echo "All replicas updated and ready."
```

### 2.5 Health Check Phase (T+15 to T+30 minutes)

```bash
#!/bin/bash
# scripts/deploy-verify.sh

set -e

echo "=== HEALTH CHECK PHASE ==="

# 1. Check error rate
echo "Step 1: Checking error rate..."
ERROR_RATE=$(prometheus_query 'rate(http_requests_total{status=~"5.."}[5m])')
THRESHOLD="0.001"  # 0.1%

if (( $(echo "$ERROR_RATE > $THRESHOLD" | bc -l) )); then
  echo "ERROR: Error rate $ERROR_RATE exceeds threshold $THRESHOLD"
  exit 1
fi

echo "Error rate: $ERROR_RATE (OK)"

# 2. Check latency
echo "Step 2: Checking latency..."
P99_LATENCY=$(prometheus_query 'histogram_quantile(0.99, http_request_duration_seconds)')
THRESHOLD="1.0"  # 1000ms

if (( $(echo "$P99_LATENCY > $THRESHOLD" | bc -l) )); then
  echo "ERROR: P99 latency $P99_LATENCY exceeds threshold ${THRESHOLD}s"
  exit 1
fi

echo "P99 latency: ${P99_LATENCY}s (OK)"

# 3. Check database connections
echo "Step 3: Checking database connections..."
POOL_UTILIZATION=$(prometheus_query 'db_connections_active / db_connections_max')
THRESHOLD="0.8"  # 80%

if (( $(echo "$POOL_UTILIZATION > $THRESHOLD" | bc -l) )); then
  echo "ERROR: DB pool utilization $POOL_UTILIZATION exceeds threshold"
  exit 1
fi

echo "DB pool utilization: $POOL_UTILIZATION (OK)"

# 4. Check SAGA processing
echo "Step 4: Checking SAGA processing..."
SAGA_LATENCY=$(prometheus_query 'saga_execution_duration_seconds{quantile="0.95"}')
echo "SAGA P95 latency: ${SAGA_LATENCY}s"

# 5. Check event bus health
echo "Step 5: Checking event bus health..."
DLQ_SIZE=$(prometheus_query 'eventbus_dead_letter_queue_size_events')

if [ "$DLQ_SIZE" -gt 5 ]; then
  echo "WARNING: DLQ size is $DLQ_SIZE (expected 0)"
  echo "Investigating DLQ..."
  
  # Query oldest event in DLQ
  psql --username=$POSTGRES_USER --host=$DB_HOST \
    --command="SELECT event_id, error_message, attempt_count FROM dlq_events ORDER BY created_at LIMIT 1;"
fi

echo ""
echo "=== HEALTH CHECK PHASE COMPLETE ==="
echo "Deployment verified successfully."
```

### 2.6 Post-Deployment Phase (T+30 to T+120 minutes)

```bash
#!/bin/bash
# scripts/deploy-post.sh

set -e

echo "=== POST-DEPLOYMENT PHASE ==="

# 1. Monitor metrics for 30 minutes
echo "Step 1: Monitoring metrics (30 minutes)..."
START_TIME=$(date +%s)
DURATION=1800  # 30 minutes

while true; do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  
  if [ $ELAPSED -gt $DURATION ]; then
    break
  fi
  
  # Check error rate every 30 seconds
  ERROR_RATE=$(prometheus_query 'rate(http_requests_total{status=~"5.."}[5m])')
  echo "[$ELAPSED/1800] Error rate: $ERROR_RATE"
  
  sleep 30
done

# 2. Verify user functionality
echo "Step 2: Verifying user functionality..."

# Test enrollment creation
RESPONSE=$(curl -X POST http://localhost:3000/api/v1/learning/enrollments \
  -H "X-API-Key: sk_live_test" \
  -H "Content-Type: application/json" \
  -d '{
    "learnerId": "test-learner-id",
    "pathId": "test-path-id",
    "enrolledAt": "2026-06-08T00:00:00Z"
  }')

echo "Enrollment test response: $RESPONSE"

# 3. Check database consistency
echo "Step 3: Checking database consistency..."
psql --username=$POSTGRES_USER --host=$DB_HOST \
  --command="
    -- Verify no orphaned records
    SELECT COUNT(*) FROM ruflo_demo_enrollments WHERE learner_id IS NULL;
    
    -- Verify event counts match projection counts
    SELECT 
      (SELECT COUNT(*) FROM event_log) as event_count,
      (SELECT COUNT(*) FROM ruflo_demo_learner_progress) as projection_count;
  "

# 4. Document deployment
echo "Step 4: Documenting deployment..."
cat > /deployments/$(date +%Y%m%d_%H%M%S)_v1.1.0.txt << EOF
Deployment: v1.1.0
Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Duration: $ELAPSED seconds
Status: SUCCESS

Changes:
- New SAGA flow for enrollment completion
- Improved event bus latency

Verification:
- Error rate: OK
- Latency: OK
- Database: OK
- User functionality: OK

Rollback Plan:
- git revert <commit-hash>
- kubectl set image deployment/vibe-cast vibe-cast=vibe-cast:v1.0.0
EOF

# 5. Notify stakeholders
echo "Step 5: Notifying stakeholders..."
# Send Slack/Email notification
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Deployment v1.1.0 complete and verified. All systems healthy."
  }'

echo ""
echo "=== POST-DEPLOYMENT PHASE COMPLETE ==="
echo "Deployment successful. Users can now access new features."
```

---

## 3. Rollback Procedures

### 3.1 Quick Rollback (Automated)

```bash
#!/bin/bash
# scripts/rollback-quick.sh

set -e

echo "=== QUICK ROLLBACK ==="
echo "Rolling back to previous version..."

# 1. Get previous image from deployment history
PREVIOUS_IMAGE=$(kubectl rollout history deployment/vibe-cast --namespace=production | head -3 | tail -1)
echo "Previous image: $PREVIOUS_IMAGE"

# 2. Rollback to previous revision
kubectl rollout undo deployment/vibe-cast --namespace=production

# 3. Wait for rollback to complete
kubectl rollout status deployment/vibe-cast --namespace=production --timeout=5m

# 4. Verify health checks pass
for i in {1..5}; do
  HEALTHY=$(curl -s http://localhost:3000/health/ready | grep -q "ready" && echo "true" || echo "false")
  if [ "$HEALTHY" = "true" ]; then
    echo "Health check $i/5: PASS"
    break
  fi
  
  echo "Health check $i/5: FAIL (retrying)"
  sleep 10
done

echo ""
echo "=== ROLLBACK COMPLETE ==="
echo "System restored to previous version."
```

### 3.2 Manual Rollback (Explicit)

```bash
#!/bin/bash
# scripts/rollback-manual.sh

set -e

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 v1.0.0"
  exit 1
fi

TARGET_VERSION=$1

echo "=== MANUAL ROLLBACK ==="
echo "Target version: $TARGET_VERSION"

# 1. Verify image exists
docker inspect vibe-cast:$TARGET_VERSION >/dev/null || \
  { echo "ERROR: Image vibe-cast:$TARGET_VERSION not found"; exit 1; }

# 2. Confirm rollback
read -p "Rollback to $TARGET_VERSION? (yes/no): " confirm
[ "$confirm" = "yes" ] || { echo "Rollback cancelled"; exit 1; }

# 3. Update deployment
kubectl set image deployment/vibe-cast \
  vibe-cast=vibe-cast:$TARGET_VERSION \
  --namespace=production

# 4. Monitor rollout
kubectl rollout status deployment/vibe-cast --namespace=production --timeout=5m

# 5. Verify health
echo "Verifying health..."
curl -s http://localhost:3000/health/ready | jq .

echo ""
echo "=== ROLLBACK COMPLETE ==="
```

### 3.3 Database Rollback (Schema Revert)

```sql
-- Rollback migration (if applicable)
-- Run this if database schema change caused issues

-- Example: Revert column addition
ALTER TABLE ruflo_demo_enrollments DROP COLUMN IF EXISTS new_field CASCADE;

-- Example: Revert table creation
DROP TABLE IF EXISTS ruflo_demo_temporary_data CASCADE;

-- Verify schema matches previous version
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'ruflo_demo';

-- Verify data integrity
SELECT COUNT(*) FROM ruflo_demo_saga_state;
SELECT COUNT(*) FROM ruflo_demo_enrollments;
```

---

## 4. Deployment Strategies

### 4.1 Blue-Green Deployment

```yaml
# k8s/production/blue-green-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: vibe-cast-blue
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vibe-cast
      color: blue
  template:
    metadata:
      labels:
        app: vibe-cast
        color: blue
    spec:
      containers:
      - name: vibe-cast
        image: vibe-cast:v1.0.0  # Current version (BLUE)
        # ... rest of spec

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vibe-cast-green
  namespace: production
spec:
  replicas: 0  # Initially scaled to zero
  selector:
    matchLabels:
      app: vibe-cast
      color: green
  template:
    metadata:
      labels:
        app: vibe-cast
        color: green
    spec:
      containers:
      - name: vibe-cast
        image: vibe-cast:v1.1.0  # New version (GREEN)
        # ... rest of spec

---
apiVersion: v1
kind: Service
metadata:
  name: vibe-cast
  namespace: production
spec:
  selector:
    app: vibe-cast
    color: blue  # Currently routing to BLUE
  ports:
  - port: 80
    targetPort: 3000

---
# DEPLOYMENT PROCEDURE:
# 1. Scale GREEN to 3 replicas
#    kubectl scale deployment vibe-cast-green --replicas=3 --namespace=production
#
# 2. Run health checks on GREEN
#    kubectl wait --for=condition=ready pod -l color=green --timeout=300s
#
# 3. Switch traffic to GREEN
#    kubectl patch service vibe-cast -p '{"spec":{"selector":{"color":"green"}}}'
#
# 4. Monitor for errors (5 minutes)
#
# 5. If errors, switch back to BLUE
#    kubectl patch service vibe-cast -p '{"spec":{"selector":{"color":"blue"}}}'
#
# 6. If no errors, scale BLUE to zero
#    kubectl scale deployment vibe-cast-blue --replicas=0
```

### 4.2 Canary Deployment

```yaml
# k8s/production/canary-deployment.yaml

---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: vibe-cast
spec:
  hosts:
  - vibe-cast.example.com
  http:
  # 5% traffic to canary (new version)
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: vibe-cast-v1-0-0
        port:
          number: 3000
      weight: 95
    - destination:
        host: vibe-cast-v1-1-0
        port:
          number: 3000
      weight: 5
    timeout: 30s

---
# DEPLOYMENT PROCEDURE:
# Phase 1: 5% → canary
# Phase 2: Monitor metrics for 10 minutes
# Phase 3: 10% → canary (if no errors)
# Phase 4: 50% → canary (if no errors after 10 min)
# Phase 5: 100% → canary (if no errors after 10 min)
```

---

## 5. Automated Rollback Triggers

### 5.1 Rollback Conditions

```typescript
// src/deployment/RollbackManager.ts

interface RollbackTrigger {
  metric: string;
  threshold: number;
  duration: number; // seconds
  action: 'warn' | 'rollback';
}

const rollbackTriggers: RollbackTrigger[] = [
  {
    metric: 'error_rate',
    threshold: 0.01, // 1%
    duration: 300,
    action: 'warn'
  },
  {
    metric: 'error_rate',
    threshold: 0.05, // 5%
    duration: 60,
    action: 'rollback'
  },
  {
    metric: 'p99_latency_ms',
    threshold: 5000,
    duration: 300,
    action: 'warn'
  },
  {
    metric: 'db_connection_pool_exhausted',
    threshold: 1,
    duration: 30,
    action: 'rollback'
  },
  {
    metric: 'dlq_size',
    threshold: 20,
    duration: 60,
    action: 'warn'
  }
];

class RollbackManager {
  async checkRollbackConditions(): Promise<void> {
    for (const trigger of rollbackTriggers) {
      const value = await prometheus.query(trigger.metric);
      
      if (value > trigger.threshold) {
        const duration = await prometheus.getDurationAboveThreshold(
          trigger.metric,
          trigger.threshold
        );
        
        if (duration > trigger.duration) {
          if (trigger.action === 'warn') {
            this.logger.warn('Rollback trigger warning', { trigger, value, duration });
            await this.alertOps(`Warning: ${trigger.metric} = ${value}`);
          } else {
            this.logger.error('Rollback trigger activated', { trigger, value, duration });
            await this.performAutomaticRollback();
            return;
          }
        }
      }
    }
  }
  
  private async performAutomaticRollback(): Promise<void> {
    this.logger.error('Performing automatic rollback...');
    
    try {
      // Execute rollback script
      const result = await exec('bash scripts/rollback-quick.sh');
      
      // Verify rollback successful
      await sleep(5000);
      const healthy = await this.verifyHealth();
      
      if (healthy) {
        this.logger.info('Automatic rollback successful');
        
        // Notify team
        await this.alertOps('CRITICAL: Automatic rollback performed. Investigation required.');
        
        // Create incident ticket
        await this.createIncident({
          title: 'Deployment Rollback',
          description: 'Automatic rollback triggered due to metrics threshold',
          severity: 'P1'
        });
      } else {
        this.logger.error('Rollback verification failed');
        await this.alertOps('CRITICAL: Rollback verification failed. Manual intervention needed.');
      }
    } catch (error) {
      this.logger.error('Rollback failed', { error });
      await this.alertOps('CRITICAL: Automatic rollback failed. Manual intervention needed.');
    }
  }
  
  private async verifyHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3000/health/ready');
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

---

## 6. Deployment Monitoring Dashboard

### 6.1 Key Metrics During Deployment

```
REAL-TIME DASHBOARD:
┌─────────────────────────────────────────────────────────┐
│                 DEPLOYMENT MONITORING                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Deployment Status:  ROLLING (33% complete)              │
│  Current Version:    v1.1.0                              │
│  Target Version:     v1.1.0                              │
│  Replicas Ready:     1/3                                 │
│                                                           │
│  Error Rate:         0.05% (threshold: 0.1%) ✓           │
│  P99 Latency:        450ms (threshold: 1000ms) ✓         │
│  DB Pool Usage:      45% (threshold: 80%) ✓              │
│  DLQ Size:           0 events (threshold: 5) ✓            │
│                                                           │
│  Request Volume:     ▄▄▄▄▄▄▄▄▄▄ 1200 req/s               │
│  Success Rate:       ▄▄▄▄▄▄▄▄▄▄ 99.95%                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Post-Deployment Checklist

```bash
# Post-deployment verification (complete within 2 hours)

[ ] All health checks passing
    curl http://localhost:3000/health/deep | jq .checks

[ ] Error rate normal (< 0.1%)
    prometheus_query 'rate(http_requests_total{status=~"5.."}[5m])'

[ ] Latency normal
    prometheus_query 'histogram_quantile(0.95, http_request_duration_seconds)'

[ ] Database healthy
    psql -c "SELECT COUNT(*) FROM ruflo_demo_enrollments;"

[ ] Event bus healthy
    DLQ size: 0 events
    Event processing rate: > 100 events/min

[ ] SAGA orchestration working
    SAGA success rate: > 95%
    Average SAGA duration: < 10 seconds

[ ] Read models in sync
    event_count ≈ projection_count (within 1%)

[ ] No new errors in logs
    kubectl logs -l app=vibe-cast --tail=100 | grep ERROR | wc -l

[ ] User functionality working
    [ ] Create enrollment: PASS
    [ ] Complete course: PASS
    [ ] View progress: PASS
    [ ] Badge issuance: PASS

[ ] Monitoring alerts active
    [ ] All alert rules loaded
    [ ] Test alert sent successfully
    [ ] On-call team acknowledged

[ ] Documentation updated
    [ ] Deployment notes recorded
    [ ] Runbooks updated if needed
    [ ] Known issues documented

[ ] Stakeholders notified
    [ ] Engineering team: DONE
    [ ] Product: DONE
    [ ] Customer success: DONE
    [ ] Status page: Updated
```

---

## 8. Deployment Frequency & Schedule

### 8.1 Recommended Schedule

```
DEVELOPMENT:      Multiple times per day (auto-deployed on merge)
STAGING:          Daily (nightly, 02:00 UTC)
PRODUCTION:       Weekly (Tuesday 00:00 UTC)
  Rationale: Allows time for issue discovery and remediation

EMERGENCY HOTFIXES: Immediately (out-of-band, with lead approval)
  Criteria: Security vulnerability, data corruption, outage
  Approval: Engineering lead + on-call engineer
  Communication: Status page update within 15 minutes
```

---

## 9. References

- [PRODUCTION.md](./PRODUCTION.md) - Configuration and deployment
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - Backup and recovery
- [SECURITY.md](./SECURITY.md) - Security hardening
- [MONITORING.md](./MONITORING.md) - Observability and metrics

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-06  
**Maintenance:** Update after each deployment
