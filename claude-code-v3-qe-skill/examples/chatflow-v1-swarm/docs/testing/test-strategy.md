# ChatFlow Test Strategy

## 1. Overview

This document defines the comprehensive test strategy for ChatFlow, a real-time chat application built with Next.js 14, TypeScript, Socket.io, Redis, and PostgreSQL.

### 1.1 Quality Goals

| Metric | Target | Rationale |
|--------|--------|-----------|
| Unit Test Coverage | 85% | High confidence in business logic |
| WebSocket Handler Coverage | 95% | Critical real-time functionality |
| Integration Test Coverage | 75% | API and database reliability |
| E2E Test Coverage | Key flows | User journey validation |
| Performance Regression | <5% | Maintain response times |
| Security Vulnerabilities | 0 Critical/High | Production safety |

### 1.2 Testing Pyramid

```
                    /\
                   /  \
                  / E2E \         (10-15% of tests)
                 /--------\
                /Integration\     (20-25% of tests)
               /--------------\
              /   Unit Tests   \  (60-70% of tests)
             /------------------\
```

## 2. Unit Testing Strategy

### 2.1 Framework: Vitest

**Why Vitest:**
- Native ESM support for Next.js 14
- TypeScript-first design
- Jest-compatible API for easy migration
- Fast execution with parallel test running
- Built-in coverage with v8/istanbul

### 2.2 Coverage Targets by Domain

| Domain | Coverage Target | Priority |
|--------|----------------|----------|
| `src/domain/identity` | 85% | High |
| `src/domain/messaging` | 90% | Critical |
| `src/domain/presence` | 85% | High |
| `src/lib/socket` | 95% | Critical |
| `src/lib/redis` | 80% | High |
| `src/components` | 75% | Medium |
| `src/hooks` | 80% | High |
| `src/utils` | 90% | High |

### 2.3 Unit Test Categories

#### 2.3.1 Domain Entity Tests
- User entity validation
- Message entity creation and serialization
- Chat room entity state management
- Presence status transitions

#### 2.3.2 Service Layer Tests
- Authentication service (login, logout, token refresh)
- Message service (send, receive, format)
- Notification service (push, email)
- Presence service (online, away, offline)

#### 2.3.3 Utility Function Tests
- Date/time formatting utilities
- Message sanitization
- URL parsing and validation
- Encryption/decryption helpers

#### 2.3.4 React Component Tests
- Component rendering with various props
- User interaction handling
- State updates and side effects
- Accessibility compliance

### 2.4 Unit Test Conventions

```typescript
// File naming: [component].test.ts or [component].spec.ts
// Location: Co-located with source or in tests/unit/

describe('MessageService', () => {
  describe('sendMessage', () => {
    it('should send message to valid recipient', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should reject message to blocked user', async () => {
      // Test error cases
    });

    it('should sanitize message content for XSS', async () => {
      // Security test
    });
  });
});
```

## 3. Integration Testing Strategy

### 3.1 Scope

Integration tests verify the interaction between:
- API routes and database (PostgreSQL via Prisma)
- API routes and cache layer (Redis)
- WebSocket handlers and message broker
- Authentication flow across services

### 3.2 Test Categories

#### 3.2.1 API Route Tests

| Endpoint Category | Test Focus |
|-------------------|------------|
| `/api/auth/*` | Login, logout, session management |
| `/api/messages/*` | CRUD operations, pagination |
| `/api/rooms/*` | Room creation, membership |
| `/api/users/*` | Profile, preferences, search |

#### 3.2.2 Database Integration Tests

- Prisma model operations (CRUD)
- Transaction handling
- Constraint validation
- Migration compatibility

#### 3.2.3 Redis Integration Tests

- Session storage/retrieval
- Pub/Sub message delivery
- Cache invalidation
- Rate limiting

### 3.3 Test Environment

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: chatflow_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"

  redis-test:
    image: redis:7
    ports:
      - "6380:6379"
