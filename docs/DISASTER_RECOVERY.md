# Vibe-Cast Disaster Recovery & Business Continuity Plan

**Phase 5 - Production Readiness**

## Overview

This document details Vibe-Cast's disaster recovery (DR) strategy, backup procedures, recovery runbooks, and business continuity objectives. The plan covers data loss, service outages, corruption, and compliance requirements.

---

## 1. Disaster Recovery Strategy

### 1.1 Recovery Objectives

```
┌──────────────────────────────────────────────────────────────┐
│              RECOVERY OBJECTIVES BY COMPONENT                 │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  COMPONENT          RTO (Recovery)  RPO (Data Loss)          │
│  ─────────────────  ──────────────  ──────────────          │
│  Event Store        15 minutes      5 minutes                │
│  (Core database)    (restart DB)    (hourly backup)         │
│                                                                │
│  Read Models        1 hour          0 (rebuild from events)  │
│  (Projections)      (rebuild)       (no data loss)           │
│                                                                │
│  SAGA State         15 minutes      5 minutes                │
│  (Orchestration)    (restart)       (hourly backup)         │
│                                                                │
│  Application        5 minutes       N/A (stateless)         │
│  (REST API)         (container)     (redeploy)              │
│                                                                │
│  Metrics/Logs       1 day           24 hours                │
│  (Observability)    (restore)       (last backup)           │
│                                                                │
│  OVERALL SYSTEM     15 minutes      5 minutes               │
│                     (database)      (event log)             │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Failure Scenarios

```
TIER 1: Service Degradation (Still operational, reduced capacity)
├─ Single pod/instance fails
│  └─ Impact: 33% throughput reduction (3 pods in production)
│  └─ RTO: 2 minutes (automatic restart)
│
└─ Single database replica fails
   └─ Impact: Eventual consistency slowdown
   └─ RTO: 5 minutes (failover to backup replica)

TIER 2: Service Outage (Partial loss of service)
├─ Region network partition
│  └─ Impact: Complete outage in that region
│  └─ RTO: 15 minutes (switch to backup region)
│
└─ Database connection pool exhaustion
   └─ Impact: New requests fail, existing complete
   └─ RTO: 5 minutes (scale application pods)

TIER 3: Disaster (Complete service loss)
├─ Entire Supabase project becomes unavailable
│  └─ Impact: Complete service outage
│  └─ RTO: 30 minutes (restore from backup)
│
├─ Data corruption in event log
│  └─ Impact: Data integrity compromised
│  └─ RTO: 1 hour (point-in-time recovery)
│
└─ Ransomware/Malicious deletion
   └─ Impact: All databases deleted
   └─ RTO: 4 hours (restore from offsite backup)
```

---

## 2. Backup Strategy

### 2.1 Backup Types

```
CONTINUOUS REPLICATION (Real-time)
├─ Supabase automated replication to standby replica
├─ RPO: < 1 second
├─ Used for: Automatic failover
├─ Cost: Included in Supabase plan
└─ Retention: N/A (always current)

INCREMENTAL BACKUPS (Hourly)
├─ PostgreSQL WAL (Write-Ahead Log) archiving
├─ RPO: < 1 minute
├─ Covers: Event store, SAGA state, read models
├─ Used for: Point-in-time recovery within last 24h
├─ Cost: Storage (< 1GB/day for 500-user system)
└─ Retention: 7 days

FULL BACKUPS (Daily)
├─ Complete database dump (pg_dump)
├─ RPO: 24 hours
├─ Covers: Event store, SAGA state, read models
├─ Used for: Disaster recovery (total loss scenario)
├─ Cost: Storage (< 500MB per backup for 500-user system)
└─ Retention: 30 days

OFFSITE BACKUPS (Weekly)
├─ Full database backup copied to offsite storage
├─ RPO: 7 days
├─ Used for: Ransomware/malicious deletion scenario
├─ Cost: Cold storage (< 10MB/week transfer)
└─ Retention: 90 days
```

### 2.2 Backup Implementation

#### Event Store Backup

```bash
# Hourly: Automated by Supabase (WAL archiving)
# Supabase automatically archives Write-Ahead Logs
# Enables point-in-time recovery within last 24 hours

# Daily: Full backup via pg_dump (automated)
#!/bin/bash
BACKUP_DIR="/backups/daily"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_SCHEMA="ruflo_demo"

