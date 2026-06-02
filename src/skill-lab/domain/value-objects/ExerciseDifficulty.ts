/**
 * ExerciseDifficulty Value Object
 *
 * Represents the difficulty level of an exercise.
 * Implements immutable value object pattern.
 */

export enum DifficultyLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED'
}

export class ExerciseDifficulty {
  private constructor(private readonly level: DifficultyLevel) {}

  /**
   * Factory method to create ExerciseDifficulty
   */
  public static create(level: DifficultyLevel | string): ExerciseDifficulty {
    const normalizedLevel = (level as string).toUpperCase();

    if (!Object.values(DifficultyLevel).includes(normalizedLevel as DifficultyLevel)) {
      throw new Error(
        `Invalid difficulty level: ${level}. Must be one of: ${Object.values(DifficultyLevel).join(', ')}`
      );
    }

    return new ExerciseDifficulty(normalizedLevel as DifficultyLevel);
  }

  /**
   * Get the difficulty level value
   */
  public getValue(): DifficultyLevel {
    return this.level;
  }

  /**
   * Check if this difficulty is equal to another
   */
  public equals(other: ExerciseDifficulty): boolean {
    return this.level === other.level;
  }

  /**
   * Check if this difficulty is at or above a given level
   */
  public isAtLeast(level: ExerciseDifficulty): boolean {
    const levels = [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE, DifficultyLevel.ADVANCED];
    const thisIndex = levels.indexOf(this.level);
    const otherIndex = levels.indexOf(level.level);
    return thisIndex >= otherIndex;
  }

  /**
   * String representation
   */
  public toString(): string {
    return this.level;
  }

  /**
   * JSON representation
   */
  public toJSON(): string {
    return this.level;
  }
}
