# Vibe-Cast Production Configuration & Deployment Guide

**Phase 5 - Production Readiness**

## Overview

This guide covers environment configuration, secrets management, connection pooling, resilience patterns, and startup/shutdown procedures for production deployments of Vibe-Cast.

Vibe-Cast uses a **3-tier deployment model**: Development, Staging, and Production. Each environment has distinct configuration requirements, security levels, and capacity planning.

---

## 1. Environment Configuration Strategy

### 1.1 Three-Environment Model

```
┌──────────────────────────────────────────────────────────────┐
│                 DEPLOYMENT ENVIRONMENTS                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  DEVELOPMENT                STAGING              PRODUCTION   │
│  ──────────────            ─────────             ──────────   │
│  • Local/Private Cloud     • Cloud staging       • Cloud prod  │
│  • Shared database         • Isolated database   • Isolated DB │
│  • Debug logging enabled   • Full RLS policies   • Full RLS    │
│  • No data retention req.  • Test data cleanup   • Backups 2x  │
│  • Max 2 concurrent        • Max 20 concurrent   • Max 200     │
│    connections             • 24/7 monitoring    • 24/7 + SLA  │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Environment Variables

All environments use the same **environment variable names** but with different values:

```bash
# Supabase Configuration (Required)
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_<token>
SUPABASE_SECRET_KEY=sb_secret_<token>
DATABASE_SCHEMA=ruflo_demo

# Database Connection Pooling (Optional, for direct connections)
DATABASE_URL=postgresql://user:password@db.host:5432/postgres
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
DATABASE_IDLE_TIMEOUT=30000
DATABASE_STATEMENT_TIMEOUT=30000

# Application Configuration
NODE_ENV=production
APP_NAME=vibe-cast
APP_VERSION=1.0.0
LOG_LEVEL=info
CORRELATION_ID_HEADER=x-correlation-id

# Resilience Configuration
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_BACKOFF_MS=100
RETRY_MAX_BACKOFF_MS=30000

# Health Check Configuration
HEALTH_CHECK_INTERVAL_MS=30000
HEALTH_CHECK_TIMEOUT_MS=5000

# API Configuration (Optional)
API_KEY_ROTATION_DAYS=90
API_RATE_LIMIT_REQUESTS=5000
API_RATE_LIMIT_WINDOW_MS=3600000
```

### 1.3 Environment-Specific Values

#### Development Environment

```bash
# .env.development
NODE_ENV=development
SUPABASE_URL=https://dev-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_dev_<token>
SUPABASE_SECRET_KEY=sb_secret_dev_<token>
DATABASE_SCHEMA=ruflo_demo_dev

LOG_LEVEL=debug
DATABASE_POOL_MIN=1
DATABASE_POOL_MAX=5

CIRCUIT_BREAKER_THRESHOLD=10
CIRCUIT_BREAKER_TIMEOUT_MS=30000
RETRY_MAX_ATTEMPTS=2
```

#### Staging Environment

```bash
# .env.staging
NODE_ENV=staging
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_staging_<token>
SUPABASE_SECRET_KEY=sb_secret_staging_<token>
DATABASE_SCHEMA=ruflo_demo_staging

LOG_LEVEL=info
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=15

CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3
```

#### Production Environment

```bash
# .env.production (Vault/Secrets Manager)
NODE_ENV=production
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_prod_<token>
SUPABASE_SECRET_KEY=sb_secret_prod_<token>
DATABASE_SCHEMA=ruflo_demo

LOG_LEVEL=info
DATABASE_POOL_MIN=10
DATABASE_POOL_MAX=200

CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000
RETRY_MAX_ATTEMPTS=3
```

---

## 2. Configuration Management

### 2.1 Loading Configuration at Startup

The application uses the existing `SupabaseConfig` class for validation:

```typescript
// src/index.ts (Application Startup)
import { Logger } from './shared/infrastructure/logging/Logger';
import { SupabaseConfig } from './shared/infrastructure/config/SupabaseConfig';

