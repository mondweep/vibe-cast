/**
 * Discussion Mock Contract Definition
 * London School TDD - Mock contracts for Discussion Aggregate
 *
 * Defines interactions with:
 * - Discussion Repository (persist and retrieve discussions)
 * - Moderation Service (hide/unhide, moderate content)
 * - Vote tracking (upvote/downvote with idempotency)
 * - Reply management (add and track replies)
 */

import { Discussion, DiscussionStatus, Reply } from '../../src/community/domain/models/Discussion';

/**
 * Mock Discussion Repository interface
 * Persists discussions and manages thread operations
 */
export interface MockDiscussionRepository {
  save: jest.MockedFunction<(discussion: Discussion) => Promise<Discussion>>;
  findById: jest.MockedFunction<(id: string) => Promise<Discussion | null>>;
  findByCreator: jest.MockedFunction<(createdBy: string) => Promise<Discussion[]>>;
  findByStatus: jest.MockedFunction<(status: DiscussionStatus) => Promise<Discussion[]>>;
  findRecent: jest.MockedFunction<(limit: number) => Promise<Discussion[]>>;
  recordVote: jest.MockedFunction<(discussionId: string, voterId: string, voteType: 'upvote' | 'downvote') => Promise<void>>;
  removeVote: jest.MockedFunction<(discussionId: string, voterId: string) => Promise<void>>;
  recordReply: jest.MockedFunction<(discussionId: string, reply: Reply) => Promise<void>>;
  getReplyCount: jest.MockedFunction<(discussionId: string) => Promise<number>>;
}

/**
 * Factory for creating mock Discussion Repository
 */
export function createMockDiscussionRepository(): MockDiscussionRepository {
  return {
    save: jest.fn().mockResolvedValue({
      id: `discussion-${Date.now()}`,
      createdBy: 'user-123',
      title: 'Test Discussion',
      body: 'Test discussion body',
      upvotes: 0,
      downvotes: 0,
      replies: [],
      status: DiscussionStatus.OPEN,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
      tags: [],
      isModerated: false,
      moderatorNotes: '',
    }),
    findById: jest.fn().mockResolvedValue(null),
    findByCreator: jest.fn().mockResolvedValue([]),
    findByStatus: jest.fn().mockResolvedValue([]),
    findRecent: jest.fn().mockResolvedValue([]),
    recordVote: jest.fn().mockResolvedValue(undefined),
    removeVote: jest.fn().mockResolvedValue(undefined),
    recordReply: jest.fn().mockResolvedValue(undefined),
    getReplyCount: jest.fn().mockResolvedValue(0),
  };
}

/**
 * Mock Moderation Service interface
 * Handles content moderation and visibility
 */
export interface MockModerationService {
  validateContent: jest.MockedFunction<(content: string) => Promise<boolean>>;
  flagForReview: jest.MockedFunction<(discussionId: string, reason: string) => Promise<void>>;
  approveFlaggedContent: jest.MockedFunction<(discussionId: string) => Promise<void>>;
  hideContent: jest.MockedFunction<(discussionId: string, moderatorNotes: string) => Promise<void>>;
  unhideContent: jest.MockedFunction<(discussionId: string) => Promise<void>>;
  generateModerationReport: jest.MockedFunction<(discussionId: string) => Promise<any>>;
}

/**
 * Factory for creating mock Moderation Service
 */
export function createMockModerationService(): MockModerationService {
  return {
    validateContent: jest.fn().mockResolvedValue(true),
    flagForReview: jest.fn().mockResolvedValue(undefined),
    approveFlaggedContent: jest.fn().mockResolvedValue(undefined),
    hideContent: jest.fn().mockResolvedValue(undefined),
    unhideContent: jest.fn().mockResolvedValue(undefined),
    generateModerationReport: jest.fn().mockResolvedValue({}),
  };
}

/**
 * Mock Vote Tracker interface
 * Tracks voting history to ensure idempotency and prevent double votes
 */
export interface MockVoteTracker {
  hasUpvoted: jest.MockedFunction<(discussionId: string, voterId: string) => Promise<boolean>>;
  hasDownvoted: jest.MockedFunction<(discussionId: string, voterId: string) => Promise<boolean>>;
  recordUpvote: jest.MockedFunction<(discussionId: string, voterId: string) => Promise<void>>;
  recordDownvote: jest.MockedFunction<(discussionId: string, voterId: string) => Promise<void>>;
  clearVote: jest.MockedFunction<(discussionId: string, voterId: string) => Promise<void>>;
  getVoteCount: jest.MockedFunction<(discussionId: string) => Promise<{upvotes: number; downvotes: number}>>;
}

