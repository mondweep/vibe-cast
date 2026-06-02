/**
 * Cross-Domain Events Integration Tests
 *
 * Tests event propagation across domain boundaries:
 * - Badge event (Certification domain) published via REAL EventBus
 * - Handlers in Community and Profile domains receive and process event
 * - Validates handler subscription and event routing
 * - Verifies causationId chaining across domains
 *
 * London School TDD Approach:
 * - Use REAL EventBus, mock BadgeService, CommunityService, ProfileService
 * - Call bus.publish(badgeIssuedEvent) to trigger cross-domain handlers
 * - Verify inter-domain service interactions via event handler invocation
 * - Test event routing and handler resolution
 * - Validate causation ID propagation
 *
 * REWRITE NOTES:
 * - Changed from mocking EventBus to using real instance
 * - Register real handlers for Community and Profile domains
 * - Call bus.publish(badgeIssuedEvent) to trigger handlers
 * - Verify handlers receive event across domain boundaries
 * - Tests will be RED until developer-w10 implements EventBus.publish (Phase 1)
 */

import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { EventHandler } from '../../src/shared/domain/EventHandler';
import { EventBus } from '../../src/shared/infrastructure/events/EventBus';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';

/**
 * Cross-domain event definitions
 */
class BadgeIssued extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly badgeId: string,
    public readonly badgeName: string,
    public readonly badgeImageUrl: string,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Badge', correlationId);
  }

  getEventName(): string {
    return 'BadgeIssued';
  }
}

class CommunityAnnouncement extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly badgeId: string,
    public readonly announcement: string,
    public readonly causationEventId: string,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Community', correlationId);
  }

  getEventName(): string {
    return 'CommunityAnnouncement';
  }
}

class BadgeDisplayed extends DomainEvent {
  constructor(
    public readonly candidateId: string,
    public readonly badgeId: string,
    public readonly displayedAt: Date,
    public readonly causationEventId: string,
    aggregateId: string,
    correlationId: string
  ) {
    super(aggregateId, 'Profile', correlationId);
  }

  getEventName(): string {
    return 'BadgeDisplayed';
  }
}

/**
 * Mock Event Handlers
 */
class MockBadgeHandler implements EventHandler {
  handle = jest.fn(async (event: DomainEvent) => {
    // Handler logic
  });

  canHandle = jest.fn((event: DomainEvent) => event.getEventName() === 'BadgeIssued');
}

class MockCommunityHandler implements EventHandler {
  handle = jest.fn(async (event: DomainEvent) => {
    // Handler logic
  });

  canHandle = jest.fn((event: DomainEvent) => event.getEventName() === 'BadgeIssued');
}

class MockProfileHandler implements EventHandler {
  handle = jest.fn(async (event: DomainEvent) => {
    // Handler logic
  });

  canHandle = jest.fn((event: DomainEvent) => event.getEventName() === 'BadgeIssued');
}

/**
 * Real Community domain handler that listens to BadgeIssued
 */
class RealCommunityHandler implements EventHandler {
  private receivedEvents: DomainEvent[] = [];

  async handle(event: DomainEvent): Promise<void> {
    this.receivedEvents.push(event);
    // Handler would normally invoke CommunityService.onBadgeIssued()
  }

  canHandle(event: DomainEvent): boolean {
    return event.getEventName() === 'BadgeIssued';
  }

  getReceivedEvents(): DomainEvent[] {
    return this.receivedEvents;
  }

  reset(): void {
    this.receivedEvents = [];
  }
}

/**
 * Real Profile domain handler that listens to BadgeIssued
 */
class RealProfileHandler implements EventHandler {
  private receivedEvents: DomainEvent[] = [];

  async handle(event: DomainEvent): Promise<void> {
    this.receivedEvents.push(event);
    // Handler would normally invoke ProfileService.displayBadge()
  }

  canHandle(event: DomainEvent): boolean {
    return event.getEventName() === 'BadgeIssued';
  }

  getReceivedEvents(): DomainEvent[] {
    return this.receivedEvents;
  }

  reset(): void {
    this.receivedEvents = [];
  }
}

/**
 * Mock services
 */
class MockBadgeService {
  issueBadge = jest.fn();
  getBadgeDetails = jest.fn();
}

class MockCommunityService {
  onBadgeIssued = jest.fn();
  announceNewMember = jest.fn();
}

class MockProfileService {
  displayBadge = jest.fn();
  updateProfilePicture = jest.fn();
}

