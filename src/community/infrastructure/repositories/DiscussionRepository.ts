/**
 * DiscussionRepository
 * Persistence layer for Discussion aggregate using TypeORM with PostgreSQL
 * Domain: Community
 */

import { Discussion, DiscussionStatus } from '../../domain/models/Discussion';

export interface IDiscussionRepository {
  save(discussion: Discussion): Promise<void>;
  findById(id: string): Promise<Discussion | null>;
  findByCreatedBy(createdBy: string): Promise<Discussion[]>;
  findByStatus(status: DiscussionStatus): Promise<Discussion[]>;
  findRecent(limit: number): Promise<Discussion[]>;
  findByTag(tag: string): Promise<Discussion[]>;
  findTrending(limit: number): Promise<Discussion[]>;
  delete(id: string): Promise<void>;
}

/**
 * Mock DiscussionRepository for TDD demonstration
 * In production, would use TypeORM DataSource and entities
 */
export class DiscussionRepository implements IDiscussionRepository {
  // In-memory store for testing (would be database in production)
  private discussions: Map<string, any> = new Map();

  /**
   * Save a discussion (create or update)
   * In production: INSERT INTO discussions (...) ON CONFLICT DO UPDATE
   */
  async save(discussion: Discussion): Promise<void> {
    const data = {
      id: discussion.getId(),
      createdBy: discussion.getCreatedBy(),
      title: discussion.getTitle(),
      body: discussion.getBody(),
      upvotes: discussion.getUpvotes(),
      downvotes: discussion.getDownvotes(),
      replies: discussion.getReplies(),
      status: discussion.getStatus(),
      createdAt: discussion.getCreatedAt(),
      updatedAt: discussion.getUpdatedAt(),
      closedAt: discussion.getClosedAt(),
      tags: discussion.getTags(),
      isModerated: discussion.getIsModerated(),
      moderatorNotes: discussion.getModeratorNotes(),
    };

    this.discussions.set(discussion.getId(), data);

    // In production:
    // await db.query(`
    //   INSERT INTO discussions (
    //     id, created_by, title, body, upvotes, downvotes, replies,
    //     status, created_at, updated_at, closed_at, tags, is_moderated, moderator_notes
    //   )
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    //   ON CONFLICT(id) DO UPDATE SET
    //     title = EXCLUDED.title,
    //     body = EXCLUDED.body,
    //     upvotes = EXCLUDED.upvotes,
    //     downvotes = EXCLUDED.downvotes,
    //     replies = EXCLUDED.replies,
    //     status = EXCLUDED.status,
    //     updated_at = EXCLUDED.updated_at,
    //     closed_at = EXCLUDED.closed_at,
    //     tags = EXCLUDED.tags,
    //     is_moderated = EXCLUDED.is_moderated,
    //     moderator_notes = EXCLUDED.moderator_notes
    // `, [...]);
  }

  /**
   * Find discussion by ID
   * In production: SELECT * FROM discussions WHERE id = $1
   */
  async findById(id: string): Promise<Discussion | null> {
    const data = this.discussions.get(id);
    if (!data) {
      return null;
    }

    return Discussion.restore(data);

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM discussions WHERE id = $1',
    //   [id]
    // );
    // return result.rows[0] ? Discussion.restore(result.rows[0]) : null;
  }

  /**
   * Find all discussions created by a member
   * In production: SELECT * FROM discussions WHERE created_by = $1 ORDER BY created_at DESC
   */
  async findByCreatedBy(createdBy: string): Promise<Discussion[]> {
    const results: Discussion[] = [];

    for (const data of this.discussions.values()) {
      if (data.createdBy === createdBy) {
        results.push(Discussion.restore(data));
      }
    }

    // Sort by created_at descending
    results.sort(
      (a, b) =>
        b.getCreatedAt().getTime() - a.getCreatedAt().getTime(),
    );

    return results;

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM discussions WHERE created_by = $1 ORDER BY created_at DESC',
    //   [createdBy]
    // );
    // return result.rows.map(row => Discussion.restore(row));
  }

  /**
   * Find discussions by status (OPEN, CLOSED, ARCHIVED, HIDDEN)
   * In production: SELECT * FROM discussions WHERE status = $1
   */
  async findByStatus(status: DiscussionStatus): Promise<Discussion[]> {
    const results: Discussion[] = [];

    for (const data of this.discussions.values()) {
      if (data.status === status) {
        results.push(Discussion.restore(data));
      }
    }

    return results;

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM discussions WHERE status = $1 ORDER BY created_at DESC',
    //   [status]
    // );
    // return result.rows.map(row => Discussion.restore(row));
  }

