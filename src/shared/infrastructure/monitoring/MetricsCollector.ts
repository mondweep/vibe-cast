import { Logger } from '../logging/Logger';

/**
 * Metric Types supported by MetricsCollector
 */
export enum MetricType {
  COUNTER = 'counter',      // Monotonically increasing value
  GAUGE = 'gauge',          // Point-in-time value
  HISTOGRAM = 'histogram',  // Distribution of values
}

/**
 * Metric Interface
 * Represents a single metric collection
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

/**
 * Counter Metric
 * Monotonically increasing integer counter
 * Example: eventbus_events_published_total
 */
export class Counter {
  private value: number = 0;

  constructor(
    private name: string,
    private labels: Record<string, string> = {},
  ) {}

  /**
   * Increment counter by delta (default 1)
   */
  increment(delta: number = 1): void {
    this.value += delta;
  }

  /**
   * Get current counter value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Get counter as Prometheus-format string
   */
  toPrometheus(): string {
    const labelString = this.formatLabels();
    return `${this.name}${labelString} ${this.value}`;
  }

  private formatLabels(): string {
    if (Object.keys(this.labels).length === 0) {
      return '';
    }

    const pairs = Object.entries(this.labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `{${pairs}}`;
  }
}

/**
 * Gauge Metric
 * Point-in-time measurement (can go up or down)
 * Example: eventbus_dead_letter_queue_size_events
 */
export class Gauge {
  private value: number = 0;

  constructor(
    private name: string,
    private labels: Record<string, string> = {},
  ) {}

  /**
   * Set gauge to specific value
   */
  set(value: number): void {
    this.value = value;
  }

  /**
   * Increment gauge by delta
   */
  increment(delta: number = 1): void {
    this.value += delta;
  }

  /**
   * Decrement gauge by delta
   */
  decrement(delta: number = 1): void {
    this.value = Math.max(0, this.value - delta);
  }

  /**
   * Get current gauge value
   */
  getValue(): number {
    return this.value;
  }

  /**
   * Get gauge as Prometheus-format string
   */
  toPrometheus(): string {
    const labelString = this.formatLabels();
    return `${this.name}${labelString} ${this.value}`;
  }

  private formatLabels(): string {
    if (Object.keys(this.labels).length === 0) {
      return '';
    }

    const pairs = Object.entries(this.labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `{${pairs}}`;
  }
}

/**
 * Histogram Metric
 * Tracks distribution of values (e.g., latencies)
 * Automatically computes percentiles
 */
export class Histogram {
  private values: number[] = [];
  private buckets: Record<number, number> = {};
  private bucketBoundaries: number[] = [
    1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000
  ];

  constructor(
    private name: string,
    private labels: Record<string, string> = {},
  ) {
    // Initialize buckets
    this.bucketBoundaries.forEach(boundary => {
      this.buckets[boundary] = 0;
    });
  }

  /**
   * Record a single measurement
   */
  observe(value: number): void {
    this.values.push(value);

    // Increment appropriate buckets (cumulative)
    this.bucketBoundaries.forEach(boundary => {
      if (value <= boundary) {
        this.buckets[boundary]++;
      }
    });
  }

  /**
   * Get count of all observations
   */
  getCount(): number {
    return this.values.length;
  }

  /**
   * Get sum of all observations
   */
  getSum(): number {
    return this.values.reduce((sum, val) => sum + val, 0);
  }

  /**
   * Get percentile value
   * Example: getPercentile(0.95) returns p95
   */
  getPercentile(percentile: number): number {
    if (this.values.length === 0) {
      return 0;
    }

    const sorted = [...this.values].sort((a, b) => a - b);
    const index = Math.ceil((percentile * sorted.length) - 1);
    return sorted[Math.max(0, index)];
  }

  /**
   * Get key percentiles
   */
  getPercentiles(): Record<string, number> {
    return {
      p50: this.getPercentile(0.50),
      p95: this.getPercentile(0.95),
      p99: this.getPercentile(0.99),
      max: Math.max(...this.values, 0),
      min: this.values.length > 0 ? Math.min(...this.values) : 0,
    };
  }

  /**
   * Get histogram as Prometheus-format string
   */
  toPrometheus(): string {
    const labelString = this.formatLabels();
    const lines: string[] = [];

    // Bucket metrics (cumulative)
    this.bucketBoundaries.forEach(boundary => {
      lines.push(`${this.name}_bucket${labelString.replace('}', `,le="${boundary}"}`) || `{le="${boundary}"}`} ${this.buckets[boundary]}`);
    });

    // +Inf bucket
    lines.push(`${this.name}_bucket${labelString.replace('}', `,le="+Inf"}`) || `{le="+Inf"}`} ${this.getCount()}`);

    // Sum
    lines.push(`${this.name}_sum${labelString} ${this.getSum()}`);

    // Count
    lines.push(`${this.name}_count${labelString} ${this.getCount()}`);

    return lines.join('\n');
  }

