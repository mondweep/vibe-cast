/**
 * Member Aggregate Unit Tests
 * London School TDD - Focus on Member behavior, reputation tracking, and badge awarding
 *
 * Coverage targets:
 * - Member creation and reputation management
 * - Badge award SAGA (threshold checks, reputation bonuses)
 * - Follow/Unfollow interactions
 * - Reputation history tracking
 * - EventBus event publishing
 */

import { Member } from '../../../src/community/domain/models/Member';
import { MemberTestBuilder, createMockMemberRepository, createMockReputationService, createMockBadgeRepository, createMockBadge } from '../../contracts/Member.contract';

describe('Member Aggregate', () => {
  let mockRepository: any;
  let mockReputationService: any;
  let mockBadgeRepository: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockRepository = createMockMemberRepository();
    mockReputationService = createMockReputationService();
    mockBadgeRepository = createMockBadgeRepository();
    mockEventBus = { publish: vi.fn().mockResolvedValue(undefined) };
  });

  describe('Member Creation and Initialization', () => {
    it('should create a member with initial reputation 0 and no badges', () => {
      const member = Member.create('user-123');
      expect(member.getReputationValue()).toBe(0);
      expect(member.getBadges()).toHaveLength(0);
      expect(member.getFollowersCount()).toBe(0);
    });

    it('should set userId on creation', () => {
      const member = Member.create('user-abc');
      expect(member.getUserId()).toBe('user-abc');
    });

    it('should set joinedAt timestamp on creation', () => {
      const before = new Date();
      const member = Member.create('user-123');
      const after = new Date();
      expect(member.getJoinedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(member.getJoinedAt().getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Reputation Updates', () => {
    it('should increment reputation when positive points given', () => {
      const member = Member.create('user-123');
      member.updateReputation(50, 'answered question');
      expect(member.getReputationValue()).toBe(50);
    });

    it('should track reputation history', () => {
      const member = Member.create('user-123');
      member.updateReputation(10, 'first contribution');
      member.updateReputation(20, 'second contribution');
      const history = member.getReputationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].reason).toBe('first contribution');
    });

    it('should throw when updating reputation on inactive member', () => {
      const member = Member.create('user-123');
      member.deactivate();
      expect(() => member.updateReputation(10, 'test')).toThrow('Cannot update reputation of inactive member');
    });
  });

  describe('Badge Award SAGA', () => {
    it('should award a badge and apply reputation bonus', () => {
      const member = Member.create('user-123');
      const badge = createMockBadge('Contributor', 'CONTRIBUTOR');
      member.awardBadge(badge);
      expect(member.getBadges()).toHaveLength(1);
      // CONTRIBUTOR bonus = 25
      expect(member.getReputationValue()).toBe(25);
    });

    it('should not re-award badge already held', () => {
      const member = Member.create('user-123');
      const badge = createMockBadge('Learner', 'LEARNER');
      member.awardBadge(badge);
      expect(() => member.awardBadge(badge)).toThrow(`Member already has badge: ${badge.id}`);
    });

    it('should not award badge to inactive member', () => {
      const member = Member.create('user-123');
      member.deactivate();
      const badge = createMockBadge('Learner', 'LEARNER');
      expect(() => member.awardBadge(badge)).toThrow('Cannot award badge to inactive member');
    });
  });

  describe('Member with MemberTestBuilder', () => {
    it('should build a basic member using the test builder', () => {
      const data = MemberTestBuilder.aMember().build();
      expect(data.userId).toBe('user-123');
      expect(data.reputation).toBe(0);
    });

    it('should build a member with reputation', () => {
      const data = MemberTestBuilder.aMember().withReputation(200).build();
      expect(data.reputation).toBe(200);
    });

    it('should build an inactive member', () => {
      const data = MemberTestBuilder.aMember().inactive().build();
      expect(data.isActive).toBe(false);
    });

    it('should build member with followers', () => {
      const data = MemberTestBuilder.aMember().withFollowers(50).build();
      expect(data.followersCount).toBe(50);
      expect(data.followingCount).toBe(0);
    });
  });

  describe('Follow/Unfollow SAGA', () => {
    it('should increment followingCount when following another member', () => {
      const member = Member.create('user-a');
      member.follow('member-b-id');
      expect(member.getFollowingCount()).toBe(1);
    });

    it('should be idempotent — double follow does not increment twice', () => {
      const member = Member.create('user-a');
      member.follow('member-b-id');
      member.follow('member-b-id');
      expect(member.getFollowingCount()).toBe(1);
    });

    it('should not follow self', () => {
      const member = Member.create('user-a');
      expect(() => member.follow(member.getId())).toThrow('Cannot follow yourself');
    });

    it('should decrement followingCount on unfollow', () => {
      const member = Member.create('user-a');
      member.follow('member-b-id');
      member.unfollow('member-b-id');
      expect(member.getFollowingCount()).toBe(0);
    });
  });

  describe('Member Repository Interactions', () => {
    it('should call save on mock repository', async () => {
      const member = Member.create('user-123');
      await mockRepository.save(member);
      expect(mockRepository.save).toHaveBeenCalledWith(member);
    });

    it('should return null from findById when not found', async () => {
      const result = await mockRepository.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should return empty array from findActiveMembers', async () => {
      const result = await mockRepository.findActiveMembers();
      expect(result).toEqual([]);
    });
  });

  describe('Reputation History Tracking', () => {
    it('should track each reputation change in history', () => {
      const member = Member.create('user-123');
      member.updateReputation(10, 'first');
      member.updateReputation(20, 'second');
      const history = member.getReputationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].points).toBe(10);
      expect(history[1].points).toBe(20);
    });

    it('should include reason and timestamp in each history entry', () => {
      const member = Member.create('user-123');
      const before = new Date();
      member.updateReputation(5, 'test reason');
      const history = member.getReputationHistory();
      expect(history[0].reason).toBe('test reason');
      expect(history[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('Member Invariants', () => {
    it('should return a copy of the badges array to prevent external mutation', () => {
      const member = Member.create('user-123');
      const badge = createMockBadge('Learner', 'LEARNER');
      member.awardBadge(badge);
      const badges = member.getBadges();
      badges.push(createMockBadge('Extra', 'CONTRIBUTOR'));
      // Internal badges should still have only 1
      expect(member.getBadgeCount()).toBe(1);
    });

    it('should preserve userId as set at creation', () => {
      const member = Member.create('user-xyz');
      expect(member.getUserId()).toBe('user-xyz');
    });
  });

  describe('Member Status and Queries', () => {
    it('should be active by default', () => {
      const member = Member.create('user-123');
      expect(member.getIsActive()).toBe(true);
    });

    it('should become inactive after deactivate()', () => {
      const member = Member.create('user-123');
      member.deactivate();
      expect(member.getIsActive()).toBe(false);
    });

    it('should return correct badge count', () => {
      const member = Member.create('user-123');
      const b1: import('../../../src/community/domain/models/Member').Badge = {
        id: 'badge-learner-unique',
        name: 'B1',
        description: 'desc',
        imageUrl: 'https://example.com/b1.png',
        earnedAt: new Date(),
        category: 'LEARNER',
      };
      const b2: import('../../../src/community/domain/models/Member').Badge = {
        id: 'badge-contributor-unique',
        name: 'B2',
        description: 'desc',
        imageUrl: 'https://example.com/b2.png',
        earnedAt: new Date(),
        category: 'CONTRIBUTOR',
      };
      member.awardBadge(b1);
      member.awardBadge(b2);
      expect(member.getBadgeCount()).toBe(2);
    });
  });
});
