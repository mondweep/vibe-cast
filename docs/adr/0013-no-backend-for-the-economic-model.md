# ADR-0013: No backend for the economic model; Supabase is a separate question

- **Status:** Proposed — **needs a decision from the product owner**
- **Date:** 2026-08-06
- **Context:** Supabase is available and was offered as a place to store bulletin
  data and model outputs
- **Relates to:** ADR-0004 (client-side-only, zero egress), ADR-0007 (static
  Netlify deployment), ADR-0010 (bundled bulletin archive)

## Context

A backend is now available, and the question is whether the rehabilitation model
should use one. It is a reasonable thing to ask: economic models usually imply
shared reference data, saved work and collaboration, all of which are
server-shaped.

**What is currently guaranteed, and how.** Zero network egress is not a promise
in a README — it is enforced twice, mechanically:

```
netlify.toml   Content-Security-Policy: … connect-src 'self' …
architecture.test.ts   no source file may call fetch, XMLHttpRequest,
                       new WebSocket, or navigator.sendBeacon
```

The CSP means the *browser* refuses an outbound request; the fitness test means
the code cannot contain one. Together they make "the bulletin never leaves your
machine" a property a sceptical user can verify from the network tab, rather than
something they have to take on trust.

That guarantee is load-bearing for this particular product in a way it would not
be for most. A district officer loading a pre-release disaster bulletin — one
that may carry casualty figures before they are public — into a web page is
making a judgement about where that document goes. Today the answer is provably
nowhere.

**What the model actually needs.** The economic model is arithmetic over data the
console already holds in memory. It needs no storage to compute, no server to
scale, and no coordination to be correct. Every input is already bundled; every
output is derived and reproducible from those inputs plus a schedule version.

## Decision

**The economic model ships entirely client-side. No backend on the core path.**

Norm schedules are **bundled at build time**, exactly as the bulletin archive and
the district boundaries already are (ADR-0010, ADR-0009). Rate schedules are
small, slow-changing published reference data — the same shape of thing as
district boundaries, and the same solution applies. This costs nothing in trust
and requires no new architecture.

Saved plans and funding scenarios use the existing IndexedDB repository, as
loaded bulletins already do.

**Supabase is not rejected. It is decoupled.** It answers a different set of
questions, none of which the economic model needs answered:

| Genuine backend use | Why it is genuinely server-shaped | Verdict |
|---|---|---|
| **The archive ages** (a stated known limitation) | The bundle is fixed at build time; only a server can serve a bulletin published after the last deploy | Strongest candidate — but note the sync already solves this via a build, and SDRF is geo-blocked from CI regardless |
| **Sharing a plan with a colleague** | Genuinely multi-user; cannot be done client-side | Real, and worth doing if users ask |
| **Publishing a norm schedule centrally** | Central update without a redeploy | Weak — a redeploy is cheap and gives versioning for free |
| **Storing bulletin data** | — | **No.** Solves nothing: the data is already parsed, bundled and faster to read locally |

If any of these are pursued, they must be **additive and opt-in**, and the
zero-egress guarantee must remain the default path — meaning the CSP relaxation
is narrow, named, and the feature is off unless the user turns it on.

## Consequences

**The model gains nothing from a backend and loses nothing without one.** Every
figure is computed from bundled inputs in under the NFR-E2 budget. There is no
capability being traded away.

**The trust story stays intact and stays verifiable.** `connect-src 'self'` and
the fitness test both keep passing. The README's claim remains a fact rather than
an intention.

**Deployment stays trivial.** Static Netlify, no secrets, no keys in the client,
no service to run, no per-user cost, no data-protection surface. For a tool whose
users are government officers handling pre-publication casualty data, having no
database is a feature.

**We defer real capability.** No shared plans, no cross-device sync, no archive
newer than the last build. These are genuine limitations and belong in the
README's known-limitations list, honestly stated, exactly as the SDRF geo-block
already is.

**Reversal is cheap, one-way.** Nothing here forecloses adding Supabase later.
Adding it now and removing it later would be far harder — a CSP once relaxed is
rarely re-tightened, and a guarantee once downgraded to a promise does not come
back.

## Alternatives considered

**Supabase for everything: bulletins, norms, plans, users.** The conventional
architecture, and it would work. Rejected because it pays a real price for
capability the model does not need. Storing already-parsed bulletins server-side
is strictly worse than the current bundle on every axis that matters here —
latency, offline use, cost, privacy, and the ability to prove what happens to the
user's file.

**Hybrid: client-side compute, Supabase for norms only.** Attractive, and the
closest call. Rejected because it relaxes `connect-src` for a dataset of perhaps
50 rates that changes maybe annually. Bundling gives versioning, offline use,
reproducibility and zero egress; fetching gives freshness we do not need, at the
cost of the one property hardest to win back. **If norms turn out to change
faster than the deploy cadence, this is the decision to revisit first.**

**Supabase for the archive-ageing problem only.** The most defensible backend
case, and worth revisiting on its own merits — but it is a question about the
*console*, not about the economic model, and should be decided separately rather
than smuggled in with a costing feature.

---

## The decision you need to make

This ADR is **Proposed**, not Accepted, because it declines an option you
offered and you may weigh it differently.

Recommendation: **build the model client-side** (this ADR as written), and treat
Supabase as a separate proposal judged on sharing and archive currency — the two
things it would genuinely be good at.

Say the word if you would rather have the backend from the start, and this ADR
gets rewritten rather than quietly worked around.