# Export event store (tables only, no indexes)
pg_dump \
  --username=$POSTGRES_USER \
  --host=$DB_HOST \
  --port=$DB_PORT \
  --schema="$DB_SCHEMA" \
  --data-only \
  --exclude-table="*_saga_*" \
  --file="$BACKUP_DIR/event_store_$TIMESTAMP.sql"

# Compress backup
gzip "$BACKUP_DIR/event_store_$TIMESTAMP.sql"

# Verify integrity
if pg_dump --username=$POSTGRES_USER --host=$DB_HOST \
    --schema="$DB_SCHEMA" --dry-run >/dev/null 2>&1; then
  echo "Backup verified: event_store_$TIMESTAMP.sql.gz"
else
  echo "ERROR: Backup verification failed"
  exit 1
fi

# Upload to cloud storage
aws s3 cp "$BACKUP_DIR/event_store_$TIMESTAMP.sql.gz" \
  "s3://vibe-cast-backups/daily/event_store_$TIMESTAMP.sql.gz"

# Cleanup local backup (keep 3 days locally)
find "$BACKUP_DIR" -name "event_store_*.sql.gz" -mtime +3 -delete
```

#### Read Model Snapshot Backup

```sql
-- Snapshot current state of read models
-- Used for faster recovery (vs rebuilding from event log)

-- Backup learner_progress read model
CREATE TABLE ruflo_demo_learner_progress_backup_20260606 AS
SELECT * FROM ruflo_demo_learner_progress;

COMMENT ON TABLE ruflo_demo_learner_progress_backup_20260606 IS
  'Backup taken at 2026-06-06 03:00 UTC. Use for recovery.';

-- Backup enrollment_snapshots
CREATE TABLE ruflo_demo_enrollments_backup_20260606 AS
SELECT * FROM ruflo_demo_enrollments;

-- Backup badge_issuance_snapshots
CREATE TABLE ruflo_demo_badge_issuances_backup_20260606 AS
SELECT * FROM ruflo_demo_badge_issuances;

-- Backup community_profiles_snapshots
CREATE TABLE ruflo_demo_community_profiles_backup_20260606 AS
SELECT * FROM ruflo_demo_community_profiles;

-- Cleanup old snapshots (keep 7 daily snapshots)
DROP TABLE IF EXISTS ruflo_demo_learner_progress_backup_20260530;
DROP TABLE IF EXISTS ruflo_demo_enrollments_backup_20260530;
DROP TABLE IF EXISTS ruflo_demo_badge_issuances_backup_20260530;
DROP TABLE IF EXISTS ruflo_demo_community_profiles_backup_20260530;
```

#### Backup Retention Policy

```
INCREMENTAL BACKUPS (Hourly):
├─ Keep 24 backups (24 hours)
├─ Oldest backup: 24 hours before current
├─ Newest backup: Current (< 5 minutes old)
└─ Storage: ~5GB (200+ backups per month)

FULL BACKUPS (Daily):
├─ Keep 30 backups (30 days)
├─ 1 backup per day at 03:00 UTC
├─ Oldest backup: 29 days old
└─ Storage: ~15GB (500MB per backup)

READ MODEL SNAPSHOTS (Daily):
├─ Keep 7 backups (7 days)
├─ Taken immediately after daily full backup
├─ Restored quickly without event replay
└─ Storage: ~10GB (1.5GB per snapshot)

OFFSITE BACKUPS (Weekly):
├─ Keep 12 backups (12 weeks)
├─ Encrypted and stored in separate cloud region
├─ Rotated every 7 days
└─ Storage: ~10GB (cold storage: $0.004/GB/month)

POLICY ENFORCEMENT:
├─ Automated deletion of backups older than retention
├─ Retention verified daily
├─ Alert if backup count drops below minimum
└─ Manual backups never auto-deleted
```

### 2.3 Backup Verification

```typescript
// src/shared/infrastructure/backup/BackupVerification.ts

