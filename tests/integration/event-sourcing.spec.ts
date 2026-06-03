/**
 * Event Sourcing Integration Tests
 *
 * Tests:
 * - EventStore: append events, retrieve by aggregate, retrieve by type, retrieve by correlation
 * - EventStore: snapshot creation and retrieval
 * - EventProjector: aggregate reconstruction from event history
 * - EventProjector: snapshot optimization (replay from snapshot point)
 * - EventProjector: event deserialization and application
 * - Complete event sourcing flow: persist → snapshot → replay → reconstruct
 *
 * Approach:
 * - Create test events and aggregates
 * - Register event deserializers
 * - Append events to EventStore
 * - Project aggregates from event history
 * - Verify state reconstruction matches expected state
 * - Verify snapshot optimization reduces replay volume
 */

import { DomainEvent } from '../../src/shared/domain/DomainEvent';
import { AggregateRoot } from '../../src/shared/domain/AggregateRoot';
import { EventStore } from '../../src/shared/infrastructure/persistence/EventStore';
import { EventProjector } from '../../src/shared/infrastructure/persistence/EventProjector';
import { DatabaseAdapter } from '../../src/shared/infrastructure/persistence/DatabaseAdapter';
import { ConsoleLogger } from '../../src/shared/infrastructure/logging/Logger';
import postgres from 'postgres';

// Test event 1
class UserCreated extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
    aggregateId: string,
    correlationId: string,
    id?: string,
    timestamp?: Date
  ) {
    super(aggregateId, 'User', correlationId, id, timestamp);
  }

  getEventName(): string {
    return 'UserCreated';
  }

  toPrimitives() {
    return {
      userId: this.userId,
      email: this.email,
      name: this.name,
      aggregateId: this.aggregateId,
      correlationId: this.correlationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

// Test event 2
class UserEmailChanged extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly newEmail: string,
    aggregateId: string,
    correlationId: string,
    id?: string,
    timestamp?: Date
  ) {
    super(aggregateId, 'User', correlationId, id, timestamp);
  }

  getEventName(): string {
    return 'UserEmailChanged';
  }

  toPrimitives() {
    return {
      userId: this.userId,
      newEmail: this.newEmail,
      aggregateId: this.aggregateId,
      correlationId: this.correlationId,
      id: this.id,
      timestamp: this.timestamp,
    };
  }
}

// Test aggregate
class User extends AggregateRoot {
  private email: string = '';
  private name: string = '';

  constructor(id: string) {
    super(id);
  }

  static create(userId: string, email: string, name: string, correlationId: string): User {
    const user = new User(userId);
    const event = new UserCreated(userId, email, name, userId, correlationId);
    user.applyEvent(event);
    user.addEvent(event);
    return user;
  }

  applyEvent(event: DomainEvent): void {
    if (event instanceof UserCreated) {
      this.email = event.email;
      this.name = event.name;
    } else if (event instanceof UserEmailChanged) {
      this.email = event.newEmail;
    }
  }

  changeEmail(newEmail: string, correlationId: string): void {
    const event = new UserEmailChanged(this.id, newEmail, this.id, correlationId);
    this.applyEvent(event);
    this.addEvent(event);
  }

  restoreFromSnapshot(snapshotData: Record<string, any>): void {
    this.email = snapshotData.email;
    this.name = snapshotData.name;
  }

  getSnapshot() {
    return {
      email: this.email,
      name: this.name,
    };
  }

  getEmail(): string {
    return this.email;
  }

  getName(): string {
    return this.name;
  }
}

/**
 * Integration tests for EventStore and EventProjector
 *
 * These tests require a running PostgreSQL database.
 * They are skipped by default (marked with describe.skip) and should be run
 * in an environment with a configured database connection via environment variables.
 *
 * To run these tests:
 * 1. Set up Supabase or PostgreSQL with event_log and event_snapshots tables
 * 2. Configure environment variables (SUPABASE_DB_HOST, SUPABASE_DB_USER, etc.)
 * 3. Run: npm test -- --testNamePattern="Event Sourcing Integration Tests"
 */
