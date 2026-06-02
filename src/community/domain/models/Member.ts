/**
 * Member Aggregate Root
 * Represents a community member with reputation, badges, and social connections
 * Domain: Community
 * Max 380 lines
 */

import { ReputationScore } from '../value-objects/ReputationScore';

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  earnedAt: Date;
  category: 'LEARNER' | 'CONTRIBUTOR' | 'REVIEWER' | 'MENTOR';
}

export class Member {
  private id: string;
  private userId: string;
  private reputation: ReputationScore;
  private joinedAt: Date;
  private badges: Badge[] = [];
  private followersCount: number = 0;
  private followingCount: number = 0;
  private followers: Set<string> = new Set();
  private following: Set<string> = new Set();
  private reputationHistory: Array<{
    points: number;
    reason: string;
    timestamp: Date;
  }> = [];
  private updatedAt: Date;
  private isActive: boolean = true;

  private constructor(
    id: string,
    userId: string,
    reputation: ReputationScore,
    joinedAt: Date,
  ) {
    this.id = id;
    this.userId = userId;
    this.reputation = reputation;
    this.joinedAt = joinedAt;
    this.updatedAt = new Date();
  }

  /**
   * Factory method to create new Member
   */
  static create(userId: string): Member {
    const id = `member_${userId}_${Date.now()}`;
    const member = new Member(
      id,
      userId,
      ReputationScore.zero(),
      new Date(),
    );
    return member;
  }

  /**
   * Reconstruct Member from persisted state
   */
  static restore(data: {
    id: string;
    userId: string;
    reputation: number;
    joinedAt: Date;
    badges: Badge[];
    followersCount: number;
    followingCount: number;
    updatedAt: Date;
    isActive: boolean;
  }): Member {
    const member = new Member(
      data.id,
      data.userId,
      ReputationScore.create(data.reputation),
      data.joinedAt,
    );
    member.badges = data.badges;
    member.followersCount = data.followersCount;
    member.followingCount = data.followingCount;
    member.updatedAt = data.updatedAt;
    member.isActive = data.isActive;
    return member;
  }

  /**
   * Update reputation based on contributions
   * Invariant: reputation must be non-negative
   */
  updateReputation(points: number, reason: string): void {
    if (!this.isActive) {
      throw new Error('Cannot update reputation of inactive member');
    }

    const newReputation = points > 0
      ? this.reputation.add(points)
      : this.reputation.subtract(Math.abs(points));

    this.reputation = newReputation;
    this.reputationHistory.push({
      points,
      reason,
      timestamp: new Date(),
    });
    this.updatedAt = new Date();
  }

  /**
   * Award a badge to this member
   * Invariant: cannot award same badge twice
   */
  awardBadge(badge: Badge): void {
    if (!this.isActive) {
      throw new Error('Cannot award badge to inactive member');
    }

    const alreadyHas = this.badges.some((b) => b.id === badge.id);
    if (alreadyHas) {
      throw new Error(`Member already has badge: ${badge.id}`);
    }

    this.badges.push(badge);
    this.updatedAt = new Date();

    // Award reputation bonus for certain badge types
    const reputationBonus = this.getReputationBonusForBadge(badge.category);
    if (reputationBonus > 0) {
      this.updateReputation(reputationBonus, `Badge earned: ${badge.name}`);
    }
  }

  /**
   * Follow another member
   * Invariant: cannot follow self
   */
  follow(targetMemberId: string): void {
    if (targetMemberId === this.id) {
      throw new Error('Cannot follow yourself');
    }

    if (this.following.has(targetMemberId)) {
      return; // Already following, idempotent
    }

    this.following.add(targetMemberId);
    this.followingCount++;
    this.updatedAt = new Date();
  }

  /**
   * Unfollow a member
   */
  unfollow(targetMemberId: string): void {
    if (!this.following.has(targetMemberId)) {
      return; // Not following, idempotent
    }

    this.following.delete(targetMemberId);
    this.followingCount--;
    this.updatedAt = new Date();
  }

  /**
   * Add a follower (called when another member follows this member)
   */
  addFollower(followerId: string): void {
    if (followerId === this.id) {
      throw new Error('Cannot be followed by yourself');
    }

    if (this.followers.has(followerId)) {
      return; // Already a follower, idempotent
    }

    this.followers.add(followerId);
    this.followersCount++;
    this.updatedAt = new Date();
  }

  /**
   * Remove a follower
   */
  removeFollower(followerId: string): void {
    if (!this.followers.has(followerId)) {
      return; // Not a follower, idempotent
    }

    this.followers.delete(followerId);
    this.followersCount--;
    this.updatedAt = new Date();
  }

  /**
   * Deactivate this member (soft delete)
   */
  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  /**
   * Reactivate this member
   */
  reactivate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }

  // Accessors
  getId(): string {
    return this.id;
  }

  getUserId(): string {
    return this.userId;
  }

  getReputation(): ReputationScore {
    return this.reputation;
  }

  getReputationValue(): number {
    return this.reputation.getValue();
  }

  getJoinedAt(): Date {
    return this.joinedAt;
  }

  getBadges(): Badge[] {
    return [...this.badges];
  }

  getBadgeCount(): number {
    return this.badges.length;
  }

  getFollowersCount(): number {
    return this.followersCount;
  }

  getFollowingCount(): number {
    return this.followingCount;
  }

  getFollowers(): string[] {
    return Array.from(this.followers);
  }

  getFollowing(): string[] {
    return Array.from(this.following);
  }

  isFollowing(memberId: string): boolean {
    return this.following.has(memberId);
  }

  isFollowedBy(memberId: string): boolean {
    return this.followers.has(memberId);
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  getReputationHistory() {
    return [...this.reputationHistory];
  }

  private getReputationBonusForBadge(category: string): number {
    switch (category) {
      case 'LEARNER':
        return 10;
      case 'CONTRIBUTOR':
        return 25;
      case 'REVIEWER':
        return 50;
      case 'MENTOR':
        return 75;
      default:
        return 0;
    }
  }
}