/**
 * Factory for creating mock Vote Tracker
 */
export function createMockVoteTracker(): MockVoteTracker {
  return {
    hasUpvoted: jest.fn().mockResolvedValue(false),
    hasDownvoted: jest.fn().mockResolvedValue(false),
    recordUpvote: jest.fn().mockResolvedValue(undefined),
    recordDownvote: jest.fn().mockResolvedValue(undefined),
    clearVote: jest.fn().mockResolvedValue(undefined),
    getVoteCount: jest.fn().mockResolvedValue({upvotes: 0, downvotes: 0}),
  };
}

/**
 * Discussion Test Builder
 * Fluent API for constructing test Discussion instances
 */
export class DiscussionTestBuilder {
  private id: string = `discussion-${Date.now()}`;
  private createdBy: string = 'user-123';
  private title: string = 'Test Discussion';
  private body: string = 'Test discussion body';
  private upvotes: number = 0;
  private downvotes: number = 0;
  private replies: Reply[] = [];
  private status: DiscussionStatus = DiscussionStatus.OPEN;
  private createdAt: Date = new Date();
  private updatedAt: Date = new Date();
  private closedAt: Date | null = null;
  private tags: string[] = [];
  private isModerated: boolean = false;
  private moderatorNotes: string = '';

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withCreator(createdBy: string): this {
    this.createdBy = createdBy;
    return this;
  }

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withBody(body: string): this {
    this.body = body;
    return this;
  }

  withUpvotes(count: number): this {
    this.upvotes = count;
    return this;
  }

  withDownvotes(count: number): this {
    this.downvotes = count;
    return this;
  }

  withReplies(replies: Reply[]): this {
    this.replies = replies;
    return this;
  }

  closed(): this {
    this.status = DiscussionStatus.CLOSED;
    this.closedAt = new Date();
    return this;
  }

  archived(): this {
    this.status = DiscussionStatus.ARCHIVED;
    this.closedAt = new Date();
    return this;
  }

  hidden(): this {
    this.status = DiscussionStatus.HIDDEN;
    this.isModerated = true;
    return this;
  }

  withTags(tags: string[]): this {
    this.tags = tags;
    return this;
  }

  build(): any {
    return {
      id: this.id,
      createdBy: this.createdBy,
      title: this.title,
      body: this.body,
      upvotes: this.upvotes,
      downvotes: this.downvotes,
      replies: this.replies,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      closedAt: this.closedAt,
      tags: this.tags,
      isModerated: this.isModerated,
      moderatorNotes: this.moderatorNotes,
    };
  }

  static aDiscussion(): DiscussionTestBuilder {
    return new DiscussionTestBuilder();
  }
}

/**
 * Mock Reply factory for test data
 */
export function createMockReply(
  authorId: string = 'user-456',
  content: string = 'Test reply'
): Reply {
  return {
    id: `reply-${Date.now()}`,
    authorId,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    upvotes: 0,
    downvotes: 0,
    isEdited: false,
  };
}

/**
 * Mock interaction verification for Discussion
 * Verifies correct interaction sequence with Repository and Moderation Service
 */
export interface DiscussionInteractionSequence {
  /**
   * Step 1: Post discussion (create or update)
   */
  discussionPosted: {
    method: 'post';
    title?: string;
    body?: string;
  };

  /**
   * Step 2: Validate content with moderation service
   */
  contentValidated: {
    method: 'validateContent';
    isValid: boolean;
  };

  /**
   * Step 3: Save to repository
   */
  saved: {
    method: 'save';
    discussionId: string;
  };

  /**
   * Step 4: Emit event
   */
  eventEmitted: {
    eventType: 'DiscussionPosted' | 'DiscussionUpdated';
    discussionId: string;
  };
}

/**
 * Vote SAGA Contract
 * Defines workflow: user votes → check idempotency → update counts → emit event
 */
export interface DiscussionVoteSagaContract {
  /**
   * Trigger: User upvotes or downvotes discussion
   */
  trigger: {
    voteType: 'upvote' | 'downvote';
    voterId: string;
    discussionId: string;
  };

  /**
   * Step 1: Check if user already voted (prevent double voting)
   */
  checkPreviousVote: {
    hasUpvoted: boolean;
    hasDownvoted: boolean;
  };