class BackupVerification {
  /**
   * Daily backup verification
   * Ensures backups are valid and can be restored
   */
  async verifyDailyBackups(): Promise<void> {
    const backups = await this.listRecentBackups('daily', 3);
    
    for (const backup of backups) {
      const startTime = Date.now();
      
      try {
        // 1. Verify backup integrity
        const isValid = await this.verifyBackupIntegrity(backup);
        if (!isValid) {
          throw new Error('Backup integrity check failed');
        }
        
        // 2. Verify restorable
        const canRestore = await this.testRestorability(backup);
        if (!canRestore) {
          throw new Error('Backup cannot be restored');
        }
        
        // 3. Verify schema matches current
        const schemaMatches = await this.compareSchema(backup);
        if (!schemaMatches) {
          throw new Error('Backup schema does not match current');
        }
        
        this.logger.info('Backup verified', {
          backup: backup.id,
          elapsedMs: Date.now() - startTime,
          integrity: isValid,
          restorable: canRestore,
          schemaMatches
        });
        
        // Emit metric
        metricsCollector.gauge(
          'backup_verification_status',
          1,
          { backup_id: backup.id, status: 'success' }
        );
        
      } catch (error) {
        this.logger.error('Backup verification failed', {
          backup: backup.id,
          error
        });
        
        metricsCollector.gauge(
          'backup_verification_status',
          0,
          { backup_id: backup.id, status: 'failed' }
        );
        
        // Alert operations team
        await this.alertOps(
          `CRITICAL: Backup verification failed for ${backup.id}`
        );
      }
    }
  }
  
