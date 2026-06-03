import { EventHandler } from '../../../shared/domain/EventHandler';
import { DomainEvent } from '../../../shared/domain/DomainEvent';
import { IReadModelRepository } from '../../../shared/infrastructure/readmodels/IReadModelRepository';
import { MetricsReadModel } from '../../../shared/infrastructure/readmodels/ReadModels';
import { v4 as uuidv4 } from 'uuid';

export class MetricsProjector implements EventHandler {
  private eventTimestamps: Map<string, number> = new Map(); // eventId -> timestamp

  constructor(private readModelRepository: IReadModelRepository) {}

  canHandle(event: DomainEvent): boolean {
    return true; // MetricsProjector handles all events
  }

  async handle(event: DomainEvent): Promise<void> {
    const eventType = event.getEventName();
    const createdAtStr = new Date().toISOString();
    const createdAt = new Date(createdAtStr);
    const dateKey = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

    // Track event processing time
    const startTime = Date.now();
    this.eventTimestamps.set(event.getId(), startTime);

    // Get or create daily metrics
    let metrics = await this.readModelRepository.findMetricsForPeriod('DAILY', dateKey);
    if (!metrics) {
      metrics = this.createEmptyMetrics('DAILY', dateKey);
    }

    // Update counters
    metrics.total_events_processed++;
    metrics.event_count_by_type[eventType] = (metrics.event_count_by_type[eventType] || 0) + 1;

    // Track unique learners
    const learnerId = (event as any).learnerId;
    if (learnerId) {
      // Note: This is a simplification; in production, use a Set or bitmap
      metrics.total_learners_active++;
    }

    // Track badges and skills
    if (eventType === 'BadgeIssued' || eventType === 'BadgeEarned') {
      metrics.total_badges_issued++;
    }
    if (eventType === 'SkillAchieved' || eventType === 'ExerciseCompleted') {
      metrics.total_skills_achieved++;
    }

    // Update average completion time
    const processingTime = Date.now() - startTime;
    const currentAvg = metrics.average_completion_time_ms;
    const count = metrics.total_events_processed;
    metrics.average_completion_time_ms = Math.round(
      (currentAvg * (count - 1) + processingTime) / count
    );

    // Update latency percentiles (simplified)
    this.updateLatencyPercentiles(metrics, processingTime);

    metrics.updated_at = new Date().toISOString();

    await this.readModelRepository.saveMetrics(metrics);
  }

  private createEmptyMetrics(period: 'DAILY' | 'WEEKLY' | 'MONTHLY', date: string): MetricsReadModel {
    return {
      metrics_id: uuidv4() as any,
      period,
      date,
      total_events_processed: 0,
      event_count_by_type: {},
      total_learners_active: 0,
      total_badges_issued: 0,
      total_skills_achieved: 0,
      average_completion_time_ms: 0,
      latency_percentiles: {
        p50: 0,
        p95: 0,
        p99: 0
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private updateLatencyPercentiles(metrics: MetricsReadModel, newTime: number): void {
    // Simplified percentile calculation (in production, maintain full distribution)
    const current = metrics.latency_percentiles;

    if (metrics.total_events_processed === 1) {
      current.p50 = newTime;
      current.p95 = newTime;
      current.p99 = newTime;
    } else {
      // Simple moving average approximation
      current.p50 = Math.round((current.p50 * 0.9) + (newTime * 0.1));
      current.p95 = Math.round(Math.max(current.p95, newTime * 0.95));
      current.p99 = Math.round(Math.max(current.p99, newTime * 0.99));
    }
  }
}