async function startup(): Promise<void> {
  const logger = new Logger('app');
  
  try {
    // 1. Validate environment configuration
    const supabaseConfig = new SupabaseConfig(logger);
    logger.info('Configuration validated', supabaseConfig.getSummary());
    
    // 2. Initialize database connection
    const database = await initializeDatabase(supabaseConfig);
    
    // 3. Initialize application components
    const eventBus = new EventBus(logger);
    const sagaOrchestrator = new SagaOrchestrator(database, logger);
    
    // 4. Start health check interval
    startHealthCheckInterval(logger);
    
    // 5. Ready signal
    logger.info('Application startup complete', {
      environment: process.env.NODE_ENV,
      projectId: supabaseConfig.getProjectId(),
      schema: supabaseConfig.schema
    });
    
  } catch (error) {
    logger.error('Startup failed', { error });
    process.exit(1);
  }
}

startup();
```

### 2.2 Configuration Validation Schema

Configuration must be validated against this schema:

```typescript
// Validation Rules
interface ConfigurationSchema {
  // Supabase (Required, Format-validated)
  SUPABASE_URL: {
    required: true;
    pattern: /^https:\/\/[a-z0-9]+\.supabase\.co$/;
    minLength: 30;
    maxLength: 100;
  };
  
  SUPABASE_PUBLISHABLE_KEY: {
    required: true;
    pattern: /^sb_publishable_[a-zA-Z0-9_-]{20,}$/;
  };
  
  SUPABASE_SECRET_KEY: {
    required: true;
    pattern: /^sb_secret_[a-zA-Z0-9_-]{20,}$/;
  };
  
  DATABASE_SCHEMA: {
    required: false;
    default: 'ruflo_demo';
    pattern: /^[a-z_][a-z0-9_]*$/;
    maxLength: 63; // PostgreSQL identifier limit
  };
  
  // Database Connection (Optional)
  DATABASE_URL: {
    required: false;
    pattern: /^postgresql:\/\/[^@]+@[^:]+:\d+\/[a-z0-9_-]+$/;
  };
  
  DATABASE_POOL_MIN: {
    required: false;
    default: 2;
    type: 'number';
    min: 1;
    max: 50;
  };
  
  DATABASE_POOL_MAX: {
    required: false;
    default: 20;
    type: 'number';
    min: 2;
    max: 500;
  };
  
  // Resilience (Optional)
  CIRCUIT_BREAKER_THRESHOLD: {
    required: false;
    default: 5;
    type: 'number';
    min: 1;
    max: 100;
  };
  
  RETRY_MAX_ATTEMPTS: {
    required: false;
    default: 3;
    type: 'number';
    min: 1;
    max: 10;
  };
  
  NODE_ENV: {
    required: true;
    enum: ['development', 'staging', 'production'];
  };
  
  LOG_LEVEL: {
    required: false;
    default: 'info';
    enum: ['debug', 'info', 'warn', 'error'];
  };
}
```

### 2.3 Secrets Management

**DO NOT** commit `.env.production` or any secrets to version control.

#### Recommended Secret Storage:

1. **Development**: Local `.env` file (git-ignored)
2. **Staging**: Cloud secrets manager (AWS Secrets Manager, Azure Key Vault, GCP Secret Manager)
3. **Production**: Same as staging + rotation policy

#### Secret Rotation Strategy:

```
Rotation Interval:  90 days (per API_KEY_ROTATION_DAYS)
Notification:       30 days before expiration
Process:
  1. Generate new key in Supabase dashboard
  2. Add new key as PRIMARY (old as SECONDARY)
  3. Deploy application with new key
  4. Monitor error rates (should be 0)
  5. After 7 days, retire old key
  6. Document rotation in change log
```

#### Secrets Checklist:

```bash
# Required for ALL environments
[ ] SUPABASE_URL - stored in secrets manager
[ ] SUPABASE_PUBLISHABLE_KEY - stored in secrets manager
[ ] SUPABASE_SECRET_KEY - stored in secrets manager (NEVER in logs)
[ ] DATABASE_URL - stored in secrets manager (if using direct connection)

