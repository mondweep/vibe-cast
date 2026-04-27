import { Learner } from "../entities/Learner";

export interface LearnerRepository {
  findById(id: string): Promise<Learner | null>;
  save(learner: Learner): Promise<void>;
}
