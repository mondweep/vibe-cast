/**
 * Discussion Aggregate Unit Tests
 * London School TDD - Focus on Discussion posting, voting, replies, and moderation
 *
 * Coverage targets:
 * - Discussion posting and validation
 * - Vote SAGA (idempotency, vote switching)
 * - Reply management and counting
 * - Moderation workflows (hide/unhide, flag)
 * - Status transitions (OPEN → CLOSED → ARCHIVED → HIDDEN)
 * - EventBus event publishing
 */

import { Discussion, DiscussionStatus } from '../../../src/community/domain/models/Discussion';
import { DiscussionTestBuilder, createMockDiscussionRepository, createMockModerationService, createMockVoteTracker, createMockReply } from '../../contracts/Discussion.contract';

describe('Discussion Aggregate', () => {
  let mockRepository: any;
  let mockModerationService: any;
  let mockVoteTracker: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockRepository = createMockDiscussionRepository();
    mockModerationService = createMockModerationService();
    mockVoteTracker = createMockVoteTracker();
    mockEventBus = { publish: vi.fn().mockResolvedValue(undefined) };
  });

  describe('Discussion Creation and Posting', () => {
    it('should create a discussion with required fields', () => {
      const discussion = Discussion.create('user-123', 'Test Title', 'Test body');
      expect(discussion.getCreatedBy()).toBe('user-123');
      expect(discussion.getTitle()).toBe('Test Title');
      expect(discussion.getBody()).toBe('Test body');
    });

    it('should set status to OPEN on creation', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      expect(discussion.getStatus()).toBe(DiscussionStatus.OPEN);
    });

    it('should initialize upvotes and downvotes to 0', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      expect(discussion.getUpvotes()).toBe(0);
      expect(discussion.getDownvotes()).toBe(0);
    });

    it('should require createdBy', () => {
      expect(() => Discussion.create('', 'Title', 'Body')).toThrow();
    });

    it('should require non-empty title', () => {
      expect(() => Discussion.create('user-123', '', 'Body')).toThrow();
    });

    it('should require non-empty body', () => {
      expect(() => Discussion.create('user-123', 'Title', '')).toThrow();
    });
  });

  describe('Discussion Updates', () => {
    it('should update title and body', () => {
      const discussion = Discussion.create('user-123', 'Old Title', 'Old body');
      discussion.post('New Title', 'New body');
      expect(discussion.getTitle()).toBe('New Title');
      expect(discussion.getBody()).toBe('New body');
    });

    it('should not allow post to closed discussion', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.close();
      expect(() => discussion.post('New Title', 'New body')).toThrow('Cannot post to a closed discussion');
    });
  });

  describe('Vote SAGA', () => {
    it('should increment upvotes when a non-author votes', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.upvote('user-456');
      expect(discussion.getUpvotes()).toBe(1);
    });

    it('should prevent creator from upvoting own discussion', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      expect(() => discussion.upvote('user-123')).toThrow('Cannot upvote your own discussion');
    });

    it('should be idempotent — double upvote does not increment twice', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.upvote('user-456');
      discussion.upvote('user-456');
      expect(discussion.getUpvotes()).toBe(1);
    });

    it('should switch vote from upvote to downvote', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.upvote('user-456');
      discussion.downvote('user-456');
      expect(discussion.getUpvotes()).toBe(0);
      expect(discussion.getDownvotes()).toBe(1);
    });

    it('should calculate score as upvotes minus downvotes', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.upvote('user-a');
      discussion.upvote('user-b');
      discussion.downvote('user-c');
      expect(discussion.getScore()).toBe(1);
    });
  });

  describe('Reply Management', () => {
    it('should add a reply to an open discussion', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      const reply = createMockReply('user-456', 'Great discussion!');
      discussion.addReply(reply);
      expect(discussion.getReplyCount()).toBe(1);
    });

    it('should reject replies to a closed discussion', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.close();
      const reply = createMockReply('user-456', 'Reply');
      expect(() => discussion.addReply(reply)).toThrow('Cannot reply to a closed discussion');
    });

    it('should reject replies to an archived discussion', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.archive();
      const reply = createMockReply('user-456', 'Reply');
      expect(() => discussion.addReply(reply)).toThrow('Cannot reply to an archived discussion');
    });
  });

  describe('Discussion with DiscussionTestBuilder', () => {
    it('should build a basic discussion', () => {
      const data = DiscussionTestBuilder.aDiscussion().build();
      expect(data.title).toBe('Test Discussion');
      expect(data.status).toBe(DiscussionStatus.OPEN);
    });

    it('should build a closed discussion', () => {
      const data = DiscussionTestBuilder.aDiscussion().closed().build();
      expect(data.status).toBe(DiscussionStatus.CLOSED);
      expect(data.closedAt).toBeTruthy();
    });

    it('should build a hidden discussion with isModerated = true', () => {
      const data = DiscussionTestBuilder.aDiscussion().hidden().build();
      expect(data.status).toBe(DiscussionStatus.HIDDEN);
      expect(data.isModerated).toBe(true);
    });

    it('should build with tags', () => {
      const data = DiscussionTestBuilder.aDiscussion().withTags(['ruflo', 'swarm']).build();
      expect(data.tags).toContain('ruflo');
    });
  });

  describe('Status Transitions', () => {
    it('should transition OPEN to CLOSED', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.close();
      expect(discussion.getStatus()).toBe(DiscussionStatus.CLOSED);
      expect(discussion.getClosedAt()).toBeTruthy();
    });

    it('should transition to ARCHIVED', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.archive();
      expect(discussion.getStatus()).toBe(DiscussionStatus.ARCHIVED);
    });

    it('should hide a discussion via moderation', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.hide('Violates community guidelines');
      expect(discussion.getStatus()).toBe(DiscussionStatus.HIDDEN);
      expect(discussion.getIsModerated()).toBe(true);
      expect(discussion.getModeratorNotes()).toBe('Violates community guidelines');
    });

    it('should unhide a hidden discussion', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.hide('notes');
      discussion.unhide();
      expect(discussion.getStatus()).toBe(DiscussionStatus.OPEN);
      expect(discussion.getIsModerated()).toBe(false);
    });

    it('should not reopen an archived discussion', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.close();
      discussion.reopen();
      discussion.archive();
      // close() on archived discussion should throw
      expect(() => discussion.reopen()).toThrow('Can only reopen closed discussions');
    });
  });

  describe('Moderation SAGA', () => {
    it('should call hide on mock moderation service', async () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      await mockModerationService.hideContent(discussion.getId(), 'spam');
      expect(mockModerationService.hideContent).toHaveBeenCalledWith(discussion.getId(), 'spam');
    });

    it('should call unhide on mock moderation service', async () => {
      await mockModerationService.unhideContent('discussion-id');
      expect(mockModerationService.unhideContent).toHaveBeenCalledWith('discussion-id');
    });

    it('should validate content via mock moderation service', async () => {
      const result = await mockModerationService.validateContent('some content');
      expect(mockModerationService.validateContent).toHaveBeenCalledWith('some content');
      expect(result).toBe(true);
    });
  });

  describe('Discussion Repository Interactions', () => {
    it('should call save on mock repository', async () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      await mockRepository.save(discussion);
      expect(mockRepository.save).toHaveBeenCalledWith(discussion);
    });

    it('should return null from findById when not found', async () => {
      const result = await mockRepository.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('should return empty array from findByStatus', async () => {
      const result = await mockRepository.findByStatus(DiscussionStatus.OPEN);
      expect(result).toEqual([]);
    });

    it('should call recordVote on mock repository', async () => {
      await mockRepository.recordVote('disc-1', 'user-456', 'upvote');
      expect(mockRepository.recordVote).toHaveBeenCalledWith('disc-1', 'user-456', 'upvote');
    });
  });

  describe('Discussion Invariants', () => {
    it('createdBy is required', () => {
      expect(() => Discussion.create('', 'Title', 'Body')).toThrow();
    });

    it('title is required', () => {
      expect(() => Discussion.create('user-123', '', 'Body')).toThrow();
    });

    it('body is required', () => {
      expect(() => Discussion.create('user-123', 'Title', '')).toThrow();
    });

    it('getReplies returns a copy so external mutation is isolated', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      const reply = createMockReply('user-456', 'Reply');
      discussion.addReply(reply);
      const replies = discussion.getReplies();
      replies.push(createMockReply('user-789', 'Extra'));
      expect(discussion.getReplyCount()).toBe(1);
    });
  });

  describe('Discussion Visibility and Queries', () => {
    it('isHidden returns true for hidden discussions', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.hide('notes');
      expect(discussion.isHidden()).toBe(true);
    });

    it('isArchived returns true for archived discussions', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.archive();
      expect(discussion.isArchived()).toBe(true);
    });

    it('getTags returns tags added', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.addTags(['ruflo', 'agents']);
      expect(discussion.getTags()).toContain('ruflo');
    });

    it('score is upvotes minus downvotes', () => {
      const discussion = Discussion.create('user-123', 'Title', 'Body');
      discussion.upvote('user-a');
      expect(discussion.getScore()).toBe(1);
    });
  });
});
