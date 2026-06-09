/**
 * Pattern Aggregate Root
 * Represents a community-contributed orchestration pattern
 * Domain: Community — Pattern Repository (ADR-016, P1)
 * Max 200 lines
 */

export enum PatternCategory {
  Consensus = 'Consensus',
  Topology = 'Topology',
  Memory = 'Memory',
  Security = 'Security',
  Coordination = 'Coordination',
  Pipeline = 'Pipeline',
}

export enum PatternStatus {
  DRAFT = 'DRAFT',
  IN_MODERATION = 'IN_MODERATION',
  PUBLISHED = 'PUBLISHED',
  FLAGGED = 'FLAGGED',
  REJECTED = 'REJECTED',
}

export type PatternDifficulty = 'beginner' | 'intermediate' | 'advanced';

export class Pattern {
  private constructor(
    public readonly id: string,
    public readonly authorId: string,
    public title: string,
    public readonly category: PatternCategory,
    public readonly difficulty: PatternDifficulty,
    public readonly problem: string,
    public readonly solution: string,
    public readonly codeExample: string,
    public readonly productionContext: string | null,
    public readonly performanceNotes: string | null,
    public readonly knownLimitations: string | null,
    public status: PatternStatus,
    public stars: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  /**
   * Factory: create a new pattern (starts in IN_MODERATION)
   */
  static create(
    authorId: string,
    title: string,
    category: PatternCategory,
    difficulty: PatternDifficulty,
    problem: string,
    solution: string,
    codeExample: string,
  ): Pattern {
    if (!authorId || !authorId.trim()) {
      throw new Error('authorId is required');
    }
    if (!title || !title.trim()) {
      throw new Error('Pattern title cannot be empty');
    }
    if (title.length > 200) {
      throw new Error('Pattern title must be under 200 characters');
    }
    if (!problem || !problem.trim()) {
      throw new Error('Pattern problem statement cannot be empty');
    }
    if (!solution || !solution.trim()) {
      throw new Error('Pattern solution cannot be empty');
    }

    const now = new Date();
    const id = crypto.randomUUID();
    return new Pattern(
      id,
      authorId,
      title.trim(),
      category,
      difficulty,
      problem.trim(),
      solution.trim(),
      codeExample,
      null,
      null,
      null,
      PatternStatus.IN_MODERATION,
      0,
      now,
      now,
    );
  }

  /**
   * Factory: restore from persistence
   */
  static fromPersistence(
    id: string,
    authorId: string,
    title: string,
    category: PatternCategory,
    difficulty: PatternDifficulty,
    problem: string,
    solution: string,
    codeExample: string,
    productionContext: string | null,
    performanceNotes: string | null,
    knownLimitations: string | null,
    status: PatternStatus,
    stars: number,
    createdAt: Date,
    updatedAt: Date,
  ): Pattern {
    return new Pattern(
      id,
      authorId,
      title,
      category,
      difficulty,
      problem,
      solution,
      codeExample,
      productionContext,
      performanceNotes,
      knownLimitations,
      status,
      stars,
      createdAt,
      updatedAt,
    );
  }

  /** Moderator approves — transitions to PUBLISHED */
  publish(): void {
    if (this.status === PatternStatus.REJECTED) {
      throw new Error('Cannot publish a rejected pattern');
    }
    this.status = PatternStatus.PUBLISHED;
    this.updatedAt = new Date();
  }

  /** Flag for re-moderation */
  flag(_reason: string): void {
    if (this.status === PatternStatus.REJECTED) {
      throw new Error('Cannot flag a rejected pattern');
    }
    this.status = PatternStatus.FLAGGED;
    this.updatedAt = new Date();
  }

  /** Moderator rejects */
  reject(_reason: string): void {
    this.status = PatternStatus.REJECTED;
    this.updatedAt = new Date();
  }

  /** Update aggregated star rating */
  updateStars(newAvg: number): void {
    if (newAvg < 0 || newAvg > 5) {
      throw new Error('Stars must be between 0 and 5');
    }
    this.stars = Math.round(newAvg * 100) / 100;
    this.updatedAt = new Date();
  }
}