# Production-only
[ ] API_ENCRYPTION_KEY - for data encryption (if added)
[ ] JWT_SIGNING_SECRET - for token generation (if added)

# Rotation log (update on each rotation)
[ ] SUPABASE_SECRET_KEY rotated: <date> by <team member>
[ ] DATABASE_PASSWORD rotated: <date> by <team member>
```

---

## 3. Supabase Project Setup Per Environment

### 3.1 Project Isolation

Each environment has a **dedicated Supabase project**:

```
Development Project
├── Project ID: dev-project-abc123
├── URL: https://dev-project.supabase.co
├── Database: PostgreSQL 14
├── Schema: ruflo_demo_dev
├── Backup: None (recreated from migrations)
├── RLS: Disabled (for dev speed)
└── Retention: No requirements

Staging Project
├── Project ID: staging-project-def456
├── URL: https://staging-project.supabase.co
├── Database: PostgreSQL 14
├── Schema: ruflo_demo_staging
├── Backup: Daily (7-day retention)
├── RLS: Enabled (full policies tested)
└── Retention: 30 days (test data)

Production Project
├── Project ID: prod-project-ghi789
├── URL: https://prod-project.supabase.co
├── Database: PostgreSQL 14
├── Schema: ruflo_demo
├── Backup: 2x daily (30-day retention)
├── RLS: Enabled (strict policies enforced)
├── Retention: Per GDPR requirements
└── SLA: 99.9% uptime target
```

### 3.2 Project Setup Checklist

```bash
# For each Supabase project, verify:

[ ] Project created and accessible
[ ] Database initialized with schema migration
[ ] RLS policies enabled (except development)
[ ] Backup schedule configured
[ ] API keys generated and stored in secrets manager
[ ] Row-level security policies deployed
[ ] Database roles and permissions configured
[ ] Connection pool settings tuned
[ ] Monitoring alerts configured
[ ] VPC/network isolation (if applicable)
```

### 3.3 Database Setup Script

```sql
-- Run this script after creating new Supabase project
-- Executes migrations and validates schema

-- 1. Create schema
CREATE SCHEMA IF NOT EXISTS ruflo_demo;

-- 2. Set schema search path
ALTER DATABASE postgres SET search_path = ruflo_demo, public;

-- 3. Run migration: 001_create_saga_state.sql
-- (See MIGRATIONS.md for full script)
-- CREATE TABLE ruflo_demo_saga_state (...)
-- CREATE TABLE ruflo_demo_saga_steps (...)
-- ... (remaining tables)

-- 4. Run migration: ruflo_demo_schema.sql
-- (See MIGRATIONS.md for full script)
-- CREATE TABLE ruflo_demo_enrollments (...)
-- CREATE TABLE ruflo_demo_learner_progress (...)
-- ... (remaining tables)

-- 5. Enable RLS (except development)
DO $$
BEGIN
  IF current_setting('app.environment') NOT LIKE '%development%' THEN
    ALTER TABLE ruflo_demo_saga_state ENABLE ROW LEVEL SECURITY;
    ALTER TABLE ruflo_demo_enrollments ENABLE ROW LEVEL SECURITY;
    -- (enable for all tables)
  END IF;
END $$;

