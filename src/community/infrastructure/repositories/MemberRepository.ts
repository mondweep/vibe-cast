/**
 * MemberRepository
 * Persistence layer for Member aggregate using TypeORM with PostgreSQL
 * Domain: Community
 * Max 300 lines
 */

import { Member, Badge } from '../../domain/models/Member';
import { ReputationScore } from '../../domain/value-objects/ReputationScore';

/**
 * Mock MemberRepository for TDD demonstration
 * In production, would use TypeORM DataSource and entities
 */
export interface IMemberRepository {
  save(member: Member): Promise<void>;
  findById(id: string): Promise<Member | null>;
  findByUserId(userId: string): Promise<Member | null>;
  findByReputation(minScore: number, maxScore: number): Promise<Member[]>;
  findLeaderboard(limit: number, offset: number): Promise<Member[]>;
  findByBadge(badgeId: string): Promise<Member[]>;
  delete(id: string): Promise<void>;
}

export class MemberRepository implements IMemberRepository {
  // In-memory store for testing (would be database in production)
  private members: Map<string, any> = new Map();

  /**
   * Save a member (create or update)
   * In production: INSERT INTO members (...) ON CONFLICT DO UPDATE
   */
  async save(member: Member): Promise<void> {
    const data = {
      id: member.getId(),
      userId: member.getUserId(),
      reputation: member.getReputationValue(),
      joinedAt: member.getJoinedAt(),
      badges: member.getBadges(),
      followersCount: member.getFollowersCount(),
      followingCount: member.getFollowingCount(),
      updatedAt: member.getUpdatedAt(),
      isActive: member.getIsActive(),
    };

    this.members.set(member.getId(), data);

    // In production:
    // await db.query(`
    //   INSERT INTO members (id, user_id, reputation, joined_at, badges, followers_count, following_count, updated_at, is_active)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    //   ON CONFLICT(id) DO UPDATE SET
    //     reputation = EXCLUDED.reputation,
    //     badges = EXCLUDED.badges,
    //     followers_count = EXCLUDED.followers_count,
    //     following_count = EXCLUDED.following_count,
    //     updated_at = EXCLUDED.updated_at,
    //     is_active = EXCLUDED.is_active
    // `, [id, userId, reputation, joinedAt, badges, followersCount, followingCount, updatedAt, isActive]);
  }

  /**
   * Find member by ID
   * In production: SELECT * FROM members WHERE id = $1
   */
  async findById(id: string): Promise<Member | null> {
    const data = this.members.get(id);
    if (!data) {
      return null;
    }

    return Member.restore(data);

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM members WHERE id = $1',
    //   [id]
    // );
    // return result.rows[0] ? Member.restore(result.rows[0]) : null;
  }

  /**
   * Find member by userId
   * In production: SELECT * FROM members WHERE user_id = $1
   */
  async findByUserId(userId: string): Promise<Member | null> {
    for (const data of this.members.values()) {
      if (data.userId === userId) {
        return Member.restore(data);
      }
    }
    return null;

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM members WHERE user_id = $1',
    //   [userId]
    // );
    // return result.rows[0] ? Member.restore(result.rows[0]) : null;
  }

  /**
   * Find members by reputation range
   * Supports leaderboard queries
   * In production: SELECT * FROM members WHERE reputation BETWEEN $1 AND $2 ORDER BY reputation DESC
   */
  async findByReputation(
    minScore: number,
    maxScore: number,
  ): Promise<Member[]> {
    const results: Member[] = [];

    for (const data of this.members.values()) {
      const rep = data.reputation;
      if (rep >= minScore && rep <= maxScore) {
        results.push(Member.restore(data));
      }
    }

    // Sort by reputation descending
    results.sort((a, b) => b.getReputationValue() - a.getReputationValue());

    return results;

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM members WHERE reputation BETWEEN $1 AND $2 ORDER BY reputation DESC',
    //   [minScore, maxScore]
    // );
    // return result.rows.map(row => Member.restore(row));
  }