  /**
   * Step 2: Switch vote if opposite vote exists
   */
  switchVoteIfNeeded: {
    removedPreviousVote: boolean;
    decrementedCount: 'upvotes' | 'downvotes' | null;
  };

  /**
   * Step 3: Record new vote
   */
  voteRecorded: {
    method: 'recordUpvote' | 'recordDownvote';
    voterId: string;
    discussionId: string;
  };

  /**
   * Step 4: Update vote count on discussion aggregate
   */
  countUpdated: {
    voteType: 'upvotes' | 'downvotes';
    newCount: number;
  };

  /**
   * Step 5: Emit vote event
   */
  eventEmitted: {
    eventType: 'DiscussionUpvoted' | 'DiscussionDownvoted';
    discussionId: string;
    voterId: string;
  };
}

/**
 * Reply SAGA Contract
 * Defines workflow: add reply → validate → record → update count → emit
 */
export interface DiscussionReplySagaContract {
  /**
   * Trigger: Author submits reply to discussion
   */
  trigger: {
    discussionId: string;
    authorId: string;
    content: string;
  };

  /**
   * Step 1: Check discussion status allows replies
   */
  statusCheck: {
    status: DiscussionStatus;
    canReply: boolean;
  };

  /**
   * Step 2: Validate reply content
   */
  contentValidated: {
    method: 'validateContent';
    isValid: boolean;
  };

  /**
   * Step 3: Create reply with metadata
   */
  replyCreated: {
    id: string;
    authorId: string;
    timestamp: Date;
  };

  /**
   * Step 4: Record reply in repository
   */
  replyRecorded: {
    method: 'recordReply';
    discussionId: string;
  };

  /**
   * Step 5: Update reply count on discussion
   */
  countUpdated: {
    newReplyCount: number;
  };

  /**
   * Step 6: Emit reply event
   */
  eventEmitted: {
    eventType: 'ReplyPosted';
    discussionId: string;
    replyId: string;
  };
}

/**
 * Moderation SAGA Contract
 * Defines workflow: flag content → review → hide/approve
 */
export interface DiscussionModerationSagaContract {
  /**
   * Trigger: Content flagged for review or moderation action
   */
  trigger: {
    discussionId: string;
    reason?: string;
    action: 'flag' | 'hide' | 'unhide';
  };

  /**
   * Step 1: Validate current moderation status
   */
  statusCheck: {
    currentStatus: DiscussionStatus;
    isModerated: boolean;
  };

  /**
   * Step 2: Apply moderation action
   */
  actionApplied: {
    method: 'hideContent' | 'unhideContent' | 'flagForReview';
    discussionId: string;
  };

  /**
   * Step 3: Update discussion status
   */
  statusUpdated: {
    newStatus: DiscussionStatus;
    moderatorNotes?: string;
  };

  /**
   * Step 4: Emit moderation event
   */
  eventEmitted: {
    eventType: 'DiscussionHidden' | 'DiscussionUnhidden' | 'DiscussionFlagged';
    discussionId: string;
  };
}

/**
 * Discussion domain events contract
 */
export interface DiscussionDomainEventContract {
  DiscussionPosted: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionPosted';
    payload: {
      discussionId: string;
      createdBy: string;
      title: string;
      body: string;
      postedAt: Date;
    };
  };

  DiscussionUpdated: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionUpdated';
    payload: {
      discussionId: string;
      title?: string;
      body?: string;
      updatedAt: Date;
    };
  };

  DiscussionUpvoted: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionUpvoted';
    payload: {
      discussionId: string;
      voterId: string;
      currentScore: number;
    };
  };

  DiscussionDownvoted: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionDownvoted';
    payload: {
      discussionId: string;
      voterId: string;
      currentScore: number;
    };
  };

  ReplyPosted: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'ReplyPosted';
    payload: {
      discussionId: string;
      replyId: string;
      authorId: string;
      replyCount: number;
    };
  };

  DiscussionClosed: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionClosed';
    payload: {
      discussionId: string;
      closedAt: Date;
    };
  };

  DiscussionArchived: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionArchived';
    payload: {
      discussionId: string;
      archivedAt: Date;
    };
  };

  DiscussionHidden: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionHidden';
    payload: {
      discussionId: string;
      moderatorNotes: string;
      hiddenAt: Date;
    };
  };

  DiscussionUnhidden: {
    aggregateId: string;
    aggregateType: 'Discussion';
    eventType: 'DiscussionUnhidden';
    payload: {
      discussionId: string;
      unhiddenAt: Date;
    };
  };
}