-- 6. Validate schema
SELECT 
  table_name,
  count(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'ruflo_demo'
GROUP BY table_name
ORDER BY table_name;
```

---

## 4. Database Connection Pooling Configuration

### 4.1 Connection Pool Sizing

Connection pool size depends on:
- **Concurrent users**: Number of simultaneous requests
- **Request duration**: Avg query execution time
- **DB connection overhead**: ~50-100ms per new connection

**Formula:** `pool_size = (concurrent_users * avg_request_duration) + buffer`

```
Development:  2-5 connections (local machine)
  Rationale: 1-2 local workers, minimal concurrency

Staging:      10-15 connections
  Rationale: 20 concurrent users, 500ms avg duration
  Calc: (20 * 0.5) + 5 = 15

Production:   100-200 connections
  Rationale: 200 concurrent users, 200ms avg duration
  Calc: (200 * 0.2) + 50 = 100
  Max: Supabase has built-in pooling, max 200 is safe
```

### 4.2 Connection Pool Configuration

```typescript
// src/shared/infrastructure/database/ConnectionPool.ts
interface PoolConfig {
  min: number;           // Minimum idle connections
  max: number;           // Maximum total connections
  idleTimeoutMs: number; // Close idle connections after (ms)
  statementTimeoutMs: number; // Query timeout
  acquireTimeoutMs: number;   // Timeout for acquiring connection
}

const poolConfigs: Record<string, PoolConfig> = {
  development: {
    min: 1,
    max: 5,
    idleTimeoutMs: 30000,
    statementTimeoutMs: 30000,
    acquireTimeoutMs: 10000
  },
  staging: {
    min: 5,
    max: 15,
    idleTimeoutMs: 30000,
    statementTimeoutMs: 30000,
    acquireTimeoutMs: 10000
  },
  production: {
    min: 10,
    max: 200,
    idleTimeoutMs: 30000,
    statementTimeoutMs: 30000,
    acquireTimeoutMs: 15000
  }
};

// Application startup
const poolConfig = poolConfigs[process.env.NODE_ENV || 'development'];
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...poolConfig
});

// Monitor pool status
pool.on('error', (err) => {
  logger.error('Unexpected connection pool error', { error: err });
});

setInterval(() => {
  logger.debug('Pool status', {
    idle: pool.idleCount,
    total: pool.totalCount,
    waiting: pool.waitingCount
  });
}, 60000); // Every 60 seconds
```

### 4.3 Connection Pool Monitoring

Monitor these metrics:

```
eventbus_db_connections_active
  Target: < max_pool_size * 0.8
  Alert:  > max_pool_size * 0.9
  
eventbus_db_connections_waiting
  Target: 0
  Alert:  > 5 (indicates undersized pool)
  
eventbus_db_connection_acquire_time_ms
  p50:  < 10ms
  p95:  < 50ms
  p99:  < 100ms
  Alert: p99 > 500ms

eventbus_db_statement_execution_time_ms
  p50:  < 50ms
  p95:  < 200ms
  p99:  < 1000ms
  Alert: p99 > 2000ms
```

---

## 5. Circuit Breaker Implementation Strategy

### 5.1 Circuit Breaker Pattern

The circuit breaker prevents cascading failures by stopping requests to failing services:

```
         Normal             Degradation         Failure
      ┌──────────┐       ┌──────────────┐   ┌──────────┐
      │  CLOSED  │──────▶│ OPEN (Trip)  │──▶│  HALF-   │
      │ (Traffic)│       │(Fail Fast)   │   │  OPEN    │
      └──────────┘       └──────────────┘   │(Testing) │
           ▲                     ▲           └──────────┘
           │                     │                │
           └─────────────────────┴────────────────┘
            (After timeout or all tests pass)
```

### 5.2 Configuration

```typescript
// src/shared/infrastructure/resilience/CircuitBreaker.ts
interface CircuitBreakerConfig {
  // Failure threshold (failures before opening)
  failureThreshold: number;
  
  // Time window for counting failures (ms)
  failureWindowMs: number;
  
  // Time to wait in OPEN state before trying HALF_OPEN (ms)
  openTimeoutMs: number;
  
  // Number of test requests in HALF_OPEN state
  halfOpenRequests: number;
  
  // Success threshold in HALF_OPEN state to close
  halfOpenSuccessThreshold: number;
}

