# Friction Log: Iterating on Microsoft's Agent Stack

> _"The real constraint isn't the framework — it's whether Microsoft's stack lets you iterate fast enough to learn what multi-agent patterns actually work in your context. Enterprise governance is real, but it often becomes an excuse to avoid the messier, faster experimentation that reveals what agents should actually do. Curious what you find when the friction between safety and speed becomes visible."_

This is a running log of where the stack got in our way during Week 1–2 of building the Finabeo Marketing Agent — a three-agent workflow (Research → Alignment → Content) built on Microsoft Agent Framework, Azure AI Foundry, and Azure Functions, with branded output generation (DOCX/PPTX/SVG).

Our goal is the second half of the quote: **fast experimentation to discover what the agents should actually do**. This document is about what happened when we actually tried.

---

## The shape of the work, so we're talking about the same thing

- **What we're building:** a small multi-agent workflow that produces Finabeo-branded marketing content once a day. Not Fortune-500 scale. A *credible demo*.
- **Who's building it:** one engineer + AI pair. Azure subscription access is **Contributor at subscription scope**, no tenant admin rights.
- **What we've shipped:** the three agents work end-to-end locally, outputs land as JSON + DOCX + PPTX. The workflow logic is not where the friction lives.
- **Where the friction lives:** getting the working thing to actually *run somewhere other than my laptop*.

That split matters, because the stack sells itself as "build agents fast" and in the agent-authoring layer it genuinely does. The gravity shifts once you try to **deploy**.

---

## 1. The agent framework itself — actually fine

Credit where due. The `Microsoft.Agents.AI.Foundry` + `Microsoft.Extensions.AI` path gave us a working three-agent workflow in a day. `AIProjectClient` + `IChatClient` + an in-process workflow runner is a reasonable mental model. Local iteration on agent prompts, switching models, chaining agents — this is the *fast* part, and the framework does not fight you.

The first 80% of the learning (what prompts work, how agents should hand off, where the quality drops) happened entirely against a local console app with no cloud involvement at all.

**Verdict: the agent framework is not the bottleneck.**

---

## 2. OOXML output generation — a tax, not a blocker

Producing PowerPoint and Word outputs via OpenXML was a multi-day debugging cycle. Every fix to one structural element exposed another "PowerPoint repair" dialog: missing theme parts, missing master slide relationships, emoji encoding issues, SVG word-wrap, font scaling. This isn't Microsoft Agent Framework's fault — it's OpenXML's underlying complexity — but it's part of the Microsoft gravity well you land in when you pick this stack for "business documents."

We eventually stabilized it by porting patterns from a `python-pptx` reference project. That's a telling detail: the Python ecosystem's take on the same spec was easier to reason about than the first-party C# SDK. The tax is paid once, but it's a surprisingly steep one.

**Verdict: budget for it, don't let it eat your sprint.**

---

## 3. Deployment: where the friction actually lives

This is the interesting part, and it's where the quote's framing lands.

### The stated architecture

The "obvious" cloud path for this workload:

- Azure Functions (Consumption tier, dotnet-isolated) for the daily timer + HTTP trigger
- System-assigned Managed Identity
- Key Vault for secrets
- Storage Account for outputs
- Role assignments wiring the MI to Storage, Key Vault, and the Foundry account

Roughly 200 lines of Bicep. Clean, enterprise-shaped, the "right" answer.

### What actually happened when we tried to deploy it

In order, these are the walls we hit. Each one is real. Each one cost time. None of them are agent-framework problems.

#### Wall 1 — Azure CLI pipeline bug

First deploy attempt: `ERROR: The content for this response was already consumed`. Not a template error — a bug in `az deployment group create` on the version of azure-cli shipped via Homebrew (2.75.0, mid-2025). Upgrading to 2.85.0 fixed it. Diagnosing this took 20 minutes of running commands that couldn't even tell us what was wrong, because the CLI was eating its own error response.

> _Friction: the thing we're using to talk to the cloud is broken in a way that masks every downstream error until you upgrade it._

#### Wall 2 — `roleAssignments/write` denied

Second attempt, real error now visible: our Contributor role doesn't include `Microsoft.Authorization/roleAssignments/write`. The Bicep template can create a Function App, a Key Vault, a storage account, an App Service Plan — but it cannot grant the Function App's Managed Identity permission to *use* any of those resources. That requires `Owner` or `User Access Administrator`.

The "right" fix is to have the tenant admin grant you the User Access Administrator role scoped to your RG. We don't have that access, and getting it goes through a human approval loop that is exactly the kind of governance-as-friction the quote is pointing at.

