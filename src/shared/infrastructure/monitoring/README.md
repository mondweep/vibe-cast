# Monitoring Module

Comprehensive observability for Vibe-Cast through metrics collection and export.

## Overview

The monitoring module provides:
- **Counter**: Monotonically increasing metrics (e.g., total events published)
- **Gauge**: Point-in-time measurements (e.g., DLQ size)
- **Histogram**: Distribution tracking (e.g., latency percentiles)
- **Prometheus Export**: Metrics in standard Prometheus text format

## Quick Start

```typescript
import { MetricsCollector } from './monitoring';
import { Logger } from './logging';

const logger = new Logger('metrics');
const collector = new MetricsCollector(logger);

// Event Bus Metrics
const eventCounter = collector.getCounter('eventbus_events_published_total');
eventCounter?.increment();

// Handler Latency
const latencyHistogram = collector.getHistogram('eventbus_handler_execution_duration_ms');
latencyHistogram?.observe(42);

// Export to Prometheus
const metricsText = collector.exportMetrics();
console.log(metricsText);
```

## Metric Types

### Counter
Monotonically increasing counter. Never decreases.

```typescript
const counter = collector.getCounter('eventbus_events_published_total');
counter?.increment();        // +1
counter?.increment(5);       // +5
counter?.getValue();         // Total count
```

### Gauge
Point-in-time measurement. Can go up or down.

```typescript
const gauge = collector.getGauge('eventbus_dead_letter_queue_size_events');
gauge?.set(10);              // Current value = 10
gauge?.increment();          // Current value = 11
gauge?.decrement(2);         // Current value = 9
gauge?.getValue();           // 9
```

### Histogram
Tracks distribution of values; automatically computes percentiles.

```typescript
const histogram = collector.getHistogram('eventbus_handler_execution_duration_ms');
histogram?.observe(50);
histogram?.observe(100);
histogram?.observe(150);

histogram?.getPercentiles();
// Returns: { p50: 100, p95: 150, p99: 150, max: 150, min: 50 }

histogram?.getCount();       // 3
histogram?.getSum();         // 300
```

## Prometheus Export Format

```
# HELP eventbus_events_published_total Counter metric
# TYPE eventbus_events_published_total counter
eventbus_events_published_total 45823

# HELP eventbus_dead_letter_queue_size_events Gauge metric
# TYPE eventbus_dead_letter_queue_size_events gauge
eventbus_dead_letter_queue_size_events 0

# HELP eventbus_handler_execution_duration_ms Histogram metric
# TYPE eventbus_handler_execution_duration_ms histogram
eventbus_handler_execution_duration_ms_bucket{le="1"} 0
eventbus_handler_execution_duration_ms_bucket{le="100"} 1234
eventbus_handler_execution_duration_ms_bucket{le="500"} 2145
...
eventbus_handler_execution_duration_ms_sum 156234
eventbus_handler_execution_duration_ms_count 2567
```

## Integration Patterns

### With EventBus

```typescript
export class EventBus implements IEventBus {
  constructor(
    private logger: Logger,
    private metrics: MetricsCollector,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // ... publish logic ...
      this.metrics.incrementCounter('eventbus_events_published_total');
    } catch (error) {
      this.metrics.incrementCounter('eventbus_handler_executions_total', 1);
    } finally {
      const elapsed = Date.now() - startTime;
      this.metrics.recordHistogram('eventbus_handler_execution_duration_ms', elapsed);
    }
  }
}
```

### With SAGA Orchestrator

```typescript
export abstract class SagaOrchestrator {
  protected async executeStep(
    stepName: string,
    executor: () => Promise<StepResult>,
  ): Promise<StepResult> {
    const startTime = Date.now();
    this.metrics.incrementCounter('saga_executions_total');

    try {
      const result = await executor();
      return result;
    } finally {
      const elapsed = Date.now() - startTime;
      this.metrics.recordHistogram('saga_step_execution_duration_ms', elapsed);
    }
  }
}
```

### With Projectors