const circuitBreakerConfigs: Record<string, CircuitBreakerConfig> = {
  development: {
    failureThreshold: 10,
    failureWindowMs: 60000,
    openTimeoutMs: 30000,
    halfOpenRequests: 3,
    halfOpenSuccessThreshold: 2
  },
  staging: {
    failureThreshold: 5,
    failureWindowMs: 60000,
    openTimeoutMs: 60000,
    halfOpenRequests: 3,
    halfOpenSuccessThreshold: 2
  },
  production: {
    failureThreshold: 5,
    failureWindowMs: 60000,
    openTimeoutMs: 60000,
    halfOpenRequests: 1,
    halfOpenSuccessThreshold: 1
  }
};
```

### 5.3 Implementation Checklist

```bash
[ ] Circuit breaker initialized for EventBus
[ ] Circuit breaker initialized for Database connections
[ ] Circuit breaker initialized for External API calls (if any)
[ ] Failure counting correctly tracks errors
[ ] OPEN state correctly blocks traffic
[ ] HALF_OPEN state tests recovery
[ ] Metrics logged for state transitions
[ ] Alerts configured for circuit breaker trips
[ ] Recovery procedures documented
```

---

## 6. Retry and Backoff Policies for Resilience

### 6.1 Retry Configuration

Retries help recover from transient failures:

```typescript
interface RetryConfig {
  maxAttempts: number;          // Total number of attempts
  initialBackoffMs: number;      // First retry delay
  maxBackoffMs: number;          // Max retry delay
  backoffMultiplier: number;     // Exponential growth factor
  jitterFraction: number;        // Randomization factor (0-1)
}

const retryConfigs: Record<string, RetryConfig> = {
  development: {
    maxAttempts: 2,
    initialBackoffMs: 100,
    maxBackoffMs: 5000,
    backoffMultiplier: 2,
    jitterFraction: 0.1
  },
  staging: {
    maxAttempts: 3,
    initialBackoffMs: 100,
    maxBackoffMs: 10000,
    backoffMultiplier: 2,
    jitterFraction: 0.2
  },
  production: {
    maxAttempts: 3,
    initialBackoffMs: 100,
    maxBackoffMs: 30000,
    backoffMultiplier: 2,
    jitterFraction: 0.3
  }
};
```

### 6.2 Retry Strategy Per Component

```
EventBus Handler Failures:
  Retryable: Network timeout, Database connection lost
  Non-retryable: Validation error, Idempotency conflict
  Strategy: Exponential backoff, max 3 attempts, then DLQ

SAGA Step Failures:
  Retryable: Transient service failures
  Non-retryable: Business rule violation
  Strategy: Exponential backoff, max 3 attempts, then compensation

Database Query Failures:
  Retryable: Connection timeout, Deadlock
  Non-retryable: Constraint violation, SQL syntax error
  Strategy: Exponential backoff, max 3 attempts, then fail

External API Calls:
  Retryable: HTTP 429, 502, 503, timeout
  Non-retryable: HTTP 400, 401, 404
  Strategy: Exponential backoff with circuit breaker
```

### 6.3 Backoff Calculation

```typescript
function calculateBackoffMs(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: initialBackoff * multiplier^(attempt-1)
  const exponential = Math.min(
    config.initialBackoffMs * Math.pow(config.backoffMultiplier, attempt - 1),
    config.maxBackoffMs
  );
  
  // Add jitter: randomize 0-jitterFraction of the backoff
  const jitter = exponential * config.jitterFraction * Math.random();
  
  return Math.floor(exponential + jitter);
}