> _Friction: the 200-line Bicep template that expresses the enterprise-correct security model cannot be deployed by the engineer who needs to run it. The path to fixing that is a ticket, not a command._

**What we did instead:** we dropped Managed Identity entirely. Removed Key Vault. Injected the Foundry API key at deploy time via `listKeys()` (Contributor *can* read keys) and stored it as an app setting. Rewrote the Foundry client path from `AIProjectClient` (AAD-only) to `AzureOpenAIClient` + `AzureKeyCredential`. Worse security story, same functional outcome. **The "safe" path and the "fast" path diverged, and we had to take the fast one or stop learning.**

This is the friction the quote warns about, visible: the governance shape of the template became an excuse for the template to not exist.

#### Wall 3 — No model deployment on the Foundry account

The Foundry account was provisioned, but **no models were deployed on it**. The code path `GetChatClient("gpt-4o")` would have failed at runtime with a model-not-found error even if every other thing had worked. Getting a model onto a Foundry account requires knowing which families are available in your region, which versions haven't been deprecated (two got deprecated *this month*, April 2026), and which SKU your subscription can actually use. We ended up on `gpt-5-mini` @ GlobalStandard/10K TPM — not because we chose it carefully for the use case, but because it was what the subscription would let us deploy without another conversation.

> _Friction: the AI resource was provisioned without the AI capability. Two different Azure surfaces had to agree before anything could call a model, and neither told us the other was empty._

#### Wall 4 — App Service compute quota is **zero**, every SKU, every region

This is the one that killed the "just fix the template" approach.