```typescript
export class LearnerProfileProjector implements EventHandler {
  async handle(event: DomainEvent): Promise<void> {
    const startTime = Date.now();

    try {
      // ... projection logic ...
      this.metrics.incrementCounter('projection_failures_total', 0);
    } catch (error) {
      this.metrics.incrementCounter('projection_failures_total');
      throw error;
    } finally {
      const elapsed = Date.now() - startTime;
      this.metrics.recordHistogram('projection_update_latency_ms', elapsed);
    }
  }
}
```

## Health Check Endpoint

```typescript
app.get('/metrics', (req, res) => {
  const metricsText = metricsCollector.exportMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(metricsText);
});

app.get('/health', (req, res) => {
  const summary = metricsCollector.getSummary();
  const dlqGauge = metricsCollector.getGauge('eventbus_dead_letter_queue_size_events');
  
  const isHealthy = dlqGauge?.getValue()! < 10;
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    metrics: summary,
  });
});
```

## Grafana Configuration

### Prometheus Data Source
```yaml
url: http://prometheus:9090
scrape_interval: 15s
```

### Dashboard Panel Examples

**Event Publishing Rate:**
```promql
rate(eventbus_events_published_total[5m])
```

**Handler Success Rate:**
```promql
sum(rate(eventbus_handler_executions_total{status="success"}[5m])) / 
sum(rate(eventbus_handler_executions_total[5m]))
```

**Handler Latency P95:**
```promql
histogram_quantile(0.95, eventbus_handler_execution_duration_ms)
```

**DLQ Size:**
```promql
eventbus_dead_letter_queue_size_events
```

## Default Metrics

The MetricsCollector initializes these default metrics:

### EventBus
- `eventbus_events_published_total` (counter)
- `eventbus_handler_executions_total` (counter)
- `eventbus_dead_letter_queue_size_events` (gauge)
- `eventbus_subscriptions_total` (gauge)
- `eventbus_health_status` (gauge)
- `eventbus_handler_execution_duration_ms` (histogram)
- `eventbus_dlq_retry_attempts_total` (counter)

### SAGA
- `saga_executions_total` (counter)
- `saga_compensations_total` (counter)
- `saga_step_failures_total` (counter)
- `saga_state_count` (gauge)
- `saga_step_execution_duration_ms` (histogram)

### Projections
- `projection_failures_total` (counter)
- `projection_staleness_seconds` (gauge)
- `projection_version_lag_events` (gauge)
- `projection_update_latency_ms` (histogram)

## Usage Tips

### Measuring Async Operations
```typescript
import { measureAsync } from './monitoring';

const result = await measureAsync(
  collector,
  'my_operation_duration_ms',
  async () => {
    return await expensiveAsyncOperation();
  }
);
```

### Measuring Sync Operations
```typescript
import { measureSync } from './monitoring';

const result = measureSync(
  collector,
  'my_operation_duration_ms',
  () => {
    return expensiveOperation();
  }
);
```

### Custom Metrics
```typescript
// Register custom metric
const customGauge = collector.registerGauge('custom_active_users', 'Active user count');

// Use it
customGauge.set(1234);
```

## Testing

```typescript
describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    const logger = new MockLogger();
    collector = new MetricsCollector(logger);
  });

  it('should track counters', () => {
    const counter = collector.getCounter('test_counter');
    counter?.increment(5);
    expect(counter?.getValue()).toBe(5);
  });

  it('should calculate percentiles', () => {
    const histogram = collector.getHistogram('test_histogram');
    histogram?.observe(10);
    histogram?.observe(20);
    histogram?.observe(30);

    const percentiles = histogram?.getPercentiles();
    expect(percentiles?.p50).toBe(20);
  });

  afterEach(() => {
    collector.reset();
  });
});
```

## Performance Considerations

- **Counter/Gauge**: O(1) operations
- **Histogram**: O(log n) for percentile calculation (small n)
- **Prometheus Export**: O(m) where m = total metrics
- **Memory**: ~1KB per metric + histogram value array

For high-volume systems (>100k events/sec), consider:
1. Downsampling histogram values
2. Using Prometheus directly (no local storage)
3. Batching metric updates

## References

- [Prometheus Metrics Types](https://prometheus.io/docs/concepts/metric_types/)
- [Monitoring Documentation](../../../docs/MONITORING.md)
