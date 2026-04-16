# I Spent a Week Stress-Testing the Microsoft Agent Framework. Here's What Enterprise CIOs Need to Know.

*Published April 2026*

---

Last week I set myself a challenge: take the Microsoft Agent Framework from zero to a production-grade, multi-agent system deployed on Azure — and push every feature hard enough to find the edges. Not a toy demo. Not a quickstart tutorial. A real pipeline generating marketing content for two different companies, with live web search, branded document generation, quality gates, telemetry, and human-in-the-loop approval.

I wanted to answer one question honestly: **is this framework ready for enterprise Agentic AI, or is it marketing wrapped around a thin IChatClient wrapper?**

The answer is nuanced — and more useful than a simple yes or no.

---

## What I Built

A multi-agent marketing content pipeline running on Azure Container Instances, serving two companies (a consulting firm and a vehicle safety manufacturer) from the same codebase:

**Research Agent** → analyses market trends using live web search (Brave Search API)
**Alignment Agent** → maps the company's service catalog to identified market needs
**Content Agent** → generates LinkedIn posts, Twitter threads, Instagram captions, and blog articles

The pipeline produces branded Word documents, PowerPoint decks, and JSON output, uploaded to Azure Blob Storage. A demo frontend lets non-technical stakeholders browse and download outputs. A human-in-the-loop approval step — with Teams notifications and a web-based review page — gates publication.

All running on gpt-4o-mini. Total token cost per run: approximately 7,000–10,000 tokens (~$0.01–0.02).

---

## The Investigation: 12 Framework Features, Honestly Evaluated

I set out to test every major capability surface the framework claims to offer. Here's the scorecard, grouped by what I found.

### What the framework does genuinely well

**1. IChatClient abstraction — the foundation**

The `IChatClient` interface is the core innovation. Every agent talks through it. Every middleware wraps it. Every provider (Azure OpenAI, OpenAI, Anthropic, Ollama) implements it. If you know ASP.NET Core's `HttpClient` pipeline, you already understand this. It's composable, testable, and provider-agnostic.

This matters for enterprises because it eliminates vendor lock-in at the interface level. Swapping from Azure OpenAI to Anthropic is a configuration change, not a rewrite.

**2. Tools / function calling — the standout feature**

`AIFunctionFactory.Create()` turns any C# method into a tool the LLM can call. `UseFunctionInvocation()` middleware handles the LLM → tool → LLM round-trip automatically. I used this for:

- **Company catalog lookups** — the Alignment Agent decides when to call `GetCompanyServices()`, `GetCompanyVoice()`, `GetCompanyTargetIndustries()`
- **Live web search** — the Research Agent calls `SearchWeb()` and `SearchNews()` via Brave Search API

Same pattern for both. The framework's tool abstraction genuinely scales. Adding a new tool is writing a method and decorating it with `[Description]`. The LLM decides when to call it. The middleware handles the rest.

**3. Middleware pipeline — genuinely ergonomic**

The `DelegatingChatClient` base class lets you intercept every LLM call. I built a `TelemetryChatClient` that captures per-call latency, token counts, and cumulative session metrics. Adding it to the pipeline was one line:

```csharp
var chatClient = rawClient
    .AsBuilder()
    .Use(inner => new TelemetryChatClient(inner, loggerFactory))
    .UseFunctionInvocation()
    .Build();
```

This is the same chain-of-responsibility model as ASP.NET Core HTTP middleware. If your team knows that pattern, they'll be immediately productive.

**4. Native OpenTelemetry — first-class, not bolted on**

The framework ships `OpenTelemetryChatClient` with a `.UseOpenTelemetry()` extension method, following the OpenTelemetry Semantic Conventions for Generative AI v1.40. One line to add it. Proper spans with token counts, latency, and model metadata flow to App Insights. This is the kind of production infrastructure that separates a real framework from a toy.

### Where the framework is deliberately minimal

**5. Workflow orchestration — bring your own**

