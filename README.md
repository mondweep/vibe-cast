# 🔮 Pi Network Explorer

A decentralized collective intelligence platform explorer built with React, TypeScript, and PubNub, deployed on Netlify.

**Project Status:** TASK-001 (Project Scaffold) ✅ Complete  
**Next Phase:** TASK-002 (Netlify API Functions)

## 📋 Project Overview

The Pi Network Explorer enables users to:

- **🔍 Explore Knowledge** - Search the pi.ruv.io network's semantic knowledge graph
- **✍️ Contribute** - Submit new memories and insights to the collective intelligence
- **🗳️ Vote** - Rate and improve knowledge quality through Bayesian scoring
- **📊 Dashboard** - Watch real-time network activity powered by PubNub
- **🧪 Test APIs** - Interactive sandbox for exploring REST endpoints

## 🏗️ Architecture

```
Frontend (React + TypeScript)
  ↓
Netlify Functions (Node.js backend)
  ↓
PubNub (Real-time pub/sub messaging <100ms latency)
  ↓
Pi Network (pi.ruv.io decentralized knowledge graph)
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite (sub-100ms HMR) |
| Backend | Netlify Functions |
| Real-time | PubNub (guaranteed <500ms latency) |
| Hosting | Netlify (free tier) |
| Styling | CSS-in-JS |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (or use nvm)
- npm or yarn
- A PubNub account (free tier available)
- Pi Network API key (from pi.ruv.io)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mondweep/vibe-cast.git
   cd vibe-cast
   git checkout claude/pi-tinkering-86sN1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your values:
   ```
   PUBNUB_PUBLISH_KEY=your_publish_key
   PUBNUB_SUBSCRIBE_KEY=your_subscribe_key
   REACT_APP_PUBNUB_SUBSCRIBE_KEY=your_subscribe_key
   PI_NETWORK_API_URL=https://pi.ruv.io
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:5173` in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 📚 Documentation

### BHIL Methodology

This project uses the BHIL (Barry Hurd Innovation Lab) AI-First Development Toolkit:

- **`docs/prd/`** - Product Requirements Documents (quantified user needs)
- **`docs/spec/`** - Technical Specifications (architecture, interfaces, testing)
- **`docs/adr/`** - Architecture Decision Records (design rationales)
- **`docs/tasks/`** - Task breakdown and sprint planning

### Key Documents

- **PRD-001** - Product requirements with quantified success metrics
- **SPEC-001** - Technical architecture and component specifications
- **ADR-001** - Why Netlify (vs Vercel, Cloud Run)
- **ADR-002** - Why PubNub (vs Firebase, WebSockets)
- **ADR-003** - Why React (vs Vue, Svelte)
- **SPRINT-S1-PLAN** - 4-week MVP delivery timeline
- **TASK-001** - Project scaffold (current)
- **TASK-002** - API functions (next)

## 🔌 API Endpoints

### `/api/search` (POST)
Search the pi network knowledge graph.

**Request:**
```json
{
  "query": "machine learning",
  "limit": 10,
  "offset": 0,
  "domain": "ai"
}
```

**Headers:**
- `x-api-key` - Your pi.ruv.io API key
- `x-session-id` - Unique session identifier

**Real-time Response:** Published to PubNub channel `search_results_[sessionId]`

### `/api/contribute` (POST)
Submit new knowledge to the network.

**Request:**
```json
{
  "title": "Knowledge Title",
  "content": "Detailed knowledge content",
  "domain": "technology",
  "tags": ["ai", "learning"]
}
```

**Real-time Response:** Published to PubNub channel `contribution_updates_[sessionId]`

### `/api/vote` (POST)
Vote on existing knowledge.

**Request:**
```json
{
  "memoryId": "mem_12345",
  "vote": 1
}
```

**Vote:** `1` for upvote, `-1` for downvote

## 📊 Success Metrics (from PRD-001)

| Metric | Target | Status |
|--------|--------|--------|
| Page load time | <2s | ✓ (Lighthouse ≥90) |
| Real-time latency | <500ms | ✓ (PubNub P99) |
| API response time | <3s | 🔄 (In development) |
| Search accuracy | ≥85% | 🔄 (In development) |
| Feature completeness | 100% | 🔄 (5/5 features planned) |
| Uptime | ≥99% | ✓ (Netlify + PubNub SLA) |

## 🛠️ Development Workflow

### Type Checking
```bash
npm run type-check
```

### Building
```bash
npm run build  # TypeScript + Vite bundle
```

### Hot Module Replacement
Changes to `src/` are reflected instantly in the browser (Vite HMR).

## 🔐 Security

- **API Keys**: Never committed to git (use `.env`)
- **PubNub Keys**: Published key only in frontend; publish key stored server-side
- **Secrets**: Stored in Netlify environment variables (not in code)
- **HTTPS**: All api.pi.ruv.io calls use HTTPS

## 📦 Project Structure

```
vibe-cast/
├── src/
│   ├── components/       # React components (coming soon)
│   ├── hooks/            # Custom React hooks (coming soon)
│   ├── services/         # API clients, PubNub service
│   ├── types/            # TypeScript interfaces
│   ├── pages/            # Page components (coming soon)
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   ├── index.css         # Global styles
│   └── App.css           # Component styles
├── functions/
│   └── api/
│       ├── search.ts     # Search endpoint
│       ├── contribute.ts # Contribution endpoint
│       └── vote.ts       # Voting endpoint
├── public/
│   └── index.html        # HTML template
├── docs/
│   ├── prd/              # Product requirements
│   ├── spec/             # Technical specifications
│   ├── adr/              # Architecture decisions
│   └── tasks/            # Task breakdown & sprint plans
├── netlify.toml          # Netlify configuration
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 📅 Sprint Timeline

**Week 1:** Project scaffold (✅ complete) + API functions  
**Week 2:** UI components (SearchView, ContributeView)  
**Week 3:** Dashboard & real-time updates  
**Week 4:** Testing, optimization, deployment  

## 🐛 Troubleshooting

### Port 5173 Already in Use
```bash
npm run dev -- --port 5174
```

### TypeScript Errors
```bash
npm run type-check
# Fix any type issues before building
```

### Build Fails
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### PubNub Connection Issues
1. Verify PubNub keys in `.env`
2. Check browser console for connection errors
3. Ensure firewall allows WebSocket connections

## 📖 References

- [Pi Network](https://pi.ruv.io/)
- [PubNub Documentation](https://www.pubnub.com/docs/)
- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [BHIL Methodology](https://github.com/camalus/BHIL-AI-First-Development-Toolkit)

## 📝 License

MIT

## 🙋 Support

For issues or questions, refer to:
- GitHub Issues: [mondweep/vibe-cast](https://github.com/mondweep/vibe-cast/issues)
- Documentation: `docs/` directory
- BHIL Methodology: Project specification (source of truth, not code)

---

**Specifications are the source of truth, not code.** — BHIL
