/**
 * ExerciseRepository Implementation
 *
 * Handles persistence and retrieval of Exercise aggregates using TypeORM with PostgreSQL.
 * Implements repository pattern for data access abstraction.
 *
 * Table: exercises
 * Columns: id, title, description, difficulty, time_limit, instructions, status, created_at, updated_at, published_at
 */

import { Exercise, ExerciseStatus } from '../../domain/models/Exercise';
import { DifficultyLevel } from '../../domain/value-objects/ExerciseDifficulty';

/**
 * Interface for database connection (simplified for TypeORM abstraction)
 */
export interface IDatabase {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<any>;
  transaction(callback: (db: IDatabase) => Promise<void>): Promise<void>;
}

/**
 * Data Transfer Object for Exercise persistence
 */
interface ExerciseDTO {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  time_limit: number;
  instructions: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
}

export class ExerciseRepository {
  private readonly db: IDatabase;
  private readonly tableName = 'exercises';

  constructor(db: IDatabase) {
    this.db = db;
  }

  /**
   * Save an exercise (insert or update)
   */
  async save(exercise: Exercise): Promise<void> {
    const json = exercise.toJSON() as any;

    const existingExercise = await this.findById(exercise.getId());

    if (existingExercise) {
      // Update existing
      const sql = `
        UPDATE ${this.tableName}
        SET title = $1, description = $2, difficulty = $3, time_limit = $4,
            instructions = $5, status = $6, updated_at = $7, published_at = $8
        WHERE id = $9
      `;

      const params = [
        json.title,
        json.description,
        json.difficulty,
        json.timeLimit,
        json.instructions,
        json.status,
        new Date(json.updatedAt),
        json.publishedAt ? new Date(json.publishedAt) : null,
        json.id
      ];

      await this.db.execute(sql, params);
    } else {
      // Insert new
      const sql = `
        INSERT INTO ${this.tableName}
        (id, title, description, difficulty, time_limit, instructions, status, created_at, updated_at, published_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      const params = [
        json.id,
        json.title,
        json.description,
        json.difficulty,
        json.timeLimit,
        json.instructions,
        json.status,
        new Date(json.createdAt),
        new Date(json.updatedAt),
        json.publishedAt ? new Date(json.publishedAt) : null
      ];

      await this.db.execute(sql, params);
    }
  }

  /**
   * Find an exercise by ID
   */
  async findById(id: string): Promise<Exercise | null> {
    const sql = `
      SELECT id, title, description, difficulty, time_limit as "timeLimit",
             instructions, status, created_at as "createdAt",
             updated_at as "updatedAt", published_at as "publishedAt"
      FROM ${this.tableName}
      WHERE id = $1 AND status != 'ARCHIVED'
    `;

    const results = await this.db.query(sql, [id]);

    if (results.length === 0) {
      return null;
    }

    return this.mapDTOToEntity(results[0]);
  }

  /**
   * Find all published exercises
   */
  async findPublished(): Promise<Exercise[]> {
    const sql = `
      SELECT id, title, description, difficulty, time_limit as "timeLimit",
             instructions, status, created_at as "createdAt",
             updated_at as "updatedAt", published_at as "publishedAt"
      FROM ${this.tableName}
      WHERE status = 'PUBLISHED'
      ORDER BY published_at DESC, created_at DESC
    `;

    const results = await this.db.query(sql);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find exercises by difficulty level
   */
  async findByDifficulty(difficulty: DifficultyLevel | string): Promise<Exercise[]> {
    const normalizedDifficulty = (difficulty as string).toUpperCase();

    const sql = `
      SELECT id, title, description, difficulty, time_limit as "timeLimit",
             instructions, status, created_at as "createdAt",
             updated_at as "updatedAt", published_at as "publishedAt"
      FROM ${this.tableName}
      WHERE difficulty = $1 AND status != 'ARCHIVED'
      ORDER BY created_at DESC
    `;

    const results = await this.db.query(sql, [normalizedDifficulty]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find published exercises by difficulty level
   */
  async findPublishedByDifficulty(difficulty: DifficultyLevel | string): Promise<Exercise[]> {
    const normalizedDifficulty = (difficulty as string).toUpperCase();

    const sql = `
      SELECT id, title, description, difficulty, time_limit as "timeLimit",
             instructions, status, created_at as "createdAt",
             updated_at as "updatedAt", published_at as "publishedAt"
      FROM ${this.tableName}
      WHERE difficulty = $1 AND status = 'PUBLISHED'
      ORDER BY published_at DESC
    `;

    const results = await this.db.query(sql, [normalizedDifficulty]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find draft exercises (for editing)
   */
  async findDrafts(): Promise<Exercise[]> {
    const sql = `
      SELECT id, title, description, difficulty, time_limit as "timeLimit",
             instructions, status, created_at as "createdAt",
             updated_at as "updatedAt", published_at as "publishedAt"
      FROM ${this.tableName}
      WHERE status = 'DRAFT'
      ORDER BY created_at DESC
    `;

    const results = await this.db.query(sql);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find exercises by status
   */
  async findByStatus(status: ExerciseStatus): Promise<Exercise[]> {
    const sql = `
      SELECT id, title, description, difficulty, time_limit as "timeLimit",
             instructions, status, created_at as "createdAt",
             updated_at as "updatedAt", published_at as "publishedAt"
      FROM ${this.tableName}
      WHERE status = $1
      ORDER BY created_at DESC
    `;

    const results = await this.db.query(sql, [status]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Count all non-archived exercises
   */
  async count(): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE status != 'ARCHIVED'
    `;

    const results = await this.db.query(sql);

    return results[0]?.count ?? 0;
  }

  /**
   * Count published exercises
   */
  async countPublished(): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE status = 'PUBLISHED'
    `;

    const results = await this.db.query(sql);

    return results[0]?.count ?? 0;
  }

  /**
   * Delete an exercise (hard delete - use with caution)
   */
  async delete(id: string): Promise<boolean> {
    const sql = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
    `;

    await this.db.execute(sql, [id]);

    return true;
  }

  /**
   * Archive an exercise (soft delete via status change)
   */
  async archive(id: string): Promise<void> {
    const sql = `
      UPDATE ${this.tableName}
      SET status = 'ARCHIVED', updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.execute(sql, [id]);
  }

  /**
   * Check if exercise exists
   */
  async exists(id: string): Promise<boolean> {
    const sql = `
      SELECT 1
      FROM ${this.tableName}
      WHERE id = $1 AND status != 'ARCHIVED'
      LIMIT 1
    `;

    const results = await this.db.query(sql, [id]);

    return results.length > 0;
  }

  /**
   * Map database DTO to Exercise domain model
   */
  private mapDTOToEntity(dto: ExerciseDTO): Exercise {
    return Exercise.fromPersistence(
      dto.id,
      dto.title,
      dto.description,
      dto.difficulty as DifficultyLevel,
      dto.time_limit,
      dto.instructions,
      dto.status as ExerciseStatus,
      dto.created_at,
      dto.updated_at,
      dto.published_at
    );
  }
}