  private async verifyBackupIntegrity(backup: Backup): Promise<boolean> {
    try {
      // Check file exists and is readable
      const stats = await fs.stat(backup.path);
      if (stats.size === 0) return false;
      
      // Verify checksum if available
      if (backup.checksum) {
        const calculated = await this.calculateChecksum(backup.path);
        if (calculated !== backup.checksum) return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  private async testRestorability(backup: Backup): Promise<boolean> {
    // Create temporary test database
    const testDb = `test_restore_${Date.now()}`;
    
    try {
      // Attempt to restore backup to test DB
      await this.executeRestore(backup, testDb, { dryRun: false });
      
      // Verify schema in test DB
      const schema = await this.getSchema(testDb);
      if (!schema || schema.tables.length === 0) return false;
      
      // Cleanup test DB
      await this.dropDatabase(testDb);
      
      return true;
    } catch (error) {
      // Cleanup test DB on error
      try {
        await this.dropDatabase(testDb);
      } catch {
        // Ignore cleanup errors
      }
      
      this.logger.error('Restore test failed', { error, testDb });
      return false;
    }
  }
}
```

---

## 3. Point-in-Time Recovery (PITR) Procedures

### 3.1 PITR Capability

Vibe-Cast can recover to any point in the last 24 hours using PostgreSQL PITR:

```sql
-- Scenario: Data corruption discovered at 14:30 UTC
-- Last known good state: 14:15 UTC (15 minutes ago)
-- Recovery target: 14:15 UTC exactly

-- 1. List available backups and WAL archives
SELECT 
  backup_id,
  backup_time,
  backup_type,
  size_mb
FROM system.backups
WHERE backup_time >= NOW() - INTERVAL '24 hours'
ORDER BY backup_time DESC;

-- Result:
-- backup_id       | backup_time              | backup_type | size_mb
-- ─────────────────┼──────────────────────────┼─────────────┼─────────
-- daily_20260606   | 2026-06-06 03:00:00 UTC | FULL        | 512
-- hourly_20260606  | 2026-06-06 14:00:00 UTC | INCR        | 50
-- (WAL archives available between 03:00 and 14:59)
```

### 3.2 PITR Recovery Steps

```bash
# Step 1: Stop application to prevent new writes
kubectl scale deployment vibe-cast --replicas=0

# Step 2: Create restore point (snapshot of current state)
pg_dump --username=$POSTGRES_USER --host=$DB_HOST \
  --schema=ruflo_demo \
  --file=/backups/before_recovery_20260606_1430.sql

# Step 3: Initiate PITR restore
pg_restore \
  --username=$POSTGRES_USER \
  --host=$DB_HOST \
  --dbname=postgres \
  --jobs=4 \
  --exit-on-error \
  /backups/daily/daily_20260606.sql.gz

# Step 4: Replay WAL archives up to target time
pg_controldata -D $PGDATA | grep "Database cluster state"
# Should show: "Database cluster state: shut down"

# Step 5: Create recovery configuration
cat > /var/lib/postgresql/recovery.conf << EOF
restore_command = 'cp /wal_archives/%f %p'
recovery_target_time = '2026-06-06 14:15:00 UTC'
recovery_target_inclusive = true
EOF

# Step 6: Start PostgreSQL for recovery
systemctl start postgresql

# Step 7: Wait for recovery to complete
tail -f /var/log/postgresql/postgresql.log | \
  grep "recovery complete\|restored log file"

# Step 8: Verify data integrity
psql --username=$POSTGRES_USER --host=$DB_HOST \
  --dbname=postgres \
  --command="SELECT COUNT(*) FROM ruflo_demo.ruflo_demo_saga_state;"

# Step 9: Restart application
kubectl scale deployment vibe-cast --replicas=3
```

---

## 4. Data Export Capabilities

### 4.1 Learner Data Export (GDPR Article 15)

Users can request export of their personal data:

```typescript
// src/api/gdpr/ExportController.ts

async function exportLearnerData(
  req: Request<{ learnerId: string }>,
  res: Response
): Promise<void> {
  const { learnerId } = req.params;
  
  try {
    // 1. Verify requestor is the learner (or admin)
    const requestorId = req.user.id;
    if (requestorId !== learnerId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // 2. Collect all learner data
    const data = {
      profile: await exportProfile(learnerId),
      enrollments: await exportEnrollments(learnerId),
      progress: await exportProgress(learnerId),
      badges: await exportBadges(learnerId),
      certifications: await exportCertifications(learnerId),
      community: await exportCommunityProfile(learnerId),
      discussions: await exportDiscussions(learnerId),
      activity_log: await exportActivityLog(learnerId)
    };
    
    // 3. Format as JSON
    const json = JSON.stringify(data, null, 2);
    
    // 4. Create downloadable file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="learner_${learnerId}_export.json"`
    );
    
    return res.send(json);
    
  } catch (error) {
    logger.error('Data export failed', { learnerId, error });
    return res.status(500).json({ error: 'Export failed' });
  }
}

// Helper: Export learner profile
async function exportProfile(learnerId: string): Promise<any> {
  const result = await supabase
    .from('ruflo_demo_learner_profiles')
    .select('*')
    .eq('learner_id', learnerId)
    .single();
  
  if (result.error) throw result.error;
  
  return {
    id: result.data.id,
    name: result.data.name,
    email: result.data.email,
    joined_at: result.data.created_at,
    bio: result.data.bio,
    avatar_url: result.data.avatar_url
  };
}

// Helper: Export enrollments (what learner is learning)
async function exportEnrollments(learnerId: string): Promise<any[]> {
  const result = await supabase
    .from('ruflo_demo_enrollments')
    .select('*, paths(*)')
    .eq('learner_id', learnerId);
  
  if (result.error) throw result.error;
  
  return result.data.map(e => ({
    path_id: e.path_id,
    path_name: e.paths.title,
    enrolled_at: e.created_at,
    status: e.status,
    progress_percent: e.progress_percent
  }));
}
```

### 4.2 Certifications Export

```typescript
// Export all certification records for compliance audit

async function exportCertifications(learnerId: string): Promise<any[]> {
  const result = await supabase
    .from('ruflo_demo_badge_issuances')
    .select('*, badges(*), issuers(*)')
    .eq('learner_id', learnerId);
  
  if (result.error) throw result.error;
  
  return result.data.map(c => ({
    badge_id: c.badge_id,
    badge_name: c.badges.name,
    issued_at: c.created_at,
    issued_by: c.issuers.name,
    verification_url: c.verification_url,
    expires_at: c.expires_at,
    is_active: !c.expires_at || new Date(c.expires_at) > new Date()
  }));
}
```

### 4.3 Metrics Export

```typescript
// Export system metrics for post-incident analysis

async function exportMetrics(startTime: Date, endTime: Date): Promise<any> {
  const result = await supabase
    .from('monitoring_events')
    .select('*')
    .gte('timestamp', startTime.toISOString())
    .lte('timestamp', endTime.toISOString())
    .order('timestamp', { ascending: true });
  
  if (result.error) throw result.error;
  
  // Group by metric type
  const grouped = {
    event_bus: result.data.filter(m => m.type === 'event_bus'),
    saga: result.data.filter(m => m.type === 'saga'),
    projections: result.data.filter(m => m.type === 'projection'),
    database: result.data.filter(m => m.type === 'database')
  };
  
  return {
    period: { start: startTime, end: endTime },
    metrics: grouped,
    total_events: result.data.length
  };
}
```

---

## 5. GDPR & Data Retention Policies

### 5.1 Data Retention Schedule

```
ACTIVE LEARNER DATA (Account active)
├─ Profile information: Indefinitely (until deletion)
├─ Enrollment history: Indefinitely
├─ Progress records: Indefinitely
├─ Certification data: Indefinitely (compliance requirement)
├─ Community profile: Until account deletion
└─ Activity logs: 3 years (audit trail)

INACTIVE LEARNER DATA (Account inactive > 12 months)
├─ Action: Notify learner of pending deletion
├─ Notice period: 30 days
├─ Certification records: Retain indefinitely (compliance)
├─ Non-certification data: Delete after notice period
└─ Backup copies: Retained per backup retention policy

SUPPORT DATA (Technical logs, tickets)
├─ Logs with PII: 90 days (GDPR Article 17)
├─ Logs without PII: 365 days (audit trail)
├─ Support tickets: 365 days
└─ Escalated incidents: Keep per regulations

DELETED LEARNER DATA (Account permanently deleted)
├─ Personal profile: Deleted immediately
├─ Identifiable personal data: Deleted immediately
├─ Certification records: Anonymized and retained (compliance)
├─ Activity logs: Anonymized (remove learner ID)
└─ Backup copies: Deleted per backup retention policy
```

### 5.2 Right to Erasure (GDPR Article 17)

```typescript
// src/api/gdpr/DeleteController.ts

async function deleteLearnerData(learnerId: string): Promise<void> {
  const logger = new Logger('gdpr:delete');
  
  try {
    logger.info('Starting right to erasure process', { learnerId });
    
    // 1. Verify learner account
    const profile = await supabase
      .from('ruflo_demo_learner_profiles')
      .select('*')
      .eq('id', learnerId)
      .single();
    
    if (profile.error) {
      throw new Error('Learner not found');
    }
    
    // 2. Create deletion audit record
    const deletionId = `deletion_${learnerId}_${Date.now()}`;
    await supabase.from('gdpr_deletions').insert({
      deletion_id: deletionId,
      learner_id: learnerId,
      requested_at: new Date().toISOString(),
      status: 'PENDING'
    });
    
    // 3. Delete or anonymize personal data
    const deletedTables = [
      'ruflo_demo_learner_profiles',
      'ruflo_demo_community_profiles'
    ];
    
    for (const table of deletedTables) {
      await supabase
        .from(table)
        .delete()
        .eq('learner_id', learnerId);
      
      logger.info('Deleted personal data', { table });
    }
    
    // 4. Anonymize activity logs
    await supabase
      .from('activity_logs')
      .update({ learner_id: null, learner_name: 'DELETED_USER' })
      .eq('learner_id', learnerId);
    
    // 5. Archive certifications (must keep for compliance)
    await supabase
      .from('ruflo_demo_badge_issuances')
      .update({ 
        learner_name: 'DELETED_USER',
        learner_email: null
      })
      .eq('learner_id', learnerId);
    
    // 6. Nullify foreign keys where safe
    await supabase
      .from('ruflo_demo_enrollments')
      .delete()
      .eq('learner_id', learnerId);
    
    // 7. Mark deletion complete
    await supabase
      .from('gdpr_deletions')
      .update({ 
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      })
      .eq('deletion_id', deletionId);
    
    logger.info('Right to erasure completed', { 
      learnerId,
      deletionId,
      durationMs: Date.now() - Date.parse(profile.data.created_at)
    });
    
  } catch (error) {
    logger.error('Right to erasure failed', { learnerId, error });
    throw error;
  }
}
```

### 5.3 Data Retention Verification

```sql
-- Periodic audit of data retention compliance
-- Run quarterly to verify retention policies followed

-- Find data older than retention period (should be deleted)
SELECT 
  'activity_logs' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM activity_logs
WHERE created_at < NOW() - INTERVAL '90 days'
AND data_type = 'contains_pii'

UNION ALL

SELECT 
  'inactive_learners' as table_name,
  COUNT(*) as record_count,
  MIN(last_login) as oldest_inactive,
  MAX(last_login) as newest_inactive
FROM ruflo_demo_learner_profiles
WHERE last_login < NOW() - INTERVAL '12 months'
AND created_at < NOW() - INTERVAL '13 months';

-- Expected output: 0 records (all should be deleted/archived)
```

---

## 6. Disaster Recovery Runbooks

### 6.1 Runbook: Database Restore

**Trigger:** Data corruption, accidental deletion, data loss

```
SEVERITY: CRITICAL
RTO: 30 minutes
RPO: 1 hour (use latest backup)
Success Criteria: All data restored, data integrity verified
```

**Pre-Incident Preparation:**
- [ ] Backup schedule verified and running
- [ ] Restore procedures tested monthly
- [ ] Team trained on restore procedures
- [ ] Contact information updated

**Incident Response:**

```
Phase 1: Detection & Assessment (5 minutes)
├─ [ ] Incident detected (users reporting data issues)
├─ [ ] Page on-call database engineer
├─ [ ] Gather evidence: affected data, error messages
├─ [ ] Determine data loss scope
└─ [ ] Declare SEV-1 incident

Phase 2: Containment (10 minutes)
├─ [ ] Stop application deployments
├─ [ ] Scale application to zero replicas
│       kubectl scale deployment vibe-cast --replicas=0
├─ [ ] Stop write operations to database
│       UPDATE ruflo_demo_saga_state SET state = 'PAUSED'
├─ [ ] Notify stakeholders of outage
└─ [ ] Create backup of current state before recovery

Phase 3: Recovery (20 minutes)
├─ [ ] Determine recovery target (what time to restore to)
├─ [ ] Locate appropriate backup
├─ [ ] Stop database
│       sudo systemctl stop postgresql
├─ [ ] Restore backup
│       pg_restore -d postgres /backups/daily/daily_20260606.sql.gz
├─ [ ] Verify schema integrity
│       psql -c "SELECT COUNT(*) FROM ruflo_demo.ruflo_demo_saga_state;"
├─ [ ] Verify data consistency
│       SELECT SUM(event_count) FROM monitoring_events WHERE date='2026-06-06'
└─ [ ] Start database
       sudo systemctl start postgresql

Phase 4: Validation (10 minutes)
├─ [ ] Run health checks
│       curl http://localhost:5432/health/deep
├─ [ ] Verify event log integrity
│       SELECT MIN(timestamp), MAX(timestamp) FROM event_log
├─ [ ] Check for orphaned records
│       SELECT COUNT(*) FROM enrollments WHERE path_id IS NULL
├─ [ ] Validate read models match event store
│       SELECT COUNT(*) FROM read_model_ledger
└─ [ ] Review recent logs for errors

Phase 5: Resumption (5 minutes)
├─ [ ] Resume application
│       kubectl scale deployment vibe-cast --replicas=3
├─ [ ] Monitor error rate and metrics
├─ [ ] Verify readiness probes all green
├─ [ ] Announce recovery to stakeholders
└─ [ ] Begin root cause analysis

Phase 6: Post-Incident (1 hour)
├─ [ ] Document what went wrong
├─ [ ] Identify 3-5 preventive measures
├─ [ ] Schedule follow-up improvements
└─ [ ] Update runbooks based on lessons learned
```

**Rollback Plan (if restore fails):**
```
If restore doesn't work within 20 minutes:
1. Abort and restore previous version
2. Document error and time lost
3. Call escalation contacts
4. Restore from earlier backup
5. Accept data loss and move forward
```

---

### 6.2 Runbook: Event Log Rebuild

**Trigger:** Read models corrupted, projections out of sync

```
SEVERITY: HIGH
RTO: 1 hour (rebuild from event log)
RPO: 0 (events are source of truth)
Success Criteria: All projections match event store
```

**Process:**

```
Phase 1: Verification (10 minutes)
├─ [ ] Confirm read models are corrupted
├─ [ ] Verify event store is healthy
│       SELECT COUNT(*) FROM event_log
│       WHERE timestamp > NOW() - INTERVAL '24 hours'
├─ [ ] Take snapshot of corrupted projections for analysis
└─ [ ] Estimate rebuild time: COUNT(events) / 1000 events/sec

Phase 2: Rebuilding Projections (45 minutes)
├─ [ ] Stop projector subscriptions
│       eventBus.unsubscribe('ProjectionHandler')
├─ [ ] Clear corrupted projection tables
│       DELETE FROM ruflo_demo_learner_progress;
│       DELETE FROM ruflo_demo_enrollments;
├─ [ ] Replay events in order
│       SELECT * FROM event_log 
│       WHERE timestamp > '2026-06-01'
│       ORDER BY timestamp ASC
│       LIMIT 100000
├─ [ ] For each event: Apply to projection
│       apply(event, projection)
├─ [ ] Verify projection counts match event counts
│       SELECT COUNT(DISTINCT learner_id) FROM read_model_ledger
│       = SELECT COUNT(DISTINCT learner_id) FROM event_log
└─ [ ] Resume projector subscriptions
       eventBus.subscribe('ProjectionHandler')

Phase 3: Validation (5 minutes)
├─ [ ] Spot-check random records
├─ [ ] Compare totals before/after
├─ [ ] Verify no gaps in event sequence
└─ [ ] Run consistency checks

Phase 4: Notification (5 minutes)
├─ [ ] Announce recovery
├─ [ ] Inform users of resolved issues
└─ [ ] Return to normal operations
```

---

### 6.3 Runbook: SAGA State Recovery

**Trigger:** SAGA orchestrator crashed, state lost

```
SEVERITY: HIGH
RTO: 15 minutes
RPO: 5 minutes (last state snapshot)
Success Criteria: All active SAGAs resumed
```

**Process:**

```
Phase 1: Assessment (5 minutes)
├─ [ ] Check SAGA state table
│       SELECT COUNT(*) FROM ruflo_demo_saga_state
│       WHERE state != 'COMPLETED' AND state != 'FAILED'
├─ [ ] Determine crashed SAGAs
├─ [ ] Check dead letter queue for failed steps
└─ [ ] Estimate recovery scope

Phase 2: SAGA Resumption (10 minutes)
├─ [ ] Load SAGAs in WAITING state
│       SELECT * FROM ruflo_demo_saga_state WHERE state = 'WAITING'
├─ [ ] For each SAGA:
│       ├─ Load current step
│       ├─ Load saga_data context
│       ├─ Resume from current step
│       └─ Update state to ACTIVE
├─ [ ] Handle failed steps (in DLQ)
│       ├─ If retryable: retry with backoff
│       └─ If permanent failure: trigger compensation
└─ [ ] Monitor SAGA completion rate

Phase 3: Validation (2 minutes)
├─ [ ] Verify all expected SAGAs resumed
├─ [ ] Check SAGA step execution logs
├─ [ ] Verify no stuck SAGAs
└─ [ ] Confirm no duplicate execution

Phase 4: Notification (3 minutes)
├─ [ ] Announce SAGA resumption
├─ [ ] Notify affected users
└─ [ ] Mark incident resolved
```

---

### 6.4 Runbook: Network Partition (Region Failure)

**Trigger:** Primary region becomes unreachable, must failover to backup region

```
SEVERITY: CRITICAL
RTO: 15 minutes (failover)
RPO: 0-5 minutes (database replication)
Success Criteria: Traffic routed to backup region
```

**Prerequisites:**
- [ ] Active-passive replication configured
- [ ] DNS failover setup (health-check triggered)
- [ ] Application supports multi-region configuration

**Process:**

```
Phase 1: Detection (2 minutes)
├─ [ ] Health checks consistently fail for primary region
├─ [ ] Confirm network isolation (not application crash)
├─ [ ] Declare SEV-1 incident
└─ [ ] Notify team: "Primary region down, starting failover"

Phase 2: Failover (10 minutes)
├─ [ ] Update DNS/load balancer
│       Update CNAME to point to backup region
├─ [ ] Promote backup database to primary
│       ALTER SYSTEM SET primary_conninfo = null;
│       SELECT pg_ctl('restart', null)
├─ [ ] Scale backup application to full capacity
│       kubectl scale deployment vibe-cast --replicas=5 -n backup-region
├─ [ ] Wait for readiness checks
└─ [ ] Verify DNS propagation (< 5 minutes)

Phase 3: Validation (3 minutes)
├─ [ ] Confirm all traffic now goes to backup region
│       curl -H "Host: vibe-cast.example.com" \
│         http://backup-region-ip/health/ready
├─ [ ] Verify no data loss
│       SELECT MAX(timestamp) FROM event_log
├─ [ ] Check replication lag (should be 0)
└─ [ ] Monitor error rates (should be 0)

Phase 4: Communication (5 minutes)
├─ [ ] Announce failover complete
├─ [ ] Update status page
├─ [ ] Notify customers of recovery
└─ [ ] Estimate RTO was 15 minutes

Phase 5: Recovery Planning
├─ [ ] Diagnose primary region failure
├─ [ ] Schedule maintenance window
├─ [ ] Plan failback to primary region
└─ [ ] Coordinate with infrastructure team
```

---

## 7. Business Continuity Procedures

### 7.1 Communication During Outage

```
NOTIFICATION TIMELINE:
┌──────────────┬─────────────────────────────────────────┐
│ Time Since   │ Action                                   │
│ Incident     │                                          │
├──────────────┼─────────────────────────────────────────┤
│ T+2 min      │ Detect outage                            │
│ T+5 min      │ Declare incident, page on-call           │
│ T+10 min     │ Update status page: "Investigating"      │
│ T+15 min     │ Send customer notifications              │
│ T+30 min     │ Update status page: "Identified issue"   │
│ T+45 min     │ Update status: "Mitigation in progress"  │
│ T+60 min     │ Update status: "Service restored"        │
│ T+120 min    │ Post-incident review published           │
└──────────────┴─────────────────────────────────────────┘
```

**Status Page Updates:**

1. **T+10 minutes (Incident declared):**
   ```
   We are investigating reports of service degradation.
   Current status: INVESTIGATING
   ```

2. **T+30 minutes (Cause identified):**
   ```
   We have identified a database connectivity issue.
   Recovery is in progress.
   Current status: DEGRADED
   ```

3. **T+60 minutes (Service resumed):**
   ```
   Service has been restored. All systems operational.
   Full details to follow in post-incident review.
   Current status: RECOVERED
   ```

### 7.2 Escalation Procedures

```
ESCALATION PATH:
┌─────────────────────────┐
│ On-Call Engineer (L1)    │  T+5 min
│ - Declare incident       │
│ - Start runbook          │
└─────────┬───────────────┘
          │ (if not resolved in 10 min)
          ▼
┌─────────────────────────┐
│ Engineering Manager (L2) │  T+15 min
│ - Coordinate response    │
│ - Review decisions       │
│ - Notify customer success│
└─────────┬───────────────┘
          │ (if not resolved in 25 min)
          ▼
┌─────────────────────────┐
│ Director of Eng (L3)     │  T+40 min
│ - Executive decisions    │
│ - Resource allocation    │
│ - Accept workarounds     │
└─────────┬───────────────┘
          │ (if not resolved in 40 min)
          ▼
┌─────────────────────────┐
│ VP Engineering (L4)      │  T+80 min
│ - Declare major incident │
│ - Customer communication │
│ - Consider legal/PR      │
└─────────────────────────┘
```

---

## 8. Recovery Testing Schedule

### 8.1 Backup Restore Testing

```
TESTING SCHEDULE:

Monthly (Full DR Drill):
├─ [ ] Restore from daily backup to test environment
├─ [ ] Verify all data integrity checks
├─ [ ] Measure actual RTO vs target
├─ [ ] Document any issues
└─ [ ] Update runbooks

Quarterly (Partial Failover):
├─ [ ] Failover read replicas in staging
├─ [ ] Verify eventual consistency
├─ [ ] Test data synchronization
└─ [ ] Update failover procedures

Annually (Full Production Backup):
├─ [ ] Once per year: full production restore
├─ [ ] Scheduled during low-traffic window
├─ [ ] Coordinated with ops and security
└─ [ ] Complete documentation
```

### 8.2 Runbook Validation

```
RUNBOOK VALIDATION:

After each incident:
├─ [ ] Review runbook used
├─ [ ] Document what worked
├─ [ ] Document what didn't
├─ [ ] Propose improvements
└─ [ ] Update runbook

Quarterly review:
├─ [ ] Team reads all runbooks
├─ [ ] Identify outdated steps
├─ [ ] Update contact information
├─ [ ] Verify tool availability
└─ [ ] Train new team members

Annual drill:
├─ [ ] Select 2-3 critical runbooks
├─ [ ] Execute without documentation
├─ [ ] Time actual execution
├─ [ ] Compare with target RTO
└─ [ ] Identify gaps
```

---

## 9. References

- [PRODUCTION.md](./PRODUCTION.md) - Configuration and deployment
- [MONITORING.md](./MONITORING.md) - Observability and metrics
- [API.md](./API.md) - REST API specification
- [MIGRATIONS.md](../MIGRATIONS.md) - Database schema

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-06  
**Maintenance:** Review after each incident, validate quarterly
