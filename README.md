# Microsoft Agent Framework Exploration

This branch is dedicated to exploring and learning the **Microsoft Agent Framework**, a modern framework for building AI agents and multi-agent workflows in .NET and Python.

## Overview

The Microsoft Agent Framework combines the strengths of **AutoGen** and **Semantic Kernel**, providing:

- **Agents**: Individual agents that use LLMs to process inputs, call tools, and generate responses
- **Workflows**: Graph-based workflows for multi-step tasks with type-safe routing and human-in-the-loop support
- **Enterprise Features**: Session-based state management, type safety, middleware, telemetry, and extensive model support

## Key Capabilities

### Agents
- Use LLMs (OpenAI, Azure OpenAI, Anthropic, Ollama, and more)
- Call external tools and Model Context Protocol (MCP) servers
- Support for multi-turn conversations
- Middleware for intercepting and modifying agent behavior

### Workflows
- Graph-based orchestration for multi-agent scenarios
- Type-safe routing between agents and functions
- Checkpointing for state persistence
- Human-in-the-loop support for interactive workflows

## Quick Start

### C# Example
```dotnetcli
dotnet add package Microsoft.Agents.AI.Foundry --prerelease
```

```csharp
using System;
using Azure.AI.Projects;
using Azure.Identity;
using Microsoft.Agents.AI;

AIAgent agent = new AIProjectClient(
        new Uri("https://your-foundry-service.services.ai.azure.com/api/projects/your-foundry-project"),
        new AzureCliCredential())
    .AsAIAgent(
        model: "gpt-5.4-mini",
        instructions: "You are a friendly assistant. Keep your answers brief.");

Console.WriteLine(await agent.RunAsync("What is the largest city in France?"));
```

### Python Example
```bash
pip install agent-framework
```

```python
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential

credential = AzureCliCredential()
client = FoundryChatClient(
    project_endpoint="https://your-foundry-service.services.ai.azure.com/api/projects/your-foundry-project",
    model="gpt-5.4-mini",
    credential=credential,
)

agent = client.as_agent(
    name="HelloAgent",
    instructions="You are a friendly assistant. Keep your answers brief.",
)

# Run the agent
result = await agent.run("What is the largest city in France?")
print(f"Agent: {result}")
```

## When to Use

### Use an Agent when:
- The task is open-ended or conversational
- You need autonomous tool use and planning
- A single LLM call (possibly with tools) suffices

### Use a Workflow when:
- The process has well-defined steps
- You need explicit control over execution order
- Multiple agents or functions must coordinate

**Pro Tip**: If you can write a function to handle the task, do that instead of using an AI agent.

## Learning Path

1. **Start with Agents**: Learn basic agent creation and tool calling
2. **Add Tools**: Extend agents with external tool integration
3. **Build Conversations**: Implement multi-turn dialogue with session management
4. **Explore Workflows**: Create complex multi-agent orchestrations
5. **Add Middleware**: Implement custom interceptors and filters

## Official Resources

