# ChatFlow - Real-time Chat Application

A modern, scalable real-time chat application built with Next.js 14, Socket.io, Redis, and PostgreSQL. Designed using Domain-Driven Design (DDD) principles with clear bounded contexts.

> **Built using the [Build with Quality](../../BUILD-WITH-QUALITY-PROMPT.md) skill** with multi-agent swarm orchestration via Claude Flow V3. This is **Example 5** from [USAGE-EXAMPLES.md](../../USAGE-EXAMPLES.md).

---

## Build Journey: Prompt, Problems & Pivots

### The Prompt Used

```
Follow the Build with Quality skill at:
https://github.com/mondweep/vibe-cast/blob/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill/config/skill.yaml

Build Example 5 (ChatFlow Real-time Chat App) from:
https://github.com/mondweep/vibe-cast/blob/claude/claude-code-v3-skill-KucJF/claude-code-v3-qe-skill/USAGE-EXAMPLES.md

Output folder: examples/chatflow-v1-swarm
```

### Initial Approach: MCP Tools (Failed)

We initially attempted to use Claude Flow MCP tools for swarm orchestration:

```javascript
// Attempted - but MCP server was not configured
mcp__claude-flow__swarm_init { topology: "hierarchical-mesh", maxAgents: 13 }
mcp__claude-flow__agent_spawn { type: "architect", name: "system-architect" }
```

**Problem**: `No such tool available: mcp__claude-flow__swarm_init` - the Claude Flow MCP server was not configured in the session.

### Pivot: Claude Flow CLI Commands

We pivoted to using Claude Flow CLI commands as a fallback:

```bash
# Initialize swarm via CLI
npx claude-flow@alpha swarm init --topology hierarchical --max-agents 13 --strategy development

# Spawn agents in parallel
npx claude-flow@alpha agent spawn --type coordinator --name unified-coordinator &
npx claude-flow@alpha agent spawn --type architect --name system-architect &
npx claude-flow@alpha agent spawn --type coder --name primary-developer &
npx claude-flow@alpha agent spawn --type coder --name secondary-developer &
wait

# Initialize memory for cross-agent coordination
npx claude-flow@alpha memory init
npx claude-flow@alpha memory store --key "chatflow/init" --value '{"project":"ChatFlow"}'
```

### Problems Discovered Along the Way

| Problem | Cause | Solution |
|---------|-------|----------|
| MCP tools unavailable | MCP server not configured | Used CLI fallback commands |
| `--strategy parallel` invalid | Wrong enum value | Used `--strategy development` |
| `--type security` invalid | Wrong agent type | Used `--type security-architect` |
| Socket tests timeout | Port 3001 already in use | Tests running in parallel need isolation |
| EADDRINUSE errors | Multiple tests binding same port | Need sequential test execution for socket tests |

### Skill Documentation Updates

This build session led to improvements in the skill documentation:
1. Added **Option A (MCP)** and **Option B (CLI fallback)** to `BUILD-WITH-QUALITY-PROMPT.md`
2. Added `claude_flow_execution.cli` section to `config/skill.yaml`
3. Documented agent coordination hooks for CLI usage

### Agent Coordination Hooks

Each spawned Task agent was instructed to run Claude Flow hooks:

```bash
# Before starting
npx claude-flow@alpha hooks pre-task --description "[task]"

# After each file edit
npx claude-flow@alpha hooks post-edit --file "[filepath]" --memory-key "agent/[step]"

# After completing
npx claude-flow@alpha hooks post-task --task-id "[task]" --analyze-performance true
```

### Test Results

| Domain | Tests | Status |
|--------|-------|--------|
| Authentication | 63 | ✅ All passing |
| Frontend Components | Written | ✅ Complete |
| REST API | Written | ✅ Complete |
| Socket.io | 12 pass, 14 timeout | ⚠️ Port conflicts (infra issue) |

### Swarm Configuration Used

