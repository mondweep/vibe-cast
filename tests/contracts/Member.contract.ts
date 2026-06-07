/**
 * Member Mock Contract Definition
 * London School TDD - Mock contracts for Member Aggregate
 *
 * Defines interactions with:
 * - Reputation Service (track reputation changes)
 * - Badge Repository (award and verify badges)
 * - Member Repository (persist member data and relationships)
 * - Follow/Follower tracking (social graph management)
 */

import { Member, Badge } from '../../src/community/domain/models/Member';

/**
 * Mock Reputation Service interface
 * Validates reputation point changes and maintains history
 */
export interface MockReputationService {
  calculatePoints: vi.MockedFunction<(action: string) => number>;
  validateChange: vi.MockedFunction<(points: number) => boolean>;
  recordHistory: vi.MockedFunction<(memberId: string, points: number, reason: string) => Promise<void>>;
  getHistory: vi.MockedFunction<(memberId: string) => Promise<Array<{points: number; reason: string; timestamp: Date}>>>;
}

/**
 * Factory for creating mock Reputation Service
 */
export function createMockReputationService(): MockReputationService {
  return {
    calculatePoints: vi.fn().mockReturnValue(10),
    validateChange: vi.fn().mockReturnValue(true),
    recordHistory: vi.fn().mockResolvedValue(undefined),
    getHistory: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Mock Badge Repository interface
 * Manages badge persistence and award logic
 */
export interface MockBadgeRepository {
  save: vi.MockedFunction<(badge: Badge) => Promise<Badge>>;
  findById: vi.MockedFunction<(id: string) => Promise<Badge | null>>;
  findByCategory: vi.MockedFunction<(category: string) => Promise<Badge[]>>;
  findEarnedByMember: vi.MockedFunction<(memberId: string) => Promise<Badge[]>>;
  award: vi.MockedFunction<(memberId: string, badge: Badge) => Promise<void>>;
}

/**
 * Factory for creating mock Badge Repository
 */
export function createMockBadgeRepository(): MockBadgeRepository {
  return {
    save: vi.fn().mockResolvedValue({
      id: `badge-${Date.now()}`,
      name: 'Test Badge',
      description: 'A test badge',
      imageUrl: 'https://example.com/badge.png',
      earnedAt: new Date(),
      category: 'LEARNER',
    }),
    findById: vi.fn().mockResolvedValue(null),
    findByCategory: vi.fn().mockResolvedValue([]),
    findEarnedByMember: vi.fn().mockResolvedValue([]),
    award: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock Member Repository interface
 * Persists member data and manages relationships
 */
export interface MockMemberRepository {
  save: vi.MockedFunction<(member: Member) => Promise<Member>>;
  findById: vi.MockedFunction<(id: string) => Promise<Member | null>>;
  findByUserId: vi.MockedFunction<(userId: string) => Promise<Member | null>>;
  findActiveMembers: vi.MockedFunction<() => Promise<Member[]>>;
  recordFollow: vi.MockedFunction<(followerId: string, followingId: string) => Promise<void>>;
  recordUnfollow: vi.MockedFunction<(followerId: string, followingId: string) => Promise<void>>;
  getFollowers: vi.MockedFunction<(memberId: string) => Promise<string[]>>;
  getFollowing: vi.MockedFunction<(memberId: string) => Promise<string[]>>;
}

/**
 * Factory for creating mock Member Repository
 */
export function createMockMemberRepository(): MockMemberRepository {
  return {
    save: vi.fn().mockResolvedValue({
      id: `member-${Date.now()}`,
      userId: 'user-123',
      reputation: 100,
      joinedAt: new Date(),
      badges: [],
      followersCount: 0,
      followingCount: 0,
    }),
    findById: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue(null),
    findActiveMembers: vi.fn().mockResolvedValue([]),
    recordFollow: vi.fn().mockResolvedValue(undefined),
    recordUnfollow: vi.fn().mockResolvedValue(undefined),
    getFollowers: vi.fn().mockResolvedValue([]),
    getFollowing: vi.fn().mockResolvedValue([]),
  };
}

/**
 * Member Test Builder
 * Fluent API for constructing test Member instances
 */
export class MemberTestBuilder {
  private id: string = `member-${Date.now()}`;
  private userId: string = 'user-123';
  private reputation: number = 0;
  private joinedAt: Date = new Date();
  private badges: Badge[] = [];
  private followersCount: number = 0;
  private followingCount: number = 0;
  private isActive: boolean = true;

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  withReputation(points: number): this {
    this.reputation = points;
    return this;
  }

  withBadges(badges: Badge[]): this {
    this.badges = badges;
    return this;
  }

  withFollowers(count: number): this {
    this.followersCount = count;
    return this;
  }

  withFollowing(count: number): this {
    this.followingCount = count;
    return this;
  }

  inactive(): this {
    this.isActive = false;
    return this;
  }

  build(): any {
    return {
      id: this.id,
      userId: this.userId,
      reputation: this.reputation,
      joinedAt: this.joinedAt,
      badges: this.badges,
      followersCount: this.followersCount,
      followingCount: this.followingCount,
      isActive: this.isActive,
    };
  }

  static aMember(): MemberTestBuilder {
    return new MemberTestBuilder();
  }
}

/**
 * Mock Badge factory for test data
 */
export function createMockBadge(
  name: string = 'Test Badge',
  category: 'LEARNER' | 'CONTRIBUTOR' | 'REVIEWER' | 'MENTOR' = 'LEARNER'
): Badge {
  return {
    id: `badge-${Date.now()}`,
    name,
    description: `Earned for ${category.toLowerCase()} contributions`,
    imageUrl: 'https://example.com/badge.png',
    earnedAt: new Date(),
    category,
  };
}

/**
 * Mock interaction verification for Member
 * Verifies correct interaction sequence with Reputation Service and Badge Repository
 */
export interface MemberInteractionSequence {
  /**
   * Step 1: Calculate reputation points for action
   */
  pointsCalculated: {
    method: 'calculatePoints';
    action: string;
    points: number;
  };

  /**
   * Step 2: Validate reputation change
   */
  changeValidated: {
    method: 'validateChange';
    points: number;
    isValid: boolean;
  };

  /**
   * Step 3: Update member reputation
   */
  reputationUpdated: {
    currentReputation: number;
    newReputation: number;
  };

  /**
   * Step 4: Record history entry
   */
  historyRecorded: {
    method: 'recordHistory';
    memberId: string;
    points: number;
    reason: string;
  };
}

/**
 * Badge Award SAGA Contract
 * Defines workflow: member action → calculate points → award badge if threshold met
 */
export interface BadgeAwardSagaContract {
  /**
   * Trigger: Member reputation reaches threshold
   */
  trigger: {
    action: string;
    pointsEarned: number;
    newTotalReputation: number;
  };

  /**
   * Step 1: Check if badge threshold is met
   */
  checkThreshold: {
    reputation: number;
    badgeCategory: 'LEARNER' | 'CONTRIBUTOR' | 'REVIEWER' | 'MENTOR';
    thresholds: {
      LEARNER: number;
      CONTRIBUTOR: number;
      REVIEWER: number;
      MENTOR: number;
    };
  };

  /**
   * Step 2: If threshold met, find badge to award
   */
  findBadge: {
    method: 'findByCategory';
    category: string;
  };

  /**
   * Step 3: Award badge to member
   */
  badgeAwarded: {
    method: 'award';
    memberId: string;
    badge: Badge;
  };

  /**
   * Step 4: Award reputation bonus for badge
   */
  bonusReputation: {
    points: number; // MENTOR: 75, REVIEWER: 50, CONTRIBUTOR: 25, LEARNER: 10
  };
}

/**
 * Follow/Unfollow SAGA Contract
 * Defines workflow: initiate follow → record relationship → update counts
 */
export interface FollowSagaContract {
  /**
   * Step 1: Member A initiates follow of Member B
   */
  followInitiated: {
    followerId: string;
    targetMemberId: string;
  };

  /**
   * Step 2: Record follow relationship (idempotent)
   */
  relationshipRecorded: {
    method: 'recordFollow';
    followerId: string;
    followingId: string;
  };

  /**
   * Step 3: Update follower's "following" count
   */
  followerCountsUpdated: {
    member: string;
    followingCountIncremented: number;
  };

  /**
   * Step 4: Update target's "followers" count
   */
  targetCountsUpdated: {
    member: string;
    followersCountIncremented: number;
  };
}

/**
 * Member domain events contract
 */
export interface MemberDomainEventContract {
  MemberJoined: {
    aggregateId: string;
    aggregateType: 'Member';
    eventType: 'MemberJoined';
    payload: {
      memberId: string;
      userId: string;
      joinedAt: Date;
    };
  };

  ReputationUpdated: {
    aggregateId: string;
    aggregateType: 'Member';
    eventType: 'ReputationUpdated';
    payload: {
      memberId: string;
      previousReputation: number;
      newReputation: number;
      points: number;
      reason: string;
      timestamp: Date;
    };
  };

  BadgeAwarded: {
    aggregateId: string;
    aggregateType: 'Member';
    eventType: 'BadgeAwarded';
    payload: {
      memberId: string;
      badgeId: string;
      badgeName: string;
      category: string;
      reputationBonus: number;
      earnedAt: Date;
    };
  };

  MemberFollowed: {
    aggregateId: string;
    aggregateType: 'Member';
    eventType: 'MemberFollowed';
    payload: {
      followerId: string;
      followingId: string;
      timestamp: Date;
    };
  };

  MemberUnfollowed: {
    aggregateId: string;
    aggregateType: 'Member';
    eventType: 'MemberUnfollowed';
    payload: {
      followerId: string;
      followingId: string;
      timestamp: Date;
    };
  };
}