  /**
   * Get most recent discussions
   * In production: SELECT * FROM discussions WHERE status != 'HIDDEN' ORDER BY created_at DESC LIMIT $1
   */
  async findRecent(limit: number): Promise<Discussion[]> {
    const results: Discussion[] = [];

    for (const data of this.discussions.values()) {
      if (data.status !== DiscussionStatus.HIDDEN) {
        results.push(Discussion.restore(data));
      }
    }

    // Sort by created_at descending
    results.sort(
      (a, b) =>
        b.getCreatedAt().getTime() - a.getCreatedAt().getTime(),
    );

    return results.slice(0, limit);

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM discussions WHERE status != $1 ORDER BY created_at DESC LIMIT $2',
    //   [DiscussionStatus.HIDDEN, limit]
    // );
    // return result.rows.map(row => Discussion.restore(row));
  }

  /**
   * Find discussions by tag
   * In production: SELECT * FROM discussions WHERE tags @> ARRAY[$1]
   */
  async findByTag(tag: string): Promise<Discussion[]> {
    const results: Discussion[] = [];
    const normalizedTag = tag.toLowerCase();

    for (const data of this.discussions.values()) {
      if (data.tags.includes(normalizedTag)) {
        results.push(Discussion.restore(data));
      }
    }

    return results;

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM discussions WHERE tags @> ARRAY[$1] ORDER BY created_at DESC',
    //   [tag.toLowerCase()]
    // );
    // return result.rows.map(row => Discussion.restore(row));
  }

  /**
   * Get trending discussions by score (upvotes - downvotes)
   * In production: SELECT * FROM discussions WHERE status = 'OPEN' ORDER BY (upvotes - downvotes) DESC LIMIT $1
   */
  async findTrending(limit: number): Promise<Discussion[]> {
    const results: Discussion[] = [];

    for (const data of this.discussions.values()) {
      if (data.status === DiscussionStatus.OPEN) {
        results.push(Discussion.restore(data));
      }
    }

    // Sort by score (upvotes - downvotes) descending
    results.sort((a, b) => b.getScore() - a.getScore());

    return results.slice(0, limit);

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM discussions WHERE status = $1 ORDER BY (upvotes - downvotes) DESC LIMIT $2',
    //   [DiscussionStatus.OPEN, limit]
    // );
    // return result.rows.map(row => Discussion.restore(row));
  }

  /**
   * Delete a discussion (hard delete for testing)
   * In production: would implement soft delete with deleted_at timestamp
   */
  async delete(id: string): Promise<void> {
    this.discussions.delete(id);

    // In production (soft delete):
    // await db.query(
    //   'UPDATE discussions SET deleted_at = NOW() WHERE id = $1',
    //   [id]
    // );
  }

  /**
   * Helper: get all discussions (for testing)
   */
  async findAll(): Promise<Discussion[]> {
    const results: Discussion[] = [];
    for (const data of this.discussions.values()) {
      results.push(Discussion.restore(data));
    }
    return results;
  }

  /**
   * Helper: get count (for testing pagination)
   */
  async count(): Promise<number> {
    return this.discussions.size;
  }

  /**
   * Helper: clear all (for testing)
   */
  async clear(): Promise<void> {
    this.discussions.clear();
  }
}

/**
 * PostgreSQL Schema (for reference)
 *
 * CREATE TABLE discussions (
 *   id UUID PRIMARY KEY,
 *   created_by UUID NOT NULL,
 *   title VARCHAR(500) NOT NULL,
 *   body TEXT NOT NULL,
 *   upvotes INTEGER NOT NULL DEFAULT 0,
 *   downvotes INTEGER NOT NULL DEFAULT 0,
 *   replies JSONB NOT NULL DEFAULT '[]',
 *   status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
 *   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
 *   closed_at TIMESTAMP,
 *   tags TEXT[] NOT NULL DEFAULT '{}',
 *   is_moderated BOOLEAN NOT NULL DEFAULT false,
 *   moderator_notes TEXT DEFAULT '',
 *   deleted_at TIMESTAMP
 * );
 *
 * CREATE INDEX idx_discussions_created_by ON discussions(created_by);
 * CREATE INDEX idx_discussions_status ON discussions(status);
 * CREATE INDEX idx_discussions_created_at ON discussions(created_at DESC);
 * CREATE INDEX idx_discussions_score ON discussions((upvotes - downvotes) DESC);
 * CREATE INDEX idx_discussions_tags ON discussions USING GIN(tags);
 * CREATE INDEX idx_discussions_deleted_at ON discussions(deleted_at);
 */