  private formatLabels(): string {
    if (Object.keys(this.labels).length === 0) {
      return '';
    }

    const pairs = Object.entries(this.labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `{${pairs}}`;
  }
}

/**
 * MetricsCollector
 * Central metrics collection and export system
 *
 * Responsibilities:
 * - Register and manage counters, gauges, histograms
 * - Provide metrics in Prometheus format
 * - Track domain-specific metrics (event processing, SAGA execution, etc)
 * - Enable observability without coupling to monitoring backends
 */
export class MetricsCollector {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize common metrics for event processing
   */
  private initializeDefaultMetrics(): void {
    // Event Bus metrics
    this.registerCounter('eventbus_events_published_total', 'Total events published');
    this.registerCounter('eventbus_handler_executions_total', 'Total handler executions');
    this.registerGauge('eventbus_dead_letter_queue_size_events', 'Size of dead letter queue');
    this.registerGauge('eventbus_subscriptions_total', 'Total active subscriptions');
    this.registerGauge('eventbus_health_status', 'EventBus health (1=healthy, 0=unhealthy)');
    this.registerHistogram('eventbus_handler_execution_duration_ms', 'Handler execution duration in milliseconds');
    this.registerCounter('eventbus_dlq_retry_attempts_total', 'Total DLQ retry attempts');

    // SAGA metrics
    this.registerCounter('saga_executions_total', 'Total SAGA executions');
    this.registerCounter('saga_compensations_total', 'Total SAGA compensations triggered');
    this.registerCounter('saga_step_failures_total', 'Total SAGA step failures');
    this.registerGauge('saga_state_count', 'Count of SAGAs in each state');
    this.registerHistogram('saga_step_execution_duration_ms', 'SAGA step execution duration in milliseconds');

    // Projection metrics
    this.registerCounter('projection_failures_total', 'Total projection update failures');
    this.registerGauge('projection_staleness_seconds', 'Projection staleness in seconds');
    this.registerGauge('projection_version_lag_events', 'Events behind for each projection');
    this.registerHistogram('projection_update_latency_ms', 'Projection update latency in milliseconds');

    this.logger.info('MetricsCollector initialized with default metrics');
  }

  /**
   * Register a counter metric
   */
  registerCounter(name: string, description?: string): Counter {
    if (this.counters.has(name)) {
      this.logger.warn(`Counter already registered: ${name}`);
      return this.counters.get(name)!;
    }

    const counter = new Counter(name);
    this.counters.set(name, counter);

    if (description) {
      this.logger.debug(`Registered counter: ${name} - ${description}`);
    }

    return counter;
  }

  /**
   * Register a gauge metric
   */
  registerGauge(name: string, description?: string): Gauge {
    if (this.gauges.has(name)) {
      this.logger.warn(`Gauge already registered: ${name}`);
      return this.gauges.get(name)!;
    }

    const gauge = new Gauge(name);
    this.gauges.set(name, gauge);

    if (description) {
      this.logger.debug(`Registered gauge: ${name} - ${description}`);
    }

    return gauge;
  }

  /**
   * Register a histogram metric
   */
  registerHistogram(name: string, description?: string): Histogram {
    if (this.histograms.has(name)) {
      this.logger.warn(`Histogram already registered: ${name}`);
      return this.histograms.get(name)!;
    }

    const histogram = new Histogram(name);
    this.histograms.set(name, histogram);

    if (description) {
      this.logger.debug(`Registered histogram: ${name} - ${description}`);
    }

    return histogram;
  }

  /**
   * Get counter by name
   */
  getCounter(name: string): Counter | undefined {
    return this.counters.get(name);
  }

  /**
   * Get gauge by name
   */
  getGauge(name: string): Gauge | undefined {
    return this.gauges.get(name);
  }

  /**
   * Get histogram by name
   */
  getHistogram(name: string): Histogram | undefined {
    return this.histograms.get(name);
  }

  /**
   * Increment counter by name (convenience method)
   */
  incrementCounter(name: string, delta: number = 1): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.increment(delta);
    } else {
      this.logger.warn(`Counter not found: ${name}`);
    }
  }

  /**
   * Set gauge value by name (convenience method)
   */
  setGauge(name: string, value: number): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.set(value);
    } else {
      this.logger.warn(`Gauge not found: ${name}`);
    }
  }

  /**
   * Record histogram observation by name (convenience method)
   */
  recordHistogram(name: string, value: number): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.observe(value);
    } else {
      this.logger.warn(`Histogram not found: ${name}`);
    }
  }

  /**
   * Export all metrics in Prometheus text format
   * Can be scraped by Prometheus/Grafana
   */
  exportMetrics(): string {
    const lines: string[] = [];

    // Export counters
    for (const [name, counter] of this.counters.entries()) {
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(counter.toPrometheus());
      lines.push('');
    }

    // Export gauges
    for (const [name, gauge] of this.gauges.entries()) {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(gauge.toPrometheus());
      lines.push('');
    }

    // Export histograms
    for (const [name, histogram] of this.histograms.entries()) {
      lines.push(`# HELP ${name} Histogram metric`);
      lines.push(`# TYPE ${name} histogram`);
      lines.push(histogram.toPrometheus());
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get metrics summary for health checks
   */
  getSummary(): Record<string, any> {
    return {
      counters: Array.from(this.counters.entries()).map(([name, counter]) => ({
        name,
        value: counter.getValue(),
      })),
      gauges: Array.from(this.gauges.entries()).map(([name, gauge]) => ({
        name,
        value: gauge.getValue(),
      })),
      histograms: Array.from(this.histograms.entries()).map(([name, histogram]) => ({
        name,
        count: histogram.getCount(),
        sum: histogram.getSum(),
        percentiles: histogram.getPercentiles(),
      })),
    };
  }

  /**
   * Clear all metrics (for testing)
   */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.initializeDefaultMetrics();
  }
}

/**
 * Convenience function for timing async operations
 * Usage:
 *   await measureAsync(collector, 'some_operation_ms', async () => {
 *     return await doSomething();
 *   });
 */
export async function measureAsync<T>(
  collector: MetricsCollector,
  histogramName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - start;
    collector.recordHistogram(histogramName, elapsed);
  }
}

/**
 * Convenience function for timing sync operations
 */
export function measureSync<T>(
  collector: MetricsCollector,
  histogramName: string,
  fn: () => T,
): T {
  const start = Date.now();
  try {
    return fn();
  } finally {
    const elapsed = Date.now() - start;
    collector.recordHistogram(histogramName, elapsed);
  }
}