```

### 3.4 Integration Test Patterns

```typescript
// tests/integration/api/messages.test.ts
describe('POST /api/messages', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    await seedTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should create message and update room timestamp', async () => {
    const response = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ roomId: 'room-1', content: 'Hello' });

    expect(response.status).toBe(201);
    expect(response.body.message.content).toBe('Hello');

    // Verify side effects
    const room = await prisma.room.findUnique({ where: { id: 'room-1' } });
    expect(room.lastMessageAt).toBeDefined();
  });
});
```

## 4. End-to-End Testing Strategy

### 4.1 Framework: Playwright

**Why Playwright:**
- Cross-browser support (Chromium, Firefox, WebKit)
- Native async/await API
- Auto-waiting for elements
- Network interception for mocking
- Video recording and tracing

### 4.2 Critical User Flows

| Flow | Priority | Frequency |
|------|----------|-----------|
| User Registration | Critical | Every PR |
| User Login/Logout | Critical | Every PR |
| Send Message | Critical | Every PR |
| Receive Real-time Message | Critical | Every PR |
| Create Chat Room | High | Every PR |
| Join/Leave Room | High | Every PR |
| Update Profile | Medium | Daily |
| Search Users | Medium | Daily |
| File Upload | Medium | Daily |
| Notification Settings | Low | Weekly |

### 4.3 E2E Test Structure

```typescript
// tests/e2e/messaging.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Real-time Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await login(page, testUser);
  });

  test('should send and receive message in real-time', async ({ browser }) => {
    // Create two browser contexts for sender and receiver
    const senderContext = await browser.newContext();
    const receiverContext = await browser.newContext();

    const senderPage = await senderContext.newPage();
    const receiverPage = await receiverContext.newPage();

    // Navigate both users to same room
    await senderPage.goto('/rooms/test-room');
    await receiverPage.goto('/rooms/test-room');

    // Send message
    await senderPage.fill('[data-testid="message-input"]', 'Hello!');
    await senderPage.click('[data-testid="send-button"]');

    // Verify real-time delivery
    await expect(receiverPage.locator('[data-testid="message-content"]'))
      .toContainText('Hello!', { timeout: 5000 });
  });
});
```

### 4.4 Visual Regression Testing

- Capture screenshots of key UI states
- Compare against baseline images
- 0.1% pixel difference threshold
- Mobile and desktop viewports

## 5. WebSocket Handler Testing

### 5.1 Coverage Target: 95%

WebSocket handlers are critical for real-time functionality and require extensive testing.

### 5.2 Test Categories

#### 5.2.1 Connection Lifecycle

```typescript
describe('WebSocket Connection', () => {
  it('should establish connection with valid token', async () => {});
  it('should reject connection with invalid token', async () => {});
  it('should handle reconnection after disconnect', async () => {});
  it('should clean up resources on disconnect', async () => {});
  it('should handle connection timeout', async () => {});
});
```

#### 5.2.2 Event Handlers

```typescript
describe('Message Events', () => {
  it('should broadcast message to room members', async () => {});
  it('should handle message acknowledgment', async () => {});
  it('should queue message when recipient offline', async () => {});
  it('should rate limit rapid message sending', async () => {});
});

describe('Presence Events', () => {
  it('should broadcast online status change', async () => {});
  it('should handle typing indicators', async () => {});
  it('should update last seen timestamp', async () => {});
});

describe('Room Events', () => {
  it('should notify members on user join', async () => {});
  it('should notify members on user leave', async () => {});
  it('should handle room settings updates', async () => {});
});
```

#### 5.2.3 Error Handling

```typescript
describe('WebSocket Error Handling', () => {
  it('should handle malformed message payload', async () => {});
  it('should handle unauthorized room access', async () => {});
  it('should handle Redis connection failure', async () => {});
  it('should handle message delivery timeout', async () => {});
});
```

### 5.3 WebSocket Test Utilities

```typescript
// tests/utils/socket-test-client.ts
export class SocketTestClient {
  private socket: Socket;

