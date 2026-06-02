/**
 * LabSessionRepository Implementation
 *
 * Handles persistence and retrieval of LabSession aggregates using TypeORM with PostgreSQL.
 * Implements repository pattern for data access abstraction.
 *
 * Table: lab_sessions
 * Columns: id, exercise_id, learner_id, started_at, submitted_at, evaluated_at, abandoned_at,
 *          status, submission_data, submission_result, evaluation_result, attempt_count, time_spent_seconds
 */

import { LabSession, LabSessionStatus, SubmissionResult, EvaluationResult } from '../../domain/models/LabSession';

/**
 * Interface for database connection (simplified for TypeORM abstraction)
 */
export interface IDatabase {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<any>;
  transaction(callback: (db: IDatabase) => Promise<void>): Promise<void>;
}

/**
 * Data Transfer Object for LabSession persistence
 */
interface LabSessionDTO {
  id: string;
  exercise_id: string;
  learner_id: string;
  started_at: Date;
  submitted_at: Date | null;
  evaluated_at: Date | null;
  abandoned_at: Date | null;
  status: string;
  submission_data: string | null;
  submission_result: string | null;
  evaluation_result: string | null;
  attempt_count: number;
  time_spent_seconds: number;
}

export class LabSessionRepository {
  private readonly db: IDatabase;
  private readonly tableName = 'lab_sessions';

  constructor(db: IDatabase) {
    this.db = db;
  }