The framework has no native workflow graph. No DAGs. No branching primitives. No looping constructs. You write plain C# control flow.

I built a quality gate that checks alignment scores and loops back if they're below 0.8:

```csharp
while (true)
{
    alignment = await _alignmentAgent.ExecuteAsyncTyped();
    var topScore = alignment.Services.Max(s => s.AlignmentScore);
    
    if (topScore >= 0.8 || attempt > maxRetries)
        break;
        
    attempt++;
}
```

This is pragmatic, not a gap. The framework gives you agents and middleware and stays out of the orchestration layer. For a 3-step pipeline with a gate, plain C# is the right tool. For a complex DAG with parallel branches and saga patterns, you'd bring Temporal or Durable Functions.

**6. Multi-tenant enforcement — manual threading**

I hit a real bug here. A Claude CoWork session added multi-company support, correctly wiring company profiles through the Alignment Agent — but left the Research and Content agents with hardcoded Finabeo/fintech prompts. Brigade Electronics reports were generating fintech content under a Brigade header.

The framework doesn't prevent this. Nothing in `Microsoft.Extensions.AI` enforces that if you have a company registry, all agents must consume it. A framework with stronger tenant-aware primitives might catch this at compile time.

### Where the framework has genuine gaps

**7. Workflow checkpointing — not there**

`AgentSession.StateBag` exists for conversation-scoped state. `FoundryMemoryProvider` provides server-side memory. But there is no workflow-step persistence. No `SaveWorkflowState()`. No resume-from-step after a crash.

For a pipeline that runs 60–90 seconds, crash recovery matters. You'd implement it yourself: serialise `WorkflowResult` to blob storage after each agent step, reload on resume.

**8. Human-in-the-loop — entirely custom plumbing**

No native pause/resume primitives. I built the full HITL flow myself:

- `POST /api/generate-with-approval` generates content, holds it in memory
- `TeamsNotifier` posts an Adaptive Card to a Teams channel
- `approve.html` shows a review page with LinkedIn preview and Approve/Reject buttons
- On approve → outputs upload to blob. On reject → content is discarded.

It works. Both paths are verified end-to-end. But every piece — the pending store, the notification, the approval page, the two-phase workflow split — is code I wrote, not framework capability.

This is the most significant gap versus alternatives like LangGraph (which has native interrupts and state persistence) or Temporal (which has workflow checkpointing built in).

**9. Feedback-aware retry — not supported**

My quality gate stress test revealed this clearly. I set the threshold to 0.99 (unreachable) to force retries. Across three attempts, the LLM produced scores of 0.95 → 0.90 → 0.95. No improvement. Just token burn.

The problem: the framework has no mechanism for feeding a gate result back into the next agent invocation. Each retry re-runs the same prompt with no context about what went wrong. Production systems need "score was 0.85, try harder on service X" — and that's entirely DIY.

The numbers tell the story:

| | 1 attempt | 3 attempts (forced retry) |
|---|---|---|
| LLM calls | 6 | 12 |
| Tokens | 10,043 | 18,049 (+80%) |
| Duration | 58s | 152s (+162%) |
| Top score | 0.95 | 0.95 (unchanged) |

---

## The Honest Verdict

### For enterprise CIOs considering the Microsoft Agent Framework

**Use it if:**
- Your team knows .NET and the ASP.NET Core middleware pattern
- You need provider-agnostic LLM access (swap models without rewriting agents)
- Your workflows are linear or mildly branching (most are)
- You value native OpenTelemetry and want observability from day one
- You want tools/function calling that genuinely works and scales
- You're already in the Azure ecosystem and want natural integration