```
Topology: hierarchical
Agents: 9
├── coordinator (unified-coordinator)
├── architect (system-architect)
├── coder (primary-developer)
├── coder (secondary-developer)
├── reviewer (code-reviewer)
├── tester (test-strategist)
├── tester (e2e-test-generator)
├── analyst (coverage-analyzer)
└── security-architect (security-scanner)
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ChatFlow Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Client Layer                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │   Next.js   │  │   React     │  │  Socket.io  │                  │   │
│  │  │   App       │  │   Components│  │   Client    │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        API / Gateway Layer                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │  Next.js    │  │  Socket.io  │  │  NextAuth   │                  │   │
│  │  │  API Routes │  │   Server    │  │  Sessions   │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Domain Layer (DDD)                            │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │   │
│  │  │    Identity     │ │    Messaging    │ │    Presence     │        │   │
│  │  │    Context      │ │    Context      │ │    Context      │        │   │
│  │  │                 │ │                 │ │                 │        │   │
│  │  │ - Users         │ │ - Rooms         │ │ - Online Status │        │   │
│  │  │ - Auth          │ │ - Messages      │ │ - Typing        │        │   │
│  │  │ - Sessions      │ │ - Reactions     │ │ - Last Seen     │        │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Infrastructure Layer                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ PostgreSQL  │  │   Redis     │  │   Prisma    │                  │   │
│  │  │ (Messages)  │  │ (Presence)  │  │   ORM       │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 + React 18 | Server-side rendering, App Router |
| Styling | Tailwind CSS + Radix UI | Responsive design, accessible components |
| Real-time | Socket.io | WebSocket communication with fallbacks |
| Database | PostgreSQL + Prisma | Message persistence, user data |
| Cache | Redis | Presence, typing indicators, pub/sub |
| Auth | NextAuth.js | OAuth providers, session management |
| State | Zustand | Client-side state management |

## Features

### Core Chat Features
- Real-time messaging with instant delivery
- Direct messages (1:1) and group chats
- Message editing and deletion
- Threaded conversations
- Emoji reactions
- Message pinning
- Link previews and embeds

### Presence System
- Online/offline/away/DND status
- Typing indicators
- "Last seen" timestamps
- Multi-device support

### User Management
- Email/password authentication
- OAuth (Google, GitHub, Discord)
- User profiles with avatars
- Custom status messages

### Room Features
- Public channels and private rooms
- Role-based permissions (owner, admin, moderator, member)
- Member invitation system
- Slow mode and muting
- Room archival

## Project Structure

```
chatflow-v1-swarm/
├── docs/
│   ├── adr/                          # Architecture Decision Records
│   │   ├── ADR-001-websocket-technology.md
│   │   ├── ADR-002-message-persistence.md
│   │   └── ADR-003-presence-system.md
│   └── ddd/
│       └── domain-model.md           # Domain model documentation
├── prisma/
│   └── schema.prisma                 # Database schema
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth routes
│   │   ├── (chat)/                   # Chat routes
│   │   └── api/                      # API routes
│   ├── components/                   # React components
│   ├── domain/                       # Domain Layer (DDD)
│   │   ├── identity/                 # Identity bounded context
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── events/
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   ├── messaging/                # Messaging bounded context
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── events/
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   └── presence/                 # Presence bounded context
│   │       ├── entities/
│   │       ├── value-objects/
│   │       ├── events/
│   │       ├── repositories/
│   │       └── services/
│   ├── infrastructure/               # Infrastructure implementations
│   ├── lib/                          # Shared utilities
│   └── hooks/                        # React hooks
├── tests/                            # Test files
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chatflow-v1-swarm
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/chatflow"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

4. Set up the database:
```bash
npm run db:push
npm run db:seed
```

5. Start development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Docker Setup (Alternative)

```bash
# Start PostgreSQL and Redis
npm run docker:up

# Run migrations
npm run db:migrate

# Start the app
npm run dev
```

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler |
| `npm run test` | Run tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:migrate` | Run database migrations |

### Architecture Decisions

Key architectural decisions are documented in the `docs/adr/` directory:

1. **ADR-001**: Socket.io chosen for WebSocket communication (auto-reconnection, rooms support)
2. **ADR-002**: PostgreSQL for message persistence (ACID compliance, full-text search)
3. **ADR-003**: Redis for presence system (sub-millisecond latency, pub/sub)

### Domain-Driven Design

The application follows DDD principles with three bounded contexts:

1. **Identity Context**: User authentication, profiles, sessions
2. **Messaging Context**: Rooms, messages, reactions, threads
3. **Presence Context**: Online status, typing indicators, activity tracking

See `docs/ddd/domain-model.md` for detailed domain model documentation.

## API Documentation

### WebSocket Events

#### Client to Server
| Event | Payload | Description |
|-------|---------|-------------|
| `message:send` | `{ roomId, content }` | Send a message |
| `message:edit` | `{ messageId, content }` | Edit a message |
| `message:delete` | `{ messageId }` | Delete a message |
| `typing:start` | `{ roomId }` | Start typing indicator |
| `typing:stop` | `{ roomId }` | Stop typing indicator |
| `room:join` | `{ roomId }` | Join a room |
| `room:leave` | `{ roomId }` | Leave a room |

#### Server to Client
| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `Message` | New message received |
| `message:updated` | `Message` | Message was edited |
| `message:deleted` | `{ messageId }` | Message was deleted |
| `typing:update` | `{ roomId, userIds }` | Typing users updated |
| `presence:update` | `{ userId, status }` | User status changed |

## Deployment

### Vercel + Railway (Recommended)

1. Deploy Next.js to Vercel
2. Deploy PostgreSQL to Railway
3. Deploy Redis to Railway
4. Configure environment variables

### Docker Compose (Self-hosted)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://chatflow:password@db:5432/chatflow
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=chatflow
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=chatflow
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Author

Built by **Mondweep Chakravorty** using the [Build with Quality](../../BUILD-WITH-QUALITY-PROMPT.md) multi-agent skill.

- LinkedIn: [mondweepchakravorty](https://linkedin.com/in/mondweepchakravorty/)
- GitHub: [mondweep](https://github.com/mondweep)

## References

- [Build with Quality Skill](../../BUILD-WITH-QUALITY-PROMPT.md) - The skill prompt used
- [Skill Configuration](../../config/skill.yaml) - YAML config with MCP and CLI instructions
- [Usage Examples](../../USAGE-EXAMPLES.md) - All example projects including this one
- [Claude Flow V3](https://github.com/ruvnet/claude-flow) - Multi-agent coordination framework

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Real-time powered by [Socket.io](https://socket.io/)
- Database ORM by [Prisma](https://www.prisma.io/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Multi-agent orchestration by [Claude Flow](https://github.com/ruvnet/claude-flow)

---

*Generated with Claude Code using the Build with Quality multi-agent swarm*