  /**
   * Save a lab session (insert or update)
   */
  async save(labSession: LabSession): Promise<void> {
    const json = labSession.toJSON() as any;

    const existingSession = await this.findById(labSession.getId());

    if (existingSession) {
      // Update existing
      const sql = `
        UPDATE ${this.tableName}
        SET exercise_id = $1, learner_id = $2, started_at = $3,
            submitted_at = $4, evaluated_at = $5, abandoned_at = $6,
            status = $7, submission_data = $8, submission_result = $9,
            evaluation_result = $10, attempt_count = $11, time_spent_seconds = $12
        WHERE id = $13
      `;

      const params = [
        json.exerciseId,
        json.learnerId,
        new Date(json.startedAt),
        json.submittedAt ? new Date(json.submittedAt) : null,
        json.evaluatedAt ? new Date(json.evaluatedAt) : null,
        json.abandonedAt ? new Date(json.abandonedAt) : null,
        json.status,
        json.submissionData,
        json.submissionResult ? JSON.stringify(json.submissionResult) : null,
        json.evaluationResult ? JSON.stringify(json.evaluationResult) : null,
        json.attemptCount,
        json.timeSpentSeconds,
        json.id
      ];

      await this.db.execute(sql, params);
    } else {
      // Insert new
      const sql = `
        INSERT INTO ${this.tableName}
        (id, exercise_id, learner_id, started_at, submitted_at, evaluated_at,
         abandoned_at, status, submission_data, submission_result, evaluation_result,
         attempt_count, time_spent_seconds)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;

      const params = [
        json.id,
        json.exerciseId,
        json.learnerId,
        new Date(json.startedAt),
        json.submittedAt ? new Date(json.submittedAt) : null,
        json.evaluatedAt ? new Date(json.evaluatedAt) : null,
        json.abandonedAt ? new Date(json.abandonedAt) : null,
        json.status,
        json.submissionData,
        json.submissionResult ? JSON.stringify(json.submissionResult) : null,
        json.evaluationResult ? JSON.stringify(json.evaluationResult) : null,
        json.attemptCount,
        json.timeSpentSeconds
      ];

      await this.db.execute(sql, params);
    }
  }

  /**
   * Find a lab session by ID
   */
  async findById(id: string): Promise<LabSession | null> {
    const sql = `
      SELECT id, exercise_id as "exerciseId", learner_id as "learnerId",
             started_at as "startedAt", submitted_at as "submittedAt",
             evaluated_at as "evaluatedAt", abandoned_at as "abandonedAt",
             status, submission_data as "submissionData",
             submission_result as "submissionResult",
             evaluation_result as "evaluationResult",
             attempt_count as "attemptCount", time_spent_seconds as "timeSpentSeconds"
      FROM ${this.tableName}
      WHERE id = $1
    `;

    const results = await this.db.query(sql, [id]);

    if (results.length === 0) {
      return null;
    }

    return this.mapDTOToEntity(results[0]);
  }

  /**
   * Find all active sessions for a learner
   */
  async findActiveSessions(learnerId: string): Promise<LabSession[]> {
    const sql = `
      SELECT id, exercise_id as "exerciseId", learner_id as "learnerId",
             started_at as "startedAt", submitted_at as "submittedAt",
             evaluated_at as "evaluatedAt", abandoned_at as "abandonedAt",
             status, submission_data as "submissionData",
             submission_result as "submissionResult",
             evaluation_result as "evaluationResult",
             attempt_count as "attemptCount", time_spent_seconds as "timeSpentSeconds"
      FROM ${this.tableName}
      WHERE learner_id = $1 AND status = 'ACTIVE'
      ORDER BY started_at DESC
    `;

    const results = await this.db.query(sql, [learnerId]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find all sessions for a learner
   */
  async findByLearnerId(learnerId: string, limit: number = 50, offset: number = 0): Promise<LabSession[]> {
    const sql = `
      SELECT id, exercise_id as "exerciseId", learner_id as "learnerId",
             started_at as "startedAt", submitted_at as "submittedAt",
             evaluated_at as "evaluatedAt", abandoned_at as "abandonedAt",
             status, submission_data as "submissionData",
             submission_result as "submissionResult",
             evaluation_result as "evaluationResult",
             attempt_count as "attemptCount", time_spent_seconds as "timeSpentSeconds"
      FROM ${this.tableName}
      WHERE learner_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `;

    const results = await this.db.query(sql, [learnerId, limit, offset]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find all sessions for an exercise
   */
  async findByExerciseId(exerciseId: string, limit: number = 50, offset: number = 0): Promise<LabSession[]> {
    const sql = `
      SELECT id, exercise_id as "exerciseId", learner_id as "learnerId",
             started_at as "startedAt", submitted_at as "submittedAt",
             evaluated_at as "evaluatedAt", abandoned_at as "abandonedAt",
             status, submission_data as "submissionData",
             submission_result as "submissionResult",
             evaluation_result as "evaluationResult",
             attempt_count as "attemptCount", time_spent_seconds as "timeSpentSeconds"
      FROM ${this.tableName}
      WHERE exercise_id = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `;

    const results = await this.db.query(sql, [exerciseId, limit, offset]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find sessions by status
   */
  async findByStatus(status: LabSessionStatus, limit: number = 50, offset: number = 0): Promise<LabSession[]> {
    const sql = `
      SELECT id, exercise_id as "exerciseId", learner_id as "learnerId",
             started_at as "startedAt", submitted_at as "submittedAt",
             evaluated_at as "evaluatedAt", abandoned_at as "abandonedAt",
             status, submission_data as "submissionData",
             submission_result as "submissionResult",
             evaluation_result as "evaluationResult",
             attempt_count as "attemptCount", time_spent_seconds as "timeSpentSeconds"
      FROM ${this.tableName}
      WHERE status = $1
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3
    `;

    const results = await this.db.query(sql, [status, limit, offset]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Find evaluated sessions
   */
  async findEvaluatedSessions(limit: number = 50, offset: number = 0): Promise<LabSession[]> {
    const sql = `
      SELECT id, exercise_id as "exerciseId", learner_id as "learnerId",
             started_at as "startedAt", submitted_at as "submittedAt",
             evaluated_at as "evaluatedAt", abandoned_at as "abandonedAt",
             status, submission_data as "submissionData",
             submission_result as "submissionResult",
             evaluation_result as "evaluationResult",
             attempt_count as "attemptCount", time_spent_seconds as "timeSpentSeconds"
      FROM ${this.tableName}
      WHERE status = 'EVALUATED'
      ORDER BY evaluated_at DESC
      LIMIT $1 OFFSET $2
    `;

    const results = await this.db.query(sql, [limit, offset]);

    return results.map((row: any) => this.mapDTOToEntity(row));
  }

  /**
   * Count sessions for a learner
   */
  async countByLearnerId(learnerId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE learner_id = $1
    `;

    const results = await this.db.query(sql, [learnerId]);

    return results[0]?.count ?? 0;
  }

  /**
   * Count sessions for an exercise
   */
  async countByExerciseId(exerciseId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE exercise_id = $1
    `;

    const results = await this.db.query(sql, [exerciseId]);

    return results[0]?.count ?? 0;
  }

  /**
   * Count total sessions
   */
  async count(): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    const results = await this.db.query(sql);

    return results[0]?.count ?? 0;
  }

  /**
   * Get statistics for an exercise
   */
  async getExerciseStats(exerciseId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number | null;
    averageTimeSeconds: number | null;
  }> {
    const sql = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'EVALUATED' THEN 1 END) as completed_sessions,
        AVG(CASE WHEN status = 'EVALUATED' THEN (evaluation_result::json->>'score')::float END) as avg_score,
        AVG(CASE WHEN status = 'EVALUATED' THEN time_spent_seconds END) as avg_time_seconds
      FROM ${this.tableName}
      WHERE exercise_id = $1
    `;

    const results = await this.db.query(sql, [exerciseId]);

    const row = results[0];

    return {
      totalSessions: parseInt(row?.total_sessions ?? 0),
      completedSessions: parseInt(row?.completed_sessions ?? 0),
      averageScore: row?.avg_score ? parseFloat(row.avg_score) : null,
      averageTimeSeconds: row?.avg_time_seconds ? parseFloat(row.avg_time_seconds) : null
    };
  }

  /**
   * Delete a session (hard delete)
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
   * Check if a session exists
   */
  async exists(id: string): Promise<boolean> {
    const sql = `
      SELECT 1
      FROM ${this.tableName}
      WHERE id = $1
      LIMIT 1
    `;

    const results = await this.db.query(sql, [id]);

    return results.length > 0;
  }

  /**
   * Map database DTO to LabSession domain model
   */
  private mapDTOToEntity(dto: LabSessionDTO): LabSession {
    const submissionResult = dto.submission_result
      ? (JSON.parse(dto.submission_result) as SubmissionResult)
      : null;

    const evaluationResult = dto.evaluation_result
      ? (JSON.parse(dto.evaluation_result) as EvaluationResult)
      : null;

    // Convert timestamp string back to Date if present
    if (evaluationResult && evaluationResult.timestamp && typeof evaluationResult.timestamp === 'string') {
      evaluationResult.timestamp = new Date(evaluationResult.timestamp);
    }

    return LabSession.fromPersistence(
      dto.id,
      dto.exercise_id,
      dto.learner_id,
      dto.started_at,
      dto.status as LabSessionStatus,
      dto.submitted_at,
      dto.evaluated_at,
      dto.abandoned_at,
      dto.submission_data,
      submissionResult,
      evaluationResult,
      dto.attempt_count,
      dto.time_spent_seconds
    );
  }
}