| SKU | Tier | Quota on this subscription |
|---|---|---|
| Y1 (Consumption) | Dynamic | 0 |
| B1 (Basic) | Basic | 0 |
| F1 (Free) | Free | 0 (and Function Apps can't run on Free anyway) |

We confirmed this across East US, East US 2, West US 2, Central US. General VM quota (Standard B/D/E families) is fine — 10 vCPUs in every region tested. **It is specifically App Service Plan compute that is capped at zero.** This is a platform-level gate Microsoft applies to some subscriptions (often newer enrollments or restricted default types) and can only be lifted by Azure Support.

Four consecutive Bicep iterations (fixing the linuxFxVersion, fixing a too-long storage account name, switching SKUs) each surfaced a new preflight error that masked the real one underneath. It took four failed deploys to fully confirm "there is no SKU I can pick that will succeed today."

> _Friction: the "serverless" story — the canonical Azure path for this workload — is gated behind a quota that is zero until a human approves your ticket. The approval loop is probably 1–2 days. The loop for learning what our agents should do is one command away._

### The pivot

We stopped iterating on the "correct" architecture and pivoted to **Azure Container Instances** (ACI), which draws on general-purpose vCPU quota that we confirmed is open. That meant:

- Writing a tiny ASP.NET minimal-API wrapper around the existing workflow (45 lines, two endpoints)
- Adding a `Dockerfile`
- Writing a new Bicep template for ACR + ACI instead of Function App + Plan
- Letting `az acr build` do the Docker build in the cloud (so we don't care whether the engineer has Docker Desktop on their Mac)
- Accepting that the daily timer trigger becomes "POST to the endpoint from a curl, or later wire up a Logic App cron"

This architecture is objectively *worse* than Functions for this workload — always-on billing, no native timer, less observability glue — but it ships. **It is running the workflow in Azure today, whereas the correct architecture is still blocked.**

That is exactly the trade the quote describes: safety-shaped infrastructure as an excuse not to build, vs. messy infrastructure that lets you learn. We picked learning.

#### Wall 5 — `dotnet publish --no-restore` and the transitive-dep gap

Added as an honest amendment after the fact. The first attempt at the Docker build failed inside the ACR build agent — not because the Bicep was wrong, not because of permissions, but because the `Dockerfile` ran `dotnet publish ... --no-restore` and `publish` needs packages that `restore` alone didn't pull in. Specifically: `Microsoft.Extensions.Configuration.Binder 9.0.0`, which is a *transitive* dep required by `GetSection().Get<T>()` in the console project but not declared as a direct dep of the API project.

The `--no-restore` flag is standard advice for Dockerfiles (it's supposed to make layer caching cleaner), and we copied it from a template. It's also standard advice from the SDK's error message when publish re-resolves dependencies. The two pieces of standard advice disagree in a way that only manifests once you actually build a multi-project solution in a container.

Fix: drop `--no-restore`. One line. Two minutes after diagnosis. But the diagnosis required reading a five-line stack trace inside a hundred-line ACR build log, because the error surface was "container failed during run" — not "here is the package that is missing."

> _Friction: two "standard" pieces of tooling advice conflict silently, and the resulting error is three abstraction layers deeper than the cause. Small blast radius, but it's the fifth consecutive wall in a sequence that was supposed to be the "messy but fast" path._

On the plus side — and this is genuinely positive — `az acr build` worked beautifully once the Dockerfile was right. Cloud-side Docker build, no local Docker Desktop dependency, the error came back in a sensible tarball of logs, and the cached layers made the retry fast (~60s instead of ~5 min). This is the kind of tooling that makes the stack feel first-class when it's aligned with your path.

---

## 4. What this actually cost us

Wall-clock, rough:

- **~1 day** on OOXML stabilization (agent-independent, one-time)
- **~30 min** on az CLI upgrade detour (Wall 1)
- **~3 hours** on the RBAC + auth pivot (Wall 2) — reading docs, rewriting the Foundry client, rewriting the Bicep, confirming Contributor can read keys
- **~1 hour** on model deployment + version archaeology (Wall 3)
- **~2 hours** on four failed App Service deploys + quota archaeology (Wall 4)
- **~2 hours** on the ACI pivot (new project, Dockerfile, new Bicep, new deploy script)
- **~15 minutes** on the Dockerfile `--no-restore` / transitive-dep fix (Wall 5)

**Call it ~8.5 hours of work that produced zero new learning about what our agents should do.** Every minute went to making the scaffolding match what the subscription would allow.

By contrast, the entire agent workflow — three agents, prompt engineering, output assembly, local validation — was roughly the same wall-clock, and *all* of it moved our understanding of the problem forward.

---

## 5. So — is the stack the constraint, or is it governance?

The honest answer is: **they're the same thing, and the boundary between them is exactly where the friction lives.**

Microsoft's stack is structurally opinionated toward a particular deployment shape: managed identity, role assignments, Key Vault, Consumption-tier Functions, first-party everything. When you're aligned with that shape *and* have the permissions to express it, the stack is fast. When either of those breaks — you lack the RBAC to write the template, or your subscription lacks the quota to run the result — the stack does not degrade gracefully. It degrades into four preflight errors in a row, each of which requires a different workaround, and the workarounds individually lower the security bar until you're back to shipping API keys in environment variables.

The stack isn't *preventing* fast iteration. But it's not helping, either. The path of least resistance the stack points you at (Functions + MI + Key Vault + RBAC) is the path you cannot actually take from a Contributor seat. So the "sensible default" is wrong for our permission shape, and discovering that takes four broken deploys rather than one clear error at the beginning.

**The specific frictions we'd want Microsoft to fix, in descending order of how much they cost us:**

1. **App Service quota at zero by default.** If the subscription is the wrong shape for Functions, that should be a *documented setup step*, not a preflight failure discovered during a deploy.
2. **No built-in fallback path from MI to API-key auth in the Agent Framework SDK.** `AIProjectClient` is AAD-only. If you don't have the RBAC grant, you silently fall off the supported path and have to rewrite against `AzureOpenAIClient`. One client, two auth modes, selected by config, would have saved us two hours.
3. **Foundry projects that ship without any model deployments.** The "I provisioned a Foundry account and nothing can call a model" state should either not be possible, or should produce a clear setup checklist the first time you open the project.
4. **azure-cli shipping broken releases via Homebrew.** This one's small, but it's the kind of thing that makes engineers distrust the whole chain.

**What we'd tell the audience member:**

The quote is right that governance often becomes an excuse not to experiment. But I'd sharpen it: in our experience, **governance doesn't stop experimentation — permission shape does**. The gate isn't "someone blocked us from running experiments." It's "the enterprise-correct template assumes permissions we don't have, and the alternative isn't documented, so we have to discover it by hitting walls."

The messy path — API keys in env vars, ACI instead of Functions, HTTP instead of a timer — lets us keep learning. We took it. But we took it with eyes open about what we're giving up, and the document you're reading is part of the price: we spent an afternoon writing down what we gave up so that future us (and tenant admins, and anyone else deciding whether to trust Microsoft's stack for this) has a record.

Fast experimentation and enterprise governance can coexist. They coexist when the stack makes the path from "messy and learning" to "clean and governed" a gradient, not a cliff. Today it's a cliff. We're on the messy side of it, and we're going to stay here until we know what the agents should actually do. Then we'll cross back.

---

*Logged 2026-04-14. Five walls deep, ACI image building in the cloud, Bicep for the container deploy in flight as of the last keystroke of this document.*