  async connect(token: string): Promise<void> {}
  async disconnect(): Promise<void> {}
  async emit(event: string, data: any): Promise<void> {}
  async waitFor(event: string, timeout?: number): Promise<any> {}
  async emitAndWait(event: string, data: any): Promise<any> {}
}
```

## 6. Chaos Testing Strategy

### 6.1 Purpose

Verify system resilience under failure conditions common in distributed systems.

### 6.2 Chaos Scenarios

#### 6.2.1 Network Failures

| Scenario | Test Method | Expected Behavior |
|----------|-------------|-------------------|
| Client disconnect | Kill socket connection | Reconnect with exponential backoff |
| Server restart | Restart Node process | Clients reconnect, no message loss |
| Packet loss | tc netem | Graceful degradation |
| High latency | tc netem delay | Timeout handling, UI feedback |

#### 6.2.2 Redis Failures

| Scenario | Test Method | Expected Behavior |
|----------|-------------|-------------------|
| Redis unavailable | Stop Redis container | Graceful degradation to direct delivery |
| Redis failover | Sentinel failover trigger | Automatic reconnection |
| Memory exhaustion | Set maxmemory | LRU eviction, no crash |
| Slow queries | DEBUG SLEEP | Timeout handling |

#### 6.2.3 PostgreSQL Failures

| Scenario | Test Method | Expected Behavior |
|----------|-------------|-------------------|
| Connection pool exhaustion | Max connections | Queue requests, timeout |
| Slow queries | pg_sleep() | Query timeout, circuit breaker |
| Replication lag | Delayed replica | Read-your-writes consistency |

### 6.3 Chaos Test Implementation

```typescript
// tests/chaos/redis-failover.test.ts
describe('Redis Failover', () => {
  it('should continue message delivery during Redis restart', async () => {
    // Start sending messages
    const messagePromises = sendMessages(100);

    // Trigger Redis restart mid-stream
    await restartRedisContainer();

    // Verify all messages delivered (with retries)
    const results = await Promise.all(messagePromises);
    expect(results.every(r => r.delivered)).toBe(true);
  });
});
```

## 7. Security Testing

### 7.1 OWASP Top 10 Coverage

| Vulnerability | Test Approach |
|---------------|---------------|
| Injection (SQL, NoSQL) | Parameterized queries, input validation |
| Broken Authentication | Session management, token expiration |
| Sensitive Data Exposure | Encryption at rest/transit |
| XSS | Content sanitization, CSP headers |
| CSRF | Token validation |
| Security Misconfiguration | Header checks, dependency scanning |
| Components with Vulnerabilities | npm audit, Snyk |

### 7.2 Security Test Cases

```typescript
describe('XSS Prevention', () => {
  it('should sanitize script tags in messages', async () => {
    const maliciousContent = '<script>alert("xss")</script>Hello';
    const message = await messageService.create(maliciousContent);
    expect(message.content).not.toContain('<script>');
    expect(message.content).toContain('Hello');
  });

  it('should escape HTML entities in usernames', async () => {
    const username = '<img src=x onerror=alert(1)>';
    const user = await userService.create({ username });
    expect(user.displayName).not.toContain('<img');
  });
});

describe('Authentication Bypass', () => {
  it('should reject requests without auth token', async () => {
    const response = await request(app).get('/api/messages');
    expect(response.status).toBe(401);
  });

  it('should reject expired tokens', async () => {
    const expiredToken = generateToken({ exp: Date.now() - 1000 });
    const response = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(response.status).toBe(401);
  });

  it('should prevent token reuse after logout', async () => {
    const token = await loginAndGetToken();
    await logout(token);

    const response = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(401);
  });
});

describe('Authorization', () => {
  it('should prevent access to other users private rooms', async () => {
    const response = await request(app)
      .get('/api/rooms/private-room-id')
      .set('Authorization', `Bearer ${otherUserToken}`);
    expect(response.status).toBe(403);
  });
});
```

## 8. Accessibility Testing

### 8.1 WCAG 2.1 AA Compliance

| Criterion | Requirement | Test Method |
|-----------|-------------|-------------|
| 1.1.1 Non-text Content | Alt text for images | axe-core, manual |
| 1.3.1 Info and Relationships | Semantic HTML | axe-core |
| 1.4.3 Contrast Minimum | 4.5:1 text contrast | axe-core |
| 2.1.1 Keyboard | All functions via keyboard | Playwright |
| 2.4.4 Link Purpose | Descriptive link text | axe-core |
| 3.1.1 Language of Page | lang attribute | axe-core |
| 4.1.1 Parsing | Valid HTML | W3C validator |
| 4.1.2 Name, Role, Value | ARIA attributes | axe-core |

### 8.2 Accessibility Test Implementation

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('login page should have no accessibility violations', async ({ page }) => {
    await page.goto('/login');

    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityResults.violations).toEqual([]);
  });

  test('chat room should be navigable by keyboard', async ({ page }) => {
    await page.goto('/rooms/test-room');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="message-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="send-button"]')).toBeFocused();

    // Send message with Enter key
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.type('Hello');
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="message-list"]'))
      .toContainText('Hello');
  });

  test('screen reader should announce new messages', async ({ page }) => {
    await page.goto('/rooms/test-room');

    // Verify live region exists
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeVisible();

    // Trigger new message
    await receiveMessage({ content: 'New message' });

    // Verify announcement
    await expect(liveRegion).toContainText('New message');
  });
});
```

