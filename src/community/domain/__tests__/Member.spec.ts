/**
 * Member Aggregate Tests
 * TDD London School: Test-first, mock collaborators
 * Tests focus on business rules and invariants
 */

import { Member, Badge } from '../models/Member';
import { ReputationScore } from '../value-objects/ReputationScore';

describe('Member Aggregate', () => {
  describe('Creation', () => {
    it('should create a new member with zero reputation', () => {
      const member = Member.create('user-123');

      expect(member.getUserId()).toBe('user-123');
      expect(member.getReputationValue()).toBe(0);
      expect(member.getBadgeCount()).toBe(0);
      expect(member.getFollowersCount()).toBe(0);
      expect(member.getFollowingCount()).toBe(0);
      expect(member.getIsActive()).toBe(true);
    });

    it('should set joinedAt to current time', () => {
      const before = new Date();
      const member = Member.create('user-123');
      const after = new Date();

      expect(member.getJoinedAt().getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(member.getJoinedAt().getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });
  });

  describe('Reputation Management', () => {
    it('should add reputation points', () => {
      const member = Member.create('user-123');

      member.updateReputation(50, 'Course completed');

      expect(member.getReputationValue()).toBe(50);
    });

    it('should cap reputation at 1000', () => {
      const member = Member.create('user-123');

      member.updateReputation(500, 'Earned 500');
      member.updateReputation(600, 'Earned 600');

      expect(member.getReputationValue()).toBe(1000);
    });

    it('should not allow negative reputation', () => {
      const member = Member.create('user-123');

      member.updateReputation(100, 'Earned 100');
      member.updateReputation(-150, 'Penalty');

      expect(member.getReputationValue()).toBe(0);
    });

    it('should track reputation history', () => {
      const member = Member.create('user-123');

      member.updateReputation(50, 'First contribution');
      member.updateReputation(25, 'Code review');

      const history = member.getReputationHistory();
      expect(history).toHaveLength(2);
      expect(history[0].points).toBe(50);
      expect(history[0].reason).toBe('First contribution');
      expect(history[1].points).toBe(25);
    });

    it('should not update reputation for inactive member', () => {
      const member = Member.create('user-123');
      member.deactivate();

      expect(() => {
        member.updateReputation(50, 'Attempt to update');
      }).toThrow('Cannot update reputation of inactive member');
    });
  });

  describe('Badge Management', () => {
    it('should award a badge', () => {
      const member = Member.create('user-123');
      const badge: Badge = {
        id: 'badge-001',
        name: 'Code Reviewer',
        description: 'Reviewed 10+ code submissions',
        imageUrl: 'https://example.com/badge.png',
        earnedAt: new Date(),
        category: 'REVIEWER',
      };

      member.awardBadge(badge);

      expect(member.getBadgeCount()).toBe(1);
      expect(member.getBadges()[0].id).toBe('badge-001');
    });

    it('should award reputation bonus for badge', () => {
      const member = Member.create('user-123');
      const badge: Badge = {
        id: 'badge-001',
        name: 'Code Reviewer',
        description: 'Reviewed code',
        imageUrl: 'https://example.com/badge.png',
        earnedAt: new Date(),
        category: 'REVIEWER',
      };

      member.awardBadge(badge);

      expect(member.getReputationValue()).toBe(50); // REVIEWER bonus
    });

    it('should not award duplicate badges', () => {
      const member = Member.create('user-123');
      const badge: Badge = {
        id: 'badge-001',
        name: 'Learner',
        description: 'Completed first course',
        imageUrl: 'https://example.com/badge.png',
        earnedAt: new Date(),
        category: 'LEARNER',
      };

      member.awardBadge(badge);

      expect(() => {
        member.awardBadge(badge);
      }).toThrow('Member already has badge: badge-001');
    });

    it('should not award badge to inactive member', () => {
      const member = Member.create('user-123');
      member.deactivate();

      const badge: Badge = {
        id: 'badge-001',
        name: 'Learner',
        description: 'Completed course',
        imageUrl: 'https://example.com/badge.png',
        earnedAt: new Date(),
        category: 'LEARNER',
      };

      expect(() => {
        member.awardBadge(badge);
      }).toThrow('Cannot award badge to inactive member');
    });
  });

  describe('Follow/Unfollow', () => {
    it('should follow another member', () => {
      const member1 = Member.create('user-123');
      const member2 = Member.create('user-456');

      member1.follow(member2.getId());

      expect(member1.isFollowing(member2.getId())).toBe(true);
      expect(member1.getFollowingCount()).toBe(1);
    });

    it('should unfollow a member', () => {
      const member1 = Member.create('user-123');
      const member2 = Member.create('user-456');

      member1.follow(member2.getId());
      member1.unfollow(member2.getId());

      expect(member1.isFollowing(member2.getId())).toBe(false);
      expect(member1.getFollowingCount()).toBe(0);
    });

    it('should not allow self-follow', () => {
      const member = Member.create('user-123');

      expect(() => {
        member.follow(member.getId());
      }).toThrow('Cannot follow yourself');
    });

    it('should be idempotent on follow', () => {
      const member1 = Member.create('user-123');
      const member2 = Member.create('user-456');

      member1.follow(member2.getId());
      member1.follow(member2.getId());

      expect(member1.getFollowingCount()).toBe(1);
    });

    it('should track followers', () => {
      const member1 = Member.create('user-123');
      const member2 = Member.create('user-456');

      member1.addFollower(member2.getId());

      expect(member1.getFollowersCount()).toBe(1);
      expect(member1.isFollowedBy(member2.getId())).toBe(true);
    });
  });

  describe('Member Deactivation', () => {
    it('should deactivate a member', () => {
      const member = Member.create('user-123');

      member.deactivate();

      expect(member.getIsActive()).toBe(false);
    });

    it('should reactivate a member', () => {
      const member = Member.create('user-123');

      member.deactivate();
      member.reactivate();

      expect(member.getIsActive()).toBe(true);
    });
  });

  describe('Member Persistence', () => {
    it('should restore from persisted state', () => {
      const member = Member.create('user-123');
      member.updateReputation(100, 'Test');

      const persisted = {
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

      const restored = Member.restore(persisted);

      expect(restored.getUserId()).toBe('user-123');
      expect(restored.getReputationValue()).toBe(100);
    });
  });
});