// Example timelines:
// Development: 100ms, 200ms, 400ms (total: 700ms)
// Staging: 100ms, 300ms, 800ms (total: 1100ms, capped at 10s)
// Production: 100ms, 300ms, 900ms (total: 1300ms, capped at 30s)
```

---

## 7. Health Check Endpoints and Startup Verification

### 7.1 Liveness Probe (Kubernetes/Container)

Endpoint: `GET /health/live`

Returns 200 if the application is running (even if degraded):

```typescript
// src/api/health/livenessController.ts
async function liveness(req: Request, res: Response): Promise<void> {
  // Simple check: application is running
  if (!appStartupComplete) {
    return res.status(503).json({
      status: 'initializing',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}
```

### 7.2 Readiness Probe (Kubernetes/Container)

Endpoint: `GET /health/ready`

Returns 200 only if the application is ready to handle traffic:

```typescript
// src/api/health/readinessController.ts
async function readiness(req: Request, res: Response): Promise<void> {
  const checks: Record<string, boolean> = {
    appStarted: appStartupComplete,
    supabaseConnected: await supabaseHealthCheck(),
    eventBusHealthy: eventBus.isHealthy(),
    connectionPoolHealthy: connectionPool.idleCount > 0
  };
  
  const allHealthy = Object.values(checks).every(v => v);
  
  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString()
  });
}

async function supabaseHealthCheck(): Promise<boolean> {
  try {
    const result = await supabaseClient.from('ruflo_demo_saga_state')
      .select('count', { count: 'exact', head: true })
      .limit(1)
      .timeout(5000);
    
    return !result.error;
  } catch {
    return false;
  }
}
```

### 7.3 Deep Health Check (Operations Monitoring)

Endpoint: `GET /health/deep`

Returns detailed diagnostics (production only for authenticated users):

```typescript
// src/api/health/deepController.ts
async function deepHealth(req: Request, res: Response): Promise<void> {
  // Verify authentication (admin only in production)
  if (process.env.NODE_ENV === 'production') {
    const token = req.headers.authorization?.split(' ')[1];
    if (!isValidAdminToken(token)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  const health = {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      supabase: await checkSupabase(),
      database: await checkDatabase(),
      eventBus: checkEventBus(),
      connectionPool: checkConnectionPool(),
      metrics: checkMetrics(),
      dlq: await checkDLQ()
    }
  };
  
  const anyFailure = Object.values(health.checks).some(c => !c.healthy);
  health.status = anyFailure ? 'degraded' : 'healthy';
  
  return res.status(anyFailure ? 503 : 200).json(health);
}
```

### 7.4 Startup Verification Checklist

```bash
# Application startup sequence
[ ] Parse environment variables
[ ] Validate SupabaseConfig
[ ] Initialize Logger
[ ] Establish database connection
[ ] Run health checks
  [ ] Supabase connectivity
  [ ] Database schema verification
  [ ] EventBus initialization
  [ ] Connection pool validation
[ ] Load configuration from database (if any)
[ ] Initialize SAGA orchestrator
[ ] Initialize projectors
[ ] Start health check interval
[ ] Listen on HTTP port
[ ] Log "Application startup complete"

# Pre-readiness verification
[ ] All health checks pass
[ ] No critical errors in logs
[ ] Metrics collector operational
[ ] EventBus handlers registered
[ ] Database connections pooled
[ ] Circuit breakers initialized

# Ready signal: /health/ready returns 200
```

---

## 8. Graceful Shutdown Procedures

### 8.1 Shutdown Signal Handling

```typescript
// src/shutdown/GracefulShutdown.ts
class GracefulShutdown {
  private shutdownTimeout = 30000; // 30 seconds
  private isShuttingDown = false;
  
  constructor(private logger: Logger) {
    this.registerSignalHandlers();
  }
  
  private registerSignalHandlers(): void {
    // Handle SIGTERM (container/orchestrator stop)
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    
    // Handle SIGINT (manual interrupt)
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    
    // Uncaught exceptions
    process.on('uncaughtException', (err) => {
      this.logger.error('Uncaught exception', { error: err });
      this.handleShutdown('uncaughtException');
    });
    
    // Unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled rejection', { reason });
      // Don't shutdown for warnings, log and continue
    });
  }
  
  private async handleShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.logger.info('Shutdown initiated', { signal });
    
    const shutdownTimer = setTimeout(() => {
      this.logger.error('Graceful shutdown timeout exceeded, force exiting');
      process.exit(1);
    }, this.shutdownTimeout);
    
    try {
      // 1. Stop accepting new requests
      this.logger.info('Stopping request listener');
      await httpServer.close();
      
      // 2. Wait for in-flight requests to complete
      this.logger.info('Draining in-flight requests');
      await this.drainRequests(5000);
      
      // 3. Close database connection pool
      this.logger.info('Closing database connection pool');
      await connectionPool.end();
      
      // 4. Unsubscribe from event bus
      this.logger.info('Unsubscribing from event bus');
      eventBus.unsubscribeAll();
      
      // 5. Clean up resources
      this.logger.info('Cleaning up resources');
      await metricsCollector.flush();
      
      this.logger.info('Graceful shutdown complete');
      clearTimeout(shutdownTimer);
      process.exit(0);
      
    } catch (error) {
      this.logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  }
  
  private async drainRequests(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const activeRequests = this.countActiveRequests();
      if (activeRequests === 0) break;
      
      this.logger.debug('Waiting for requests to drain', { 
        activeRequests,
        elapsedMs: Date.now() - startTime
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  private countActiveRequests(): number {
    // Implementation depends on HTTP framework
    // For Express: tracking middleware can count active requests
    return 0;
  }
}
```

### 8.2 Kubernetes Lifecycle Hooks

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vibe-cast
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: vibe-cast
        image: vibe-cast:latest
        ports:
        - containerPort: 3000
        
        # Startup probe: wait for app to start
        startupProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 30
        
        # Liveness probe: restart if dead
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe: route traffic only if ready
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Graceful shutdown
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      
      # Graceful termination
      terminationGracePeriodSeconds: 45
```

### 8.3 Shutdown Verification Checklist

```bash
# On shutdown signal (SIGTERM), verify:
[ ] Server stops accepting new requests immediately
[ ] In-flight requests complete within 5 seconds
[ ] Long-running SAGA steps gracefully pause
[ ] Database connections close cleanly
[ ] Event bus subscriptions unsubscribed
[ ] Metrics flushed to monitoring system
[ ] Logs indicate clean shutdown
[ ] Process exits with code 0

# After graceful shutdown failure (timeout), verify:
[ ] Force exit happens within 30 seconds
[ ] Incomplete operations logged for recovery
[ ] Data consistency maintained
[ ] No orphaned resources left
```

---

## 9. Pre-Launch Verification Checklist

### Phase 5a: Configuration & Deployment

```bash
# Environment Setup
[ ] Development environment configured (.env.development)
[ ] Staging environment configured (.env.staging)
[ ] Production environment configured (secrets manager)
[ ] All environment variables validated against schema
[ ] Secrets stored securely, not in version control

# Database Setup
[ ] Development Supabase project created
[ ] Staging Supabase project created
[ ] Production Supabase project created
[ ] All schemas initialized with migrations
[ ] RLS policies enabled (staging/production)
[ ] Backups scheduled appropriately
[ ] Connection pooling tuned per environment
[ ] Database monitoring configured

# Application Configuration
[ ] SupabaseConfig validation tested
[ ] Circuit breaker initialized and tested
[ ] Retry policies configured
[ ] Health check endpoints responding
[ ] Graceful shutdown tested
[ ] Startup verification checklist passed

# Deployment Infrastructure
[ ] Docker image builds successfully
[ ] Kubernetes manifests created
[ ] Secret storage configured (AWS/Azure/GCP)
[ ] Monitoring agents installed
[ ] Log aggregation pipeline active
[ ] Alerts configured for key metrics
```

---

## 10. References

- [MONITORING.md](./MONITORING.md) - Observability and metrics
- [API.md](./API.md) - REST API specification
- [MIGRATIONS.md](../MIGRATIONS.md) - Database schema
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) - Backup and recovery
- [SECURITY.md](./SECURITY.md) - Security hardening

---

**Document Version:** 1.0  
**Last Updated:** 2026-06-06  
**Maintenance:** Review quarterly or after production incident