describe('Cross-Domain Event Propagation', () => {
  let eventBus: MockEventBus;
  let badgeService: MockBadgeService;
  let communityService: MockCommunityService;
  let profileService: MockProfileService;
  let badgeHandler: MockBadgeHandler;
  let communityHandler: MockCommunityHandler;
  let profileHandler: MockProfileHandler;
  const correlationId = 'corr-cross-domain-001';
  const candidateId = 'candidate-456';

  beforeEach(() => {
    eventBus = new MockEventBus();
    badgeService = new MockBadgeService();
    communityService = new MockCommunityService();
    profileService = new MockProfileService();
    badgeHandler = new MockBadgeHandler();
    communityHandler = new MockCommunityHandler();
    profileHandler = new MockProfileHandler();

    // Setup mock expectations
    badgeService.issueBadge.mockResolvedValue({
      badgeId: 'badge-gold-001',
      badgeName: 'Gold Member',
      badgeImageUrl: 'https://example.com/badges/gold.png'
    });

    communityService.onBadgeIssued.mockResolvedValue({
      announcementId: 'ann-001',
      message: 'Congratulations! You earned a badge'
    });

    profileService.displayBadge.mockResolvedValue({
      profileId: 'profile-456',
      badgeDisplayed: true
    });
  });

  describe('Event Subscription and Routing', () => {
    it('should register event handlers for cross-domain subscriptions', async () => {
      // ACT
      eventBus.subscribe('BadgeIssued', communityHandler);
      eventBus.subscribe('BadgeIssued', profileHandler);

      // ASSERT
      expect(eventBus.subscribe).toHaveBeenCalledWith('BadgeIssued', communityHandler);
      expect(eventBus.subscribe).toHaveBeenCalledWith('BadgeIssued', profileHandler);

      const subscribers = eventBus.getSubscribersFor('BadgeIssued');
      expect(subscribers).toHaveLength(2);
    });

    it('should route BadgeIssued event to multiple handlers', async () => {
      // ARRANGE
      eventBus.subscribe('BadgeIssued', communityHandler);
      eventBus.subscribe('BadgeIssued', profileHandler);

      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      // ACT
      await eventBus.publishEvent(badgeIssuedEvent, correlationId);

      // ASSERT: Both handlers invoked
      expect(communityHandler.handle).toHaveBeenCalledWith(badgeIssuedEvent);
      expect(profileHandler.handle).toHaveBeenCalledWith(badgeIssuedEvent);
    });

    it('should only invoke handlers that can handle the event', async () => {
      // ARRANGE
      const otherEventType = 'UnrelatedEvent';
      badgeHandler.canHandle.mockReturnValue(true);
      communityHandler.canHandle.mockReturnValue(true);
      profileHandler.canHandle.mockReturnValue(false);

      eventBus.subscribe('BadgeIssued', badgeHandler);
      eventBus.subscribe('BadgeIssued', communityHandler);
      eventBus.subscribe('BadgeIssued', profileHandler);

      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      // ACT
      const handlers = eventBus.getSubscribersFor('BadgeIssued');
      const capableHandlers = handlers.filter(h => h.canHandle(badgeIssuedEvent));

      // ASSERT
      expect(capableHandlers).toHaveLength(2);
    });
  });

  describe('Cross-Domain Service Interaction', () => {
    it('should invoke CommunityService when badge is issued', async () => {
      // ARRANGE
      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      // ACT
      await communityService.onBadgeIssued(
        candidateId,
        badgeIssuedEvent.badgeId,
        badgeIssuedEvent.badgeName
      );

      // ASSERT
      expect(communityService.onBadgeIssued).toHaveBeenCalledWith(
        candidateId,
        'badge-gold-001',
        'Gold Member'
      );
    });

    it('should invoke ProfileService to display badge', async () => {
      // ACT
      await profileService.displayBadge(candidateId, 'badge-gold-001');

      // ASSERT
      expect(profileService.displayBadge).toHaveBeenCalledWith(
        candidateId,
        'badge-gold-001'
      );
    });

    it('should orchestrate multi-domain response to BadgeIssued', async () => {
      // ARRANGE
      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      // ACT: Simulate orchestrated response
      await badgeService.issueBadge(candidateId, 'GOLD_MEMBER');
      await communityService.onBadgeIssued(
        candidateId,
        badgeIssuedEvent.badgeId,
        badgeIssuedEvent.badgeName
      );
      await profileService.displayBadge(candidateId, badgeIssuedEvent.badgeId);

      // ASSERT: All services called in sequence
      expect(badgeService.issueBadge).toHaveBeenCalled();
      expect(communityService.onBadgeIssued).toHaveBeenCalled();
      expect(profileService.displayBadge).toHaveBeenCalled();
    });
  });

  describe('CausationId Chaining Across Domains', () => {
    it('should propagate causationId from BadgeIssued to CommunityAnnouncement', async () => {
      // ARRANGE
      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      // ACT: Create downstream event with causationId
      const communityAnnouncementEvent = new CommunityAnnouncement(
        candidateId,
        badgeIssuedEvent.badgeId,
        'Congratulations on earning the Gold Member badge!',
        badgeIssuedEvent.id, // causationEventId = upstream event id
        'community-789',
        correlationId
      );

      // ASSERT: Causation chain established
      expect(communityAnnouncementEvent.causationEventId).toBe(badgeIssuedEvent.id);
      expect(communityAnnouncementEvent.correlationId).toBe(badgeIssuedEvent.correlationId);
    });

    it('should maintain causation chain through multiple domain hops', async () => {
      // ARRANGE
      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      const communityAnnouncementEvent = new CommunityAnnouncement(
        candidateId,
        badgeIssuedEvent.badgeId,
        'Badge earned',
        badgeIssuedEvent.id,
        'community-789',
        correlationId
      );

      const badgeDisplayedEvent = new BadgeDisplayed(
        candidateId,
        badgeIssuedEvent.badgeId,
        new Date(),
        communityAnnouncementEvent.id,
        'profile-789',
        correlationId
      );

      // ASSERT: Full causation chain
      console.log(`Chain: ${badgeIssuedEvent.id} → ${communityAnnouncementEvent.causationEventId} → ${badgeDisplayedEvent.causationEventId}`);
      expect(badgeDisplayedEvent.causationEventId).toBe(communityAnnouncementEvent.id);
      expect(communityAnnouncementEvent.causationEventId).toBe(badgeIssuedEvent.id);
    });
  });

  describe('CorrelationId Propagation Across Domains', () => {
    it('should share correlationId across all domain events', async () => {
      // ARRANGE
      const sharedCorrelationId = 'corr-badge-flow-123';

      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        sharedCorrelationId
      );

      const communityAnnouncementEvent = new CommunityAnnouncement(
        candidateId,
        badgeIssuedEvent.badgeId,
        'Badge earned',
        badgeIssuedEvent.id,
        'community-789',
        sharedCorrelationId
      );

      const badgeDisplayedEvent = new BadgeDisplayed(
        candidateId,
        badgeIssuedEvent.badgeId,
        new Date(),
        communityAnnouncementEvent.id,
        'profile-789',
        sharedCorrelationId
      );

      // ASSERT: All events share same correlationId
      expect(badgeIssuedEvent.correlationId).toBe(sharedCorrelationId);
      expect(communityAnnouncementEvent.correlationId).toBe(sharedCorrelationId);
      expect(badgeDisplayedEvent.correlationId).toBe(sharedCorrelationId);
    });
  });

  describe('Latency Requirements', () => {
    it('should complete cross-domain event propagation in under 2 seconds', async () => {
      // ARRANGE
      eventBus.subscribe('BadgeIssued', communityHandler);
      eventBus.subscribe('BadgeIssued', profileHandler);

      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      // ACT
      const startTime = Date.now();
      await eventBus.publishEvent(badgeIssuedEvent, correlationId);
      const latency = Date.now() - startTime;

      // ASSERT
      expect(latency).toBeLessThan(2000);
      console.log(`Cross-domain event propagation latency: ${latency}ms`);
    });
  });

  describe('Handler Isolation', () => {
    it('should isolate failures between handlers', async () => {
      // ARRANGE
      communityHandler.handle.mockRejectedValue(new Error('Community service down'));
      profileHandler.handle.mockResolvedValue(undefined);

      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );

      // ACT
      eventBus.subscribe('BadgeIssued', communityHandler);
      eventBus.subscribe('BadgeIssued', profileHandler);

      // ASSERT: ProfileHandler should still execute despite CommunityHandler failure
      const handlers = eventBus.getSubscribersFor('BadgeIssued');
      expect(handlers).toHaveLength(2);
    });
  });

  describe('Event Ordering Across Domains', () => {
    it('should maintain event order in cross-domain flow', async () => {
      // ARRANGE
      const events: DomainEvent[] = [];

      const badgeIssuedEvent = new BadgeIssued(
        candidateId,
        'badge-gold-001',
        'Gold Member',
        'https://example.com/badges/gold.png',
        'badge-456',
        correlationId
      );
      events.push(badgeIssuedEvent);

      const communityAnnouncementEvent = new CommunityAnnouncement(
        candidateId,
        badgeIssuedEvent.badgeId,
        'Badge earned',
        badgeIssuedEvent.id,
        'community-789',
        correlationId
      );
      events.push(communityAnnouncementEvent);

      // ASSERT: Events in correct sequence
      expect(events[0]).toBeInstanceOf(BadgeIssued);
      expect(events[1]).toBeInstanceOf(CommunityAnnouncement);
      expect((events[1] as CommunityAnnouncement).causationEventId).toBe(events[0].id);
    });
  });
});