**Be cautious if:**
- You need complex workflow graphs with parallel branches and saga patterns
- Crash recovery and checkpointing are non-negotiable on day one
- Human-in-the-loop approval is a core requirement (you'll build it yourself)
- You expect the framework to enforce multi-tenant isolation

**Don't use it if:**
- You need a workflow engine — that's not what this is. Use Temporal, Durable Functions, or LangGraph alongside it.
- You expect mature, battle-tested abstractions — this is v1.0, and it shows in the gaps. The core (`IChatClient`, tools, middleware) is solid. The edges (state management, workflow orchestration, HITL) are minimal.

### What surprised me most

The **middleware pipeline** is the sleeper feature. Everyone talks about agents and tools. But the ability to compose `IChatClient` wrappers — telemetry, function invocation, OpenTelemetry, rate limiting, caching — using the same pattern .NET developers have used for HTTP middleware for a decade? That's the thing that will make this framework stick in enterprises.

The **tool-calling abstraction** is the headline feature, and it deserves the spotlight. `AIFunctionFactory.Create()` is as close to "just make my method available to the LLM" as I've seen in any framework. No JSON schema hand-writing. No tool registration boilerplate. Just a method with a `[Description]` attribute.

The **Azure deployment story** was the hardest part of the entire week — and none of that friction came from the Agent Framework. It came from Azure: zero App Service quota in every region, `roleAssignments/write` permission gaps, a reasoning-model confusion (gpt-5-mini isn't a chat model), and ACI image-pull caching. The framework itself was the easy part.

---

## The Numbers

| Metric | Value |
|--------|-------|
| Framework features explored | 12/12 |
| Validated end-to-end | 10 |
| Spike findings documented | 2 |
| Companies supported | 2 (Finabeo, Brigade Electronics) |
| LLM calls per run | 5–12 (depending on tools + quality gate) |
| Tokens per run | 6,800–18,000 |
| Run duration | 37–152s |
| Azure infrastructure walls hit | 8 (documented in friction log) |
| Framework friction walls hit | 3 (multi-tenant, checkpointing, HITL) |
| Lines of custom code for HITL | ~510 |
| Lines of code the framework gave us for free | tools, middleware, telemetry, OTel, provider abstraction |

---

## What I'd Do Differently

1. **Start with `AIAgent`/`AIAgentBuilder`** instead of raw `IChatClient`. We built agents as plain classes calling `IChatClient` directly. The framework has a higher-level `AIAgent` type with its own middleware pipeline and session management. Worth exploring.

2. **Add `.UseOpenTelemetry()` from day one.** We built a custom `TelemetryChatClient` before discovering the native OTel middleware exists. It would have saved an hour.

3. **Plan for multi-tenant from the start.** Threading a company profile through three agents sounds simple. Getting it wrong produces content with the wrong company's terminology, and the framework won't catch it.

---

## The Bottom Line

The Microsoft Agent Framework is a genuine, production-viable foundation for enterprise Agentic AI. The core — `IChatClient`, tools, middleware, OpenTelemetry — is solid, composable, and idiomatic for .NET developers.

But it's a **foundation**, not a complete solution. Workflow orchestration, state persistence, human-in-the-loop, and feedback-aware retry are all bring-your-own. If you're evaluating it against LangGraph or Temporal, understand that comparison: it gives you the agent layer, they give you the workflow layer. Many production systems will need both.

The question isn't "is it ready?" — it is. The question is "what are you expecting it to do for you, and what are you prepared to build yourself?"

For our use case — a multi-agent marketing pipeline with branded output, live web search, and human approval — it was the right choice. The framework handled the hard parts (LLM abstraction, tool calling, observability) and stayed out of the way for the parts that are better written in plain code (workflow logic, approval flows, output formatting).

That's a framework I'd recommend to an enterprise team. Not because it does everything, but because it does the right things well and doesn't pretend about the rest.

---

*The full codebase, friction log, and technical documentation are available in the project repository. All Azure resource names have been masked for security.*

*Built with Microsoft Agent Framework v1.0.0, Microsoft.Extensions.AI v10.4.0, gpt-4o-mini, Azure Container Instances, and Brave Search API.*

#MicrosoftAgentFramework #AgenticAI #EnterpriseAI #AzureAI #CIO #DigitalTransformation
