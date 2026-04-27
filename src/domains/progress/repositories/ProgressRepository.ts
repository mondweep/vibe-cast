import { ProgressTracker } from "../entities/ProgressTracker";

export interface ProgressRepository {
  findByLearnerId(learnerId: string): Promise<ProgressTracker | null>;
  save(tracker: ProgressTracker): Promise<void>;
}
