# AI Benefits Advisor

An AI-powered advisor copilot for Independent Age, helping advisors assist UK pensioners in accessing £10.5 billion in unclaimed benefits annually.

## Project Status

**Status:** Planning Complete - Ready for Phase 1 Development

## Overview

The AI Benefits Advisor is an **advisor-facing copilot** (not a consumer chatbot) that:
- Listens to calls in real-time with multilingual support (English, Urdu, Punjabi, Bengali)
- Provides contextual guidance and follow-up question suggestions
- Documents conversations automatically
- Generates client summaries and pre-filled application forms
- Detects safeguarding concerns with "Red Cord" protocol

**Target Impact:** Reduce time-to-benefit from 6-12 weeks to 3-4 weeks

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Agent Orchestration | [Claude-Flow](https://github.com/ruvnet/claude-flow) | Multi-agent swarm coordination |
| Vector Database | [RuVector](https://github.com/ruvnet/ruvector) | High-performance knowledge base |
| Model Routing | [Agentic-Flow](https://github.com/ruvnet/agentic-flow) | Cost-optimized LLM switching |
| Methodology | [SPARC](https://github.com/ruvnet/sparc) | Structured development approach |
| Memory System | AgentDB | 96x-164x faster semantic search |
| Telephony | Twilio + Vapi.ai | Call handling and voice orchestration |
| Transcription | Deepgram Nova-2 | Real-time multilingual STT |
| CRM | Salesforce | Case management |
| Calculator | EntitledTo API | Deterministic benefit calculations |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CLAUDE-FLOW ORCHESTRATOR               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │TRANSCRIPTION│  │  BENEFITS   │  │SAFEGUARDING │     │
│  │   AGENT     │  │   ADVISOR   │  │   AGENT     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │DOCUMENTATION│  │ CALCULATOR  │  │  FORM FILL  │     │
│  │   AGENT     │  │   AGENT     │  │   AGENT     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │    RUVECTOR + AgentDB   │
            │    (Knowledge Base)     │
            └─────────────────────────┘
```

## MVP Scope

| Element | In Scope |
|---------|----------|
| Benefits | Pension Credit, Attendance Allowance |
| Geography | England and Wales |
| Languages | English (primary), Urdu, Punjabi (Mirpuri) |
| Pilot Region | West Yorkshire (Bradford/Leeds) |
| Outputs | Call notes, client summaries, pre-filled PC/AA forms |

## Documentation

- [PRD v2.8](docs/AI_Benefits_Advisor_PRD_v2.8.docx.pdf) - Full Product Requirements Document
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Phased development approach

## Implementation Phases

1. **Foundation (Weeks 1-4):** Infrastructure, knowledge base, core agents
2. **Shadow Mode (Weeks 5-8):** Pilot with 100% human review
3. **Validated Operation (Weeks 9-16):** Full feature set, 20% sampling
4. **Scale (Months 4-6):** Expand to full team, additional benefits

## Key Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Call duration | 45-60 mins | 25-35 mins |
| Time to submission | 6-12 weeks | 3-4 weeks |
| Amount claimable | £5.7m | £25m |
| Application completion | 45% | 70% |

## Getting Started

```bash
# Install Claude-Flow
npm install -g @anthropic-ai/claude-code
npx claude-flow@alpha init --force

# Install RuVector (Rust)
cargo install ruvector-cli

# Or for Node.js
npm install ruvector
```

## Technology References

- [SPARC Methodology](https://github.com/ruvnet/sparc)
- [Claude-Flow](https://github.com/ruvnet/claude-flow)
- [Agentic-Flow](https://github.com/ruvnet/agentic-flow)
- [RuVector](https://github.com/ruvnet/ruvector)
- [AgentDB Integration](https://github.com/ruvnet/claude-flow/issues/829)

## License

Proprietary - Independent Age