- 📚 [Agent Framework Documentation](https://learn.microsoft.com/en-us/agent-framework/overview/?pivots=programming-language-csharp)
- 🔧 [Tools & MCP Integration](https://learn.microsoft.com/en-us/agent-framework/agents/tools/)
- 📝 [Workflows Guide](https://learn.microsoft.com/en-us/agent-framework/workflows/)
- 🔄 [Migration Guides](https://learn.microsoft.com/en-us/agent-framework/migration-guide/)
  - From Semantic Kernel
  - From AutoGen

## Supported Models & Providers

- Microsoft Foundry
- Azure OpenAI
- OpenAI
- Anthropic
- Ollama
- And more...

## Project Structure

This branch will contain explorations and experiments with:
- Basic agent implementations
- Tool integration examples
- Workflow demonstrations
- Best practices and patterns
- Integration with Vibe Cast architecture (if applicable)

---

## Finabeo Marketing Agent - Real-World Implementation

### 🎯 Project Objective (LinkedIn Article - Published April 13, 2026)

**"Microsoft Agent Framework: The CIO's Guide to Enterprise Agentic AI (Without Vendor Lock-In)"**

This branch implements a working proof-of-concept of the Microsoft Agent Framework as described in the LinkedIn article published this morning. The objective is to demonstrate:

- ✅ **Speed**: Multi-agent workflows built and operational in days, not months
- ✅ **Enterprise-Ready**: Type safety, telemetry, state management built-in
- ✅ **Governance-First**: Not an afterthought—fundamental to the architecture
- ✅ **Flexibility**: Works with any LLM (OpenAI, Claude, local models) via abstraction layers
- ✅ **Real Results**: Generates actual marketing content (LinkedIn, Twitter, Instagram, Blog)

The system proves that Microsoft's ecosystem can deliver Agentic AI without vendor lock-in, addressing the skepticism around Microsoft's ability to compete with pure-play AI providers.

---

## 📋 Weekly Project Progress Plan

### **Week 1: MVP Development** ✅ COMPLETE

#### Phase 1: Setup & Infrastructure ✅
- [x] Set up C# .NET 10.0 console project
- [x] Configure Azure AI Foundry connection with DefaultAzureCredential
- [x] Create GitHub repo structure with proper `.gitignore`
- [x] Set up local development environment

#### Phase 2: Agent Framework Setup ✅
- [x] Install Microsoft.Agents.AI.Foundry and dependencies (v1.0.0 Stable)
- [x] Configure IChatClient abstraction from Microsoft.Extensions.AI
- [x] Implement structured output schemas with JSON serialization
- [x] Create dependency injection container

#### Phase 3: Market Research Agent ✅
- [x] Implement LLM-based market trend synthesis
- [x] Research Financial Services, Telecom, Insurance trends
- [x] Identify pain points (cloud cost waste, AI governance challenges)
- [x] Mock fallback data for API outages
- [x] Output: `MarketAnalysis` with 2+ insights

#### Phase 4: Finabeo Alignment Agent ✅
- [x] Create context provider with Finabeo services config
- [x] Map market needs to Finabeo offerings
- [x] Score alignment 0.0-1.0 for each service
- [x] Identify content themes and messaging angles
- [x] Output: `ServiceAlignment` with recommendations

#### Phase 5: Content Generation Agent ✅
- [x] Generate LinkedIn professional posts (150-300 words)
- [x] Generate Twitter/X threads (2-3 tweets with hashtags)
- [x] Generate Instagram captions (with emojis, visual briefs, hashtags)
- [x] Generate SEO-optimized blog articles (1500-2000 words)
- [x] Output: `GeneratedContent` with all 4 platforms

#### Phase 6: Workflow & Testing ✅
- [x] Create `MarketingWorkflow` orchestrator
- [x] Wire agents together sequentially
- [x] End-to-end testing with mock data
- [x] Output to JSON files with timestamps
- [x] Comprehensive documentation

#### Phase 7: Documentation ✅
- [x] README with architecture diagrams (Mermaid)
- [x] BUILD-FIX-LOG.md with all error resolutions
- [x] IMPLEMENTATION-GUIDE.md with setup steps
- [x] QUICKSTART.md for fast onboarding

### **Week 2: Production Ready** 🔄 IN PROGRESS

#### Phase 1: Azure Deployment (Pending)
- [ ] Create Azure Function Timer Trigger (daily at 8 AM UTC)
- [ ] Set up Azure Storage for content outputs
- [ ] Create database schema for content history
- [ ] Configure Managed Identity authentication
- [ ] Set up Key Vault for secrets management

#### Phase 2: Real Integration (Pending)
- [ ] Integrate real web search (currently using LLM synthesis)
- [ ] Add real Finabeo service catalog integration
- [ ] Implement error handling and retry logic
- [ ] Add observability and logging

#### Phase 3: Quality & Review (Pending)
- [ ] Email digest workflow for marketing team
- [ ] Database persistence for outputs
- [ ] Basic review dashboard
- [ ] Approval workflow before publishing

#### Phase 4: Monitoring & Observability (Pending)
- [ ] Application Insights integration
- [ ] Error tracking and alerting
- [ ] Cost monitoring and optimization
- [ ] Performance metrics dashboard

#### Phase 5: Documentation & Handoff (Pending)
- [ ] Marketing team setup guide
- [ ] Content review/edit procedures
- [ ] Publishing schedule management
- [ ] Troubleshooting guide
- [ ] Cost analysis and ROI

---

## ✅ Current Status Assessment

### Execution Results (April 13, 2026)
```
✅ Multi-agent architecture implemented
✅ All 3 agents (Research, Alignment, Content) working
✅ Workflow orchestration complete
✅ End-to-end execution: 4.968 seconds
✅ Mock fallbacks for all agents (ensures reliability)
✅ JSON output validated and formatted
✅ Deployment scripts (PowerShell + Bash)
✅ Comprehensive documentation with diagrams
✅ Build issues documented and resolved
✅ .NET 10.0 with stable dependencies (resolved 5 major NuGet conflicts)
```

### Generated Content Quality (Sample Run)
- **Market Insights**: 2 key trends identified
  - Cloud Cost Optimization (25-40% enterprise waste)
  - Agentic AI Adoption (safe deployment in regulated environments)
- **Alignment Scores**:
  - Cloud Cost Management: 0.95 alignment
  - Agentic AI Transformation: 0.88 alignment
- **Content Generated**: All 4 platforms (LinkedIn, Twitter, Instagram, Blog)
- **Quality Score**: 0.9/1.0
- **Alignment to Market**: Strong

### What's Ready for LinkedIn Article
✅ **LinkedIn Post**: 200+ word professional piece on Agent Framework governance
✅ **Twitter Thread**: 3-tweet sequence on multi-agent architecture
✅ **Instagram Content**: Caption with visual brief and emoji suggestions
✅ **Blog Draft**: 1850-word article with SEO keywords and complete outline

---

## 📝 What Remains for Week 2

| Task | Priority | Effort | Status |
|------|----------|--------|--------|
| Azure Function setup with daily trigger | High | 2 days | Pending |
| Real web search integration (vs LLM synthesis) | High | 1 day | Pending |
| Database schema & persistence | High | 1 day | Pending |
| Managed Identity & Key Vault | High | 0.5 days | Pending |
| Application Insights & monitoring | Medium | 1 day | Pending |
| Email notification workflow | Medium | 1 day | Pending |
| Review dashboard (basic) | Medium | 1.5 days | Pending |
| Performance optimization & testing | Medium | 1 day | Pending |
| Marketing team documentation | Medium | 1 day | Pending |

---

## 🚀 Quick Start

### Prerequisites
- .NET 10.0 SDK
- Azure AI Foundry project
- Foundry API key

### Run MVP
```bash
cd agents/FinabeoMarketingAgent
dotnet restore
dotnet build
export FOUNDRY_API_KEY="your-key-here"
dotnet run
```

**Output**: `output/marketing-content-{timestamp}.json`

See [agents/FinabeoMarketingAgent/README.md](agents/FinabeoMarketingAgent/README.md) for complete setup details.

---

**Status**: MVP Complete ✅ | Week 1 Done | Week 2 In Progress | Ready for Friday LinkedIn Article
