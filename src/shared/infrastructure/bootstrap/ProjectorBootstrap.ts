import { IEventBus } from '../events/IEventBus';
import { IReadModelRepository } from '../readmodels/IReadModelRepository';
import { LearnerProfileProjector } from '../../../learning/infrastructure/projectors/LearnerProfileProjector';
import { CertificationProgressProjector } from '../../../certification/infrastructure/projectors/CertificationProgressProjector';
import { CommunityProfileProjector } from '../../../community/infrastructure/projectors/CommunityProfileProjector';
import { MetricsProjector } from '../../../metrics/infrastructure/projectors/MetricsProjector';

export class ProjectorBootstrap {
  static registerProjectors(eventBus: IEventBus, readModelRepository: IReadModelRepository): void {
    // Create projector instances
    const learnerProfileProjector = new LearnerProfileProjector(readModelRepository);
    const certificationProgressProjector = new CertificationProgressProjector(readModelRepository);
    const communityProfileProjector = new CommunityProfileProjector(readModelRepository);
    const metricsProjector = new MetricsProjector(readModelRepository);

    // ============ LearnerProfileProjector subscriptions ============
    eventBus.subscribe('EnrollmentCompleted', learnerProfileProjector);
    eventBus.subscribe('BadgeIssued', learnerProfileProjector);
    eventBus.subscribe('ExerciseCompleted', learnerProfileProjector);

    // ============ CertificationProgressProjector subscriptions ============
    eventBus.subscribe('ExamCompleted', certificationProgressProjector);
    eventBus.subscribe('BadgeIssued', certificationProgressProjector);

    // ============ CommunityProfileProjector subscriptions ============
    eventBus.subscribe('BadgeEarned', communityProfileProjector);
    eventBus.subscribe('SkillAchieved', communityProfileProjector);

    // ============ MetricsProjector subscriptions ============
    // MetricsProjector subscribes to all events via the catch-all handler
    // We can add specific event subscriptions for better performance
    eventBus.subscribe('EnrollmentCompleted', metricsProjector);
    eventBus.subscribe('ExamCompleted', metricsProjector);
    eventBus.subscribe('BadgeIssued', metricsProjector);
    eventBus.subscribe('BadgeEarned', metricsProjector);
    eventBus.subscribe('SkillAchieved', metricsProjector);
    eventBus.subscribe('ExerciseCompleted', metricsProjector);
  }
}
