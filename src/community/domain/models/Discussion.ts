/**
 * Discussion Aggregate Root
 * Represents a community discussion thread
 * Domain: Community
 * Max 420 lines
 */

export interface Reply {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  upvotes: number;
  downvotes: number;
  isEdited: boolean;
}

export enum DiscussionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
  HIDDEN = 'HIDDEN',
}

export class Discussion {
  private id: string;
  private createdBy: string;
  private title: string;
  private body: string;
  private upvotes: number = 0;
  private downvotes: number = 0;
  private replies: Reply[] = [];
  private status: DiscussionStatus;
  private createdAt: Date;
  private updatedAt: Date;
  private closedAt: Date | null = null;
  private upvoterIds: Set<string> = new Set();
  private downvoterIds: Set<string> = new Set();
  private tags: string[] = [];
  private isModerated: boolean = false;
  private moderatorNotes: string = '';

  private constructor(
    id: string,
    createdBy: string,
    title: string,
    body: string,
  ) {
    this.id = id;
    this.createdBy = createdBy;
    this.title = title;
    this.body = body;
    this.status = DiscussionStatus.OPEN;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Factory method to create new Discussion
   * Invariant: createdBy is required, title and body cannot be empty
   */
  static create(createdBy: string, title: string, body: string): Discussion {
    if (!createdBy || !createdBy.trim()) {
      throw new Error('Discussion creator (createdBy) is required');
    }
    if (!title || !title.trim()) {
      throw new Error('Discussion title cannot be empty');
    }
    if (!body || !body.trim()) {
      throw new Error('Discussion body cannot be empty');
    }
    if (title.length > 500) {
      throw new Error('Discussion title must be under 500 characters');
    }
    if (body.length > 10000) {
      throw new Error('Discussion body must be under 10000 characters');
    }

    const id = `discussion_${createdBy}_${Date.now()}`;
    return new Discussion(id, createdBy, title, body);
  }

  /**
   * Reconstruct Discussion from persisted state
   */
  static restore(data: {
    id: string;
    createdBy: string;
    title: string;
    body: string;
    upvotes: number;
    downvotes: number;
    replies: Reply[];
    status: DiscussionStatus;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    tags: string[];
    isModerated: boolean;
    moderatorNotes: string;
  }): Discussion {
    const discussion = new Discussion(
      data.id,
      data.createdBy,
      data.title,
      data.body,
    );
    discussion.upvotes = data.upvotes;
    discussion.downvotes = data.downvotes;
    discussion.replies = data.replies;
    discussion.status = data.status;
    discussion.createdAt = data.createdAt;
    discussion.updatedAt = data.updatedAt;
    discussion.closedAt = data.closedAt;
    discussion.tags = data.tags;
    discussion.isModerated = data.isModerated;
    discussion.moderatorNotes = data.moderatorNotes;
    return discussion;
  }

  /**
   * Post (create/update) the discussion
   */
  post(title?: string, body?: string): void {
    if (this.status === DiscussionStatus.CLOSED) {
      throw new Error('Cannot post to a closed discussion');
    }
    if (this.status === DiscussionStatus.ARCHIVED) {
      throw new Error('Cannot post to an archived discussion');
    }

    if (title && title.trim()) {
      if (title.length > 500) {
        throw new Error('Title must be under 500 characters');
      }
      this.title = title.trim();
    }

    if (body && body.trim()) {
      if (body.length > 10000) {
        throw new Error('Body must be under 10000 characters');
      }
      this.body = body.trim();
    }

    this.updatedAt = new Date();
  }

  /**
   * Upvote this discussion
   * Invariant: cannot upvote own discussion
   */
  upvote(voterId: string): void {
    if (voterId === this.createdBy) {
      throw new Error('Cannot upvote your own discussion');
    }

    if (this.upvoterIds.has(voterId)) {
      return; // Already upvoted, idempotent
    }

    // Remove downvote if exists
    if (this.downvoterIds.has(voterId)) {
      this.downvoterIds.delete(voterId);
      this.downvotes--;
    }

    this.upvoterIds.add(voterId);
    this.upvotes++;
    this.updatedAt = new Date();
  }

  /**
   * Downvote this discussion
   * Invariant: cannot downvote own discussion
   */
  downvote(voterId: string): void {
    if (voterId === this.createdBy) {
      throw new Error('Cannot downvote your own discussion');
    }

    if (this.downvoterIds.has(voterId)) {
      return; // Already downvoted, idempotent
    }

    // Remove upvote if exists
    if (this.upvoterIds.has(voterId)) {
      this.upvoterIds.delete(voterId);
      this.upvotes--;
    }

    this.downvoterIds.add(voterId);
    this.downvotes++;
    this.updatedAt = new Date();
  }

  /**
   * Remove a vote
   */
  removeVote(voterId: string): void {
    if (this.upvoterIds.has(voterId)) {
      this.upvoterIds.delete(voterId);
      this.upvotes--;
    } else if (this.downvoterIds.has(voterId)) {
      this.downvoterIds.delete(voterId);
      this.downvotes--;
    }
    this.updatedAt = new Date();
  }

  /**
   * Add a reply to this discussion
   */
  addReply(reply: Reply): void {
    if (this.status === DiscussionStatus.CLOSED) {
      throw new Error('Cannot reply to a closed discussion');
    }
    if (this.status === DiscussionStatus.ARCHIVED) {
      throw new Error('Cannot reply to an archived discussion');
    }

    if (!reply.content || !reply.content.trim()) {
      throw new Error('Reply content cannot be empty');
    }
    if (reply.content.length > 5000) {
      throw new Error('Reply must be under 5000 characters');
    }

    this.replies.push(reply);
    this.updatedAt = new Date();
  }

  /**
   * Close this discussion (no new replies allowed)
   */
  close(): void {
    if (this.status === DiscussionStatus.CLOSED) {
      return; // Already closed, idempotent
    }
    if (this.status === DiscussionStatus.ARCHIVED) {
      throw new Error('Cannot close an archived discussion');
    }

    this.status = DiscussionStatus.CLOSED;
    this.closedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Reopen a closed discussion
   */
  reopen(): void {
    if (this.status !== DiscussionStatus.CLOSED) {
      throw new Error('Can only reopen closed discussions');
    }

    this.status = DiscussionStatus.OPEN;
    this.closedAt = null;
    this.updatedAt = new Date();
  }

  /**
   * Archive this discussion (permanent, no reopening)
   */
  archive(): void {
    if (this.status === DiscussionStatus.ARCHIVED) {
      return; // Already archived, idempotent
    }

    this.status = DiscussionStatus.ARCHIVED;
    this.closedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Hide this discussion (moderation action)
   */
  hide(moderatorNotes?: string): void {
    this.status = DiscussionStatus.HIDDEN;
    this.isModerated = true;
    if (moderatorNotes) {
      this.moderatorNotes = moderatorNotes;
    }
    this.updatedAt = new Date();
  }

  /**
   * Unhide this discussion
   */
  unhide(): void {
    if (this.status === DiscussionStatus.HIDDEN) {
      this.status = DiscussionStatus.OPEN;
      this.isModerated = false;
      this.moderatorNotes = '';
      this.updatedAt = new Date();
    }
  }

  /**
   * Add tags to this discussion
   */
  addTags(tags: string[]): void {
    const newTags = tags
      .filter((t) => t && t.trim())
      .map((t) => t.toLowerCase().trim());

    newTags.forEach((tag) => {
      if (!this.tags.includes(tag) && this.tags.length < 5) {
        this.tags.push(tag);
      }
    });

    if (newTags.length > 0) {
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove a tag
   */
  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag.toLowerCase());
    if (index > -1) {
      this.tags.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  // Accessors
  getId(): string {
    return this.id;
  }

  getCreatedBy(): string {
    return this.createdBy;
  }

  getTitle(): string {
    return this.title;
  }

  getBody(): string {
    return this.body;
  }

  getUpvotes(): number {
    return this.upvotes;
  }

  getDownvotes(): number {
    return this.downvotes;
  }

  getScore(): number {
    return this.upvotes - this.downvotes;
  }

  getReplies(): Reply[] {
    return [...this.replies];
  }

  getReplyCount(): number {
    return this.replies.length;
  }

  getStatus(): DiscussionStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getClosedAt(): Date | null {
    return this.closedAt;
  }

  getTags(): string[] {
    return [...this.tags];
  }

  getIsModerated(): boolean {
    return this.isModerated;
  }

  getModeratorNotes(): string {
    return this.moderatorNotes;
  }

  isClosed(): boolean {
    return this.status === DiscussionStatus.CLOSED;
  }

  isArchived(): boolean {
    return this.status === DiscussionStatus.ARCHIVED;
  }

  isHidden(): boolean {
    return this.status === DiscussionStatus.HIDDEN;
  }

  hasUpvoted(voterId: string): boolean {
    return this.upvoterIds.has(voterId);
  }

  hasDownvoted(voterId: string): boolean {
    return this.downvoterIds.has(voterId);
  }
}