## 9. Performance Testing

### 9.1 Performance Benchmarks

| Metric | Target | Tool |
|--------|--------|------|
| Time to First Byte | <200ms | Lighthouse |
| First Contentful Paint | <1.5s | Lighthouse |
| Largest Contentful Paint | <2.5s | Lighthouse |
| Message Latency | <100ms | Custom metrics |
| WebSocket Connection Time | <500ms | Custom metrics |
| Messages/second (per room) | >100 | k6 |
| Concurrent connections | 10,000 | k6 |

### 9.2 Load Testing Scenarios

```javascript
// tests/load/websocket-load.js (k6)
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up
    { duration: '1m', target: 1000 },   // Peak load
    { duration: '30s', target: 0 },     // Ramp down
  ],
};

export default function () {
  const url = 'wss://localhost:3000/socket';
  const token = getAuthToken();

  const res = ws.connect(url, { headers: { Authorization: token } }, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'join', room: 'load-test' }));
    });

    socket.on('message', (msg) => {
      check(msg, { 'message received': (m) => m.type === 'message' });
    });

    socket.setInterval(() => {
      socket.send(JSON.stringify({ type: 'message', content: 'Load test' }));
    }, 1000);
  });

  check(res, { 'connected': (r) => r && r.status === 101 });
}
```

## 10. Test Environment Management

### 10.1 Environment Types

| Environment | Purpose | Data | Reset Frequency |
|-------------|---------|------|-----------------|
| Local | Development | Mock/Seed | On demand |
| CI | Automated tests | Seed | Per run |
| Staging | Pre-production | Anonymized prod | Weekly |
| Production | Smoke tests only | Real | Never |

### 10.2 Test Data Management

```typescript
// tests/fixtures/seed.ts
export async function seedTestData() {
  // Create test users
  await prisma.user.createMany({
    data: testUsers,
  });

  // Create test rooms
  await prisma.room.createMany({
    data: testRooms,
  });

  // Create test messages
  await prisma.message.createMany({
    data: testMessages,
  });
}

export async function cleanupTestData() {
  await prisma.message.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.user.deleteMany({});
}
```

## 11. CI/CD Integration

### 11.1 Pipeline Stages

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 11.2 Quality Gates

| Gate | Threshold | Blocking |
|------|-----------|----------|
| Unit test coverage | 85% | Yes |
| WebSocket handler coverage | 95% | Yes |
| All tests passing | 100% | Yes |
| No new vulnerabilities | 0 critical/high | Yes |
| Accessibility violations | 0 | Yes |
| Performance regression | <5% | Warning |

## 12. Test Reporting

### 12.1 Reports Generated

- **Coverage Report**: HTML + lcov for CI integration
- **Test Results**: JUnit XML for CI dashboards
- **Playwright Report**: HTML with screenshots/videos
- **Accessibility Report**: axe-core JSON + HTML
- **Performance Report**: Lighthouse JSON + k6 summary

### 12.2 Metrics Dashboard

Track over time:
- Test pass rate trend
- Coverage trend
- Flaky test percentage
- Test execution time
- Failure categories

## 13. Appendix

### 13.1 Test File Naming Conventions

| File Type | Pattern | Example |
|-----------|---------|---------|
| Unit test | `*.test.ts` | `message.service.test.ts` |
| Integration test | `*.integration.test.ts` | `api.messages.integration.test.ts` |
| E2E test | `*.spec.ts` | `messaging.spec.ts` |
| Test fixture | `*.fixture.ts` | `users.fixture.ts` |
| Test utility | `*.helper.ts` | `socket.helper.ts` |

### 13.2 Running Tests

```bash
# Unit tests
npm run test:unit

# Unit tests with coverage
npm run test:unit:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# All tests
npm run test

# Watch mode
npm run test:watch
```

### 13.3 Debugging Tests

```bash
# Debug unit tests
npm run test:unit -- --inspect-brk

# Debug E2E tests
PWDEBUG=1 npm run test:e2e

# Generate Playwright trace
npm run test:e2e -- --trace on
```