  /**
   * Get leaderboard of top members by reputation
   * In production: SELECT * FROM members WHERE is_active = true ORDER BY reputation DESC LIMIT $1 OFFSET $2
   */
  async findLeaderboard(limit: number, offset: number): Promise<Member[]> {
    const results: Member[] = [];

    for (const data of this.members.values()) {
      if (data.isActive) {
        results.push(Member.restore(data));
      }
    }

    // Sort by reputation descending
    results.sort((a, b) => b.getReputationValue() - a.getReputationValue());

    // Apply pagination
    return results.slice(offset, offset + limit);

    // In production:
    // const result = await db.query(
    //   'SELECT * FROM members WHERE is_active = true ORDER BY reputation DESC LIMIT $1 OFFSET $2',
    //   [limit, offset]
    // );
    // return result.rows.map(row => Member.restore(row));
  }

  /**
   * Find all members with a specific badge
   * In production: SELECT * FROM members WHERE badges @> $1 (JSONB contains)
   */
  async findByBadge(badgeId: string): Promise<Member[]> {
    const results: Member[] = [];

    for (const data of this.members.values()) {
      const hasBadge = data.badges.some((b: Badge) => b.id === badgeId);
      if (hasBadge) {
        results.push(Member.restore(data));
      }
    }

    return results;

    // In production:
    // const result = await db.query(
    //   `SELECT * FROM members
    //    WHERE badges @> jsonb_build_array(jsonb_build_object('id', $1))`,
    //   [badgeId]
    // );
    // return result.rows.map(row => Member.restore(row));
  }

  /**
   * Delete a member (hard delete for testing)
   * In production: would implement soft delete with deleted_at timestamp
   */
  async delete(id: string): Promise<void> {
    this.members.delete(id);

    // In production (soft delete):
    // await db.query(
    //   'UPDATE members SET deleted_at = NOW() WHERE id = $1',
    //   [id]
    // );

    // Hard delete after retention period (30 days):
    // await db.query(
    //   'DELETE FROM members WHERE deleted_at < NOW() - INTERVAL \'30 days\' AND id = $1',
    //   [id]
    // );
  }

  /**
   * Helper: get all members (for testing)
   */
  async findAll(): Promise<Member[]> {
    const results: Member[] = [];
    for (const data of this.members.values()) {
      results.push(Member.restore(data));
    }
    return results;
  }

  /**
   * Helper: get count (for testing pagination)
   */
  async count(): Promise<number> {
    return this.members.size;
  }

  /**
   * Helper: clear all (for testing)
   */
  async clear(): Promise<void> {
    this.members.clear();
  }
}

/**
 * PostgreSQL Schema (for reference)
 *
 * CREATE TABLE members (
 *   id UUID PRIMARY KEY,
 *   user_id UUID NOT NULL UNIQUE,
 *   reputation INTEGER NOT NULL DEFAULT 0,
 *   joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
 *   badges JSONB NOT NULL DEFAULT '[]',
 *   followers_count INTEGER NOT NULL DEFAULT 0,
 *   following_count INTEGER NOT NULL DEFAULT 0,
 *   updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
 *   is_active BOOLEAN NOT NULL DEFAULT true,
 *   created_at TIMESTAMP NOT NULL DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_members_user_id ON members(user_id);
 * CREATE INDEX idx_members_reputation ON members(reputation DESC);
 * CREATE INDEX idx_members_is_active ON members(is_active);
 * CREATE INDEX idx_members_joined_at ON members(joined_at);
 *
 * Badge structure (JSONB):
 * {
 *   "id": "badge_001",
 *   "name": "Code Reviewer",
 *   "description": "...",
 *   "imageUrl": "...",
 *   "earnedAt": "2026-06-02T10:00:00Z",
 *   "category": "REVIEWER"
 * }
 */