describe.skip('Event Sourcing Integration Tests', () => {
  let logger: ConsoleLogger;
  let dbAdapter: DatabaseAdapter;
  let eventStore: EventStore;
  let projector: EventProjector;
  let sql: any;

  beforeAll(async () => {
    logger = new ConsoleLogger();

    // Create database connection
    const host = process.env.SUPABASE_DB_HOST || 'localhost';
    const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);
    const user = process.env.SUPABASE_DB_USER || 'postgres';
    const password = process.env.SUPABASE_DB_PASSWORD || 'postgres';
    const database = process.env.SUPABASE_DB_NAME || 'postgres';
    const ssl = process.env.SUPABASE_DB_SSL === 'require' ? { rejectUnauthorized: false } : false;

    sql = postgres({
      host,
      port,
      user,
      password,
      database,
      ssl: ssl || undefined,
      max: 10,
      idle_timeout: 30,
      connect_timeout: 10,
    });

    dbAdapter = new DatabaseAdapter(sql);
    eventStore = new EventStore(logger, dbAdapter);
    projector = new EventProjector(logger, eventStore);

    // Register deserializers
    projector.registerDeserializers({
      'User.UserCreated': (primitives) => new UserCreated(
        primitives.userId,
        primitives.email,
        primitives.name,
        primitives.aggregateId,
        primitives.correlationId,
        primitives.id,
        primitives.timestamp ? new Date(primitives.timestamp) : undefined
      ),
      'User.UserEmailChanged': (primitives) => new UserEmailChanged(
        primitives.userId,
        primitives.newEmail,
        primitives.aggregateId,
        primitives.correlationId,
        primitives.id,
        primitives.timestamp ? new Date(primitives.timestamp) : undefined
      ),
    });
  });

  afterAll(async () => {
    await sql.end();
  });

  describe('EventStore: Append and Retrieve', () => {
    it('should append event and return sequence number', async () => {
      const userId = `test-user-${Date.now()}`;
      const correlationId = `corr-${Date.now()}`;
      const event = new UserCreated(userId, 'test@example.com', 'Test User', userId, correlationId);

      const sequenceNumber = await eventStore.appendEvent(
        event,
        'User',
        userId,
        userId,
        1
      );

      expect(sequenceNumber).toBeGreaterThan(0);
    });

    it('should retrieve events by aggregate ID in order', async () => {
      const userId = `test-user-order-${Date.now()}`;
      const correlationId = `corr-${Date.now()}`;
      const learnerId = userId;

      // Append events
      const event1 = new UserCreated(userId, 'initial@example.com', 'Test User', userId, correlationId);
      const seq1 = await eventStore.appendEvent(event1, 'User', userId, learnerId, 1);

      const event2 = new UserEmailChanged(userId, 'updated@example.com', userId, correlationId);
      const seq2 = await eventStore.appendEvent(event2, 'User', userId, learnerId, 2);

      // Retrieve
      const events = await eventStore.getEventsByAggregateId(userId);

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[events.length - 2].sequenceNumber).toBe(seq1);
      expect(events[events.length - 1].sequenceNumber).toBe(seq2);
    });

    it('should retrieve events by correlation ID', async () => {
      const correlationId = `corr-trace-${Date.now()}`;
      const userId = `test-user-corr-${Date.now()}`;
      const learnerId = userId;

      const event = new UserCreated(userId, 'test@example.com', 'Test User', userId, correlationId);
      await eventStore.appendEvent(event, 'User', userId, learnerId, 1);

      const events = await eventStore.getEventsByCorrelationId(correlationId);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].correlationId).toBe(correlationId);
    });
  });

  describe('EventStore: Snapshots', () => {
    it('should save and retrieve snapshot', async () => {
      const userId = `test-snapshot-${Date.now()}`;
      const learnerId = userId;
      const snapshotData = { email: 'test@example.com', name: 'Test User' };

      const snapshotId = await eventStore.saveSnapshot(
        userId,
        'User',
        1,
        snapshotData,
        1
      );

      expect(snapshotId).toBeDefined();

      const snapshot = await eventStore.getLatestSnapshot(userId);

      expect(snapshot).toBeDefined();
      expect(snapshot?.aggregateId).toBe(userId);
      expect(snapshot?.aggregateVersion).toBe(1);
      expect(snapshot?.snapshotData).toEqual(snapshotData);
    });

    it('should return undefined if no snapshot exists', async () => {
      const userId = `no-snapshot-${Date.now()}`;

      const snapshot = await eventStore.getLatestSnapshot(userId);

      expect(snapshot).toBeUndefined();
    });
  });

  describe('EventProjector: Aggregate Reconstruction', () => {
    it('should reconstruct aggregate from event history', async () => {
      const userId = `test-reconstruct-${Date.now()}`;
      const correlationId = `corr-${Date.now()}`;
      const learnerId = userId;

      // Append events
      const event1 = new UserCreated(userId, 'initial@example.com', 'Test User', userId, correlationId);
      await eventStore.appendEvent(event1, 'User', userId, learnerId, 1);

      const event2 = new UserEmailChanged(userId, 'updated@example.com', userId, correlationId);
      await eventStore.appendEvent(event2, 'User', userId, learnerId, 2);

      // Project aggregate
      const user = await projector.projectAggregate(userId, (id) => new User(id));

      expect(user.getId()).toBe(userId);
      expect(user.getEmail()).toBe('updated@example.com');
      expect(user.getName()).toBe('Test User');
      expect(user.getVersion()).toBe(2);
    });

    it('should use snapshot to optimize replay', async () => {
      const userId = `test-snapshot-replay-${Date.now()}`;
      const correlationId = `corr-${Date.now()}`;
      const learnerId = userId;

      // Append event 1 and save snapshot
      const event1 = new UserCreated(userId, 'initial@example.com', 'Test User', userId, correlationId);
      const seq1 = await eventStore.appendEvent(event1, 'User', userId, learnerId, 1);

      const snapshotData = { email: 'initial@example.com', name: 'Test User' };
      await eventStore.saveSnapshot(userId, 'User', 1, snapshotData, seq1);

      // Append event 2 (after snapshot)
      const event2 = new UserEmailChanged(userId, 'final@example.com', userId, correlationId);
      await eventStore.appendEvent(event2, 'User', userId, learnerId, 2);

      // Project with snapshot optimization
      const user = await projector.projectAggregate(userId, (id) => new User(id));

      expect(user.getId()).toBe(userId);
      expect(user.getEmail()).toBe('final@example.com');
      expect(user.getName()).toBe('Test User');
      expect(user.getVersion()).toBe(2);
    });

    it('should deserialize events correctly', async () => {
      const userId = `test-deserialize-${Date.now()}`;
      const correlationId = `corr-${Date.now()}`;
      const learnerId = userId;

      const event = new UserCreated(userId, 'test@example.com', 'Test User', userId, correlationId);
      await eventStore.appendEvent(event, 'User', userId, learnerId, 1);

      const correlationEvents = await projector.getEventsByCorrelation(correlationId);

      expect(correlationEvents.length).toBeGreaterThan(0);
      expect(correlationEvents[0] instanceof UserCreated).toBe(true);
    });
  });

  describe('Event Sourcing Complete Flow', () => {
    it('should persist, snapshot, and reconstruct complete workflow', async () => {
      const userId = `test-complete-${Date.now()}`;
      const correlationId = `corr-complete-${Date.now()}`;
      const learnerId = userId;

      // 1. Create and persist events
      const user = User.create(userId, 'initial@example.com', 'Test User', correlationId);
      user.changeEmail('updated@example.com', correlationId);

      for (const event of user.getUncommittedEvents()) {
        await eventStore.appendEvent(event, 'User', userId, learnerId, user.getVersion());
      }

      // 2. Create snapshot
      const eventCount = await projector.getEventCount(userId);
      const snapshot = await eventStore.saveSnapshot(
        userId,
        'User',
        user.getVersion(),
        user.getSnapshot(),
        eventCount
      );

      expect(snapshot).toBeDefined();

      // 3. Reconstruct from snapshot + events
      const reconstructed = await projector.projectAggregate(userId, (id) => new User(id));

      expect(reconstructed.getId()).toBe(userId);
      expect(reconstructed.getEmail()).toBe('updated@example.com');
      expect(reconstructed.getName()).toBe('Test User');
    });
  });
});
