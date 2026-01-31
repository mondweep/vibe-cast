/**
 * ChatFlow Test Setup
 *
 * This file provides shared test utilities, mocks, and configuration
 * for both unit and integration tests.
 */

import { vi, beforeAll, afterAll, afterEach, expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Ensure cleanup runs after each test for React components
afterEach(() => {
  cleanup();
});

// ============================================================================
// Environment Setup
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/chatflow_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6380';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret-key';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// ============================================================================
// Global Mocks
// ============================================================================

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    return `<img src="${src}" alt="${alt}" />`;
  },
}));

// Mock Socket.io client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  })),
}));

// Mock ResizeObserver (only if window is defined - for browser tests)
if (typeof window !== 'undefined') {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock scrollTo
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
  });
}

// ============================================================================
// Test Lifecycle Hooks
// ============================================================================

beforeAll(async () => {
  // Global setup before all tests
  console.log('Starting test suite...');
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllMocks();
});

afterAll(async () => {
  // Global teardown after all tests
  console.log('Test suite completed.');
});

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock user for testing
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    role: 'member',
    status: 'online',
    createdAt: new Date(),
    updatedAt: new Date(),
    joinedAt: new Date(),
    ...overrides,
  };
}

export interface MockUser {
  id: string;
  email?: string;
  name: string;
  avatar?: string;
  role?: 'owner' | 'admin' | 'moderator' | 'member';
  status?: 'online' | 'away' | 'dnd' | 'offline';
  createdAt?: Date;
  updatedAt?: Date;
  joinedAt?: Date;
  lastSeen?: Date;
}

/**
 * Creates a mock room for testing
 */
export function createMockRoom(overrides: Partial<MockRoom> = {}): MockRoom {
  return {
    id: 'room-123',
    name: 'Test Room',
    description: 'A test chat room',
    type: 'group',
    avatarUrl: null,
    isPrivate: false,
    settings: {
      isPrivate: false,
      allowInvites: true,
      slowModeSeconds: 0,
      messageRetentionDays: 30,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: new Date(),
    messageCount: 100,
    isArchived: false,
    ownerId: 'user-123',
    createdById: 'user-123',
    memberIds: ['user-123'],
    ...overrides,
  };
}

export interface MockRoom {
  id: string;
  name: string;
  description?: string;
  type?: 'direct' | 'group' | 'channel';
  avatarUrl?: string | null;
  isPrivate?: boolean;
  settings?: {
    isPrivate: boolean;
    allowInvites: boolean;
    slowModeSeconds: number;
    messageRetentionDays?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  messageCount?: number;
  isArchived?: boolean;
  ownerId?: string;
  createdById?: string;
  memberIds?: string[];
}

/**
 * Creates a mock message for testing
 */
export function createMockMessage(overrides: Partial<MockMessage> = {}): MockMessage {
  const id = overrides.id ?? `msg-${Date.now()}`;
  return {
    id,
    content: 'Hello, world!',
    roomId: 'room-123',
    senderId: 'user-123',
    type: 'text',
    replyToId: undefined,
    reactions: [],
    isEdited: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    readBy: ['user-123'],
    ...overrides,
  };
}

export interface MockMessage {
  id: string;
  content: string;
  roomId: string;
  senderId: string;
  type?: 'text' | 'image' | 'file' | 'video' | 'audio' | 'system';
  replyToId?: string;
  reactions?: MockReaction[];
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
  readBy?: string[];
}

export interface MockReaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

/**
 * Creates a mock reaction for testing
 */
export function createMockReaction(overrides: Partial<MockReaction> = {}): MockReaction {
  return {
    emoji: '👍',
    userId: 'user-123',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock typing user for testing
 */
export function createMockTypingUser(overrides: Partial<MockTypingUser> = {}): MockTypingUser {
  return {
    id: 'user-456',
    name: 'Jane Doe',
    avatar: 'https://example.com/jane-avatar.jpg',
    ...overrides,
  };
}

export interface MockTypingUser {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Creates a mock WebSocket connection
 */
export function createMockSocket(): MockSocket {
  const eventHandlers = new Map<string, Function[]>();

  return {
    id: 'socket-123',
    connected: true,
    on: vi.fn((event: string, handler: Function) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.push(handler);
      eventHandlers.set(event, handlers);
    }),
    off: vi.fn((event: string, handler?: Function) => {
      if (handler) {
        const handlers = eventHandlers.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
      } else {
        eventHandlers.delete(event);
      }
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    // Helper for testing - trigger event handlers
    trigger: (event: string, ...args: unknown[]) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.forEach(handler => handler(...args));
    },
  };
}

export interface MockSocket {
  id: string;
  connected: boolean;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (event: string, ...args: unknown[]) => void;
}

/**
 * Waits for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await wait(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Creates a mock API response
 */
export function mockApiResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Creates a mock error API response
 */
export function mockApiError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generates a random ID
 */
export function generateId(prefix = ''): string {
  const random = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}-${random}` : random;
}

/**
 * Generates a random email
 */
export function generateEmail(): string {
  return `test-${generateId()}@example.com`;
}

/**
 * Generates a JWT token for testing
 */
export function generateTestToken(payload: Record<string, unknown> = {}): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const defaultPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  };
  const encodedPayload = Buffer.from(JSON.stringify(defaultPayload)).toString('base64url');
  const signature = 'mock-signature';

  return `${header}.${encodedPayload}.${signature}`;
}

// ============================================================================
// Custom Matchers
// ============================================================================

expect.extend({
  toBeValidMessage(received: unknown) {
    const message = received as MockMessage;
    const pass =
      typeof message.id === 'string' &&
      typeof message.content === 'string' &&
      typeof message.roomId === 'string' &&
      typeof message.senderId === 'string' &&
      message.createdAt instanceof Date;

    return {
      pass,
      message: () => pass
        ? `expected ${JSON.stringify(received)} not to be a valid message`
        : `expected ${JSON.stringify(received)} to be a valid message`,
    };
  },

  toBeValidUser(received: unknown) {
    const user = received as MockUser;
    const pass =
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.name === 'string' &&
      user.createdAt instanceof Date;

    return {
      pass,
      message: () => pass
        ? `expected ${JSON.stringify(received)} not to be a valid user`
        : `expected ${JSON.stringify(received)} to be a valid user`,
    };
  },
});

// ============================================================================
// Type Declarations for Custom Matchers
// ============================================================================

declare module 'vitest' {
  interface Assertion<T> {
    toBeValidMessage(): T;
    toBeValidUser(): T;
  }
  interface AsymmetricMatchersContaining {
    toBeValidMessage(): unknown;
    toBeValidUser(): unknown;
  }
}

// ============================================================================
// Exports
// ============================================================================

export { vi, expect } from 'vitest';
