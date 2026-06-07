# ADR-016: Community Domain — Pattern Repository & Peer Code Review

**Status:** PROPOSED (2026-06-07)
**Context:** Closes the gap between PRD §7 (Community Domain) and the shipped build
**Deciders:** (pending) Product owner, Architecture team
**Methodology:** SPARC + DDD + TDD (London School), per PRD
**Related:** [ADR-013 Learning Domain], [ADR-011 CQRS Read Models], [ADR-009 EventBus], [ADR-014 Knowledge Graph & Tutor]

---

## Problem

PRD §7 specifies a **Community Domain**: (7.1) a **Pattern Repository** where Certified Architects publish reusable orchestration patterns (moderated, plagiarism-checked, rated, searchable) and (7.2) a **Peer Code Review** workflow for capstone projects. The shipped build has only a `community_profile_read_model` + a leaderboard (seeded by the contract-gap work in ADR/this curriculum effort). There is no `Pattern`, no `PeerReview` model, no moderation, and no community UI beyond profiles/leaderboard.

---

## Decision

Implement **Community** as a bounded context with two feature areas, reusing the embeddings infrastructure from ADR-014 for search and plagiarism detection.

### 1. Domain model (write side)

```
Pattern (Aggregate Root)
 ├─ id, authorId, title, category (Consensus|Topology|Memory|Security|...)
 ├─ difficulty, problem, solution, codeExample, productionContext, performanceNotes, knownLimitations
 ├─ status (DRAFT|IN_MODERATION|PUBLISHED|FLAGGED|REJECTED), stars (agg), embedding (vector(384))
 ├─ submit() → invariant: author must be Certified Architect (ACL to Certification ctx)
 └─ emits: PatternSubmitted, PatternPublished, PatternRejected, PatternFlagged

PatternRating (Entity)            learnerId, patternId, stars(1-5), reviewText?(100+), helpful
PatternModeration (Aggregate)     patternId, plagiarismScore, assignedReviewers[2], decisions[], outcome

PeerReviewRequest (Aggregate Root)
 ├─ id, requesterId, repoLink, description, areasOfInterest[(orchestration|performance|security)]
 ├─ status (OPEN|ACCEPTED|COMPLETED), proposedReviewers?
 └─ emits: PeerReviewRequested, PeerReviewAccepted

PeerReview (Aggregate Root)
 ├─ id, requestId, reviewerId, inlineComments: ReviewComment[] (threaded, per-line)
 ├─ assessment { qualityScore(1-5), orchestration, performance, security, suggestions? }
 ├─ status (IN_PROGRESS|SUBMITTED), timeSpent
 └─ emits: PeerReviewSubmitted
```

**Authorization (cross-context):** submitting a pattern and accepting a peer-review request require the **Certified Architect** credential — checked via an anti-corruption layer to the Certification context (mirrors the existing `LearningToCertificationACL` pattern), never by reaching into its tables.

### 2. Moderation & plagiarism (reuse ADR-014)
- On `PatternSubmitted`: embed the pattern text with the **same MiniLM model** (`Xenova/all-MiniLM-L6-v2`, 384-dim) used for the KG, store in `pattern_read_model.embedding`, and run a cosine-similarity check (a `pattern_search` RPC like `kg_search`) against existing patterns → `plagiarismScore`. High score → flag for human review.
- Run `aidefence_scan` / `aidefence_has_pii` on submitted content (safety + PII) before publish.
- Assign 2 community reviewers; publish on approval (PRD: 1–3 days).

### 3. Read models (CQRS — `ruflo_demo`, doubled-prefix, RLS + `projection_version`/`last_synced_event_id`)
- `ruflo_demo_pattern_read_model` (+ `embedding vector(384)` HNSW; `pg_trgm` for title/search) — public_read for PUBLISHED.
- `ruflo_demo_pattern_rating_read_model`, `ruflo_demo_peer_review_request_read_model`, `ruflo_demo_peer_review_read_model`, `ruflo_demo_review_comment_read_model`.
- Reuse existing `ruflo_demo_community_profile_read_model` + leaderboard (already serving `/community/*`).

### 4. API
**Patterns:** `GET /community/patterns` (paginate, filter by category/difficulty/rating, hybrid search = pgvector + trgm), `GET /patterns/:id`, `POST /patterns` (Architect-gated), `POST /patterns/:id/rate`, `POST /patterns/:id/flag`.
**Peer review:** `POST /community/reviews/requests`, `GET /community/reviews/pending` (Architect), `POST /reviews/requests/:id/accept`, `POST /reviews/:id/comments`, `POST /reviews/:id/submit`, `GET /community/learners/:id/reviews`.

### 5. Frontend
- `PatternsPage` (cards: title, author, category, stars, 200-char preview; filters + search), `PatternDetailPage` (problem/solution/diagrams/code, when-to-use / when-NOT, perf metrics, related patterns, rate/flag, vetted comments), `ContributePatternPage` (form + preview).
- Peer review: `RequestReviewPage`, `PendingReviewsPage`, in-app `CodeReviewerView` (line numbers + per-line threaded comments + assessment form), `MyReviewsPage`.

### 6. Synergy
- **Patterns become KG/tutor sources:** published patterns can be ingested as KG nodes (ADR-014), so the tutor can cite community patterns alongside the official curriculum.
- Ratings/reviews feed reputation → leaderboard and Metrics (ADR-017).

---

## Consequences / Risks
- **Moderation is mandatory** before publish (quality + safety) — never auto-publish unvetted content.
- Reuse the ADR-014 embedding model exactly (query/index parity) to avoid a second vector stack.
- Architect-gating must go through the Certification ACL, not direct table reads.

## Phasing
1. **P1:** Pattern repository — browse/detail/submit/rate, hybrid search.
2. **P2:** Moderation pipeline + plagiarism (embeddings) + AIDefence scan.
3. **P3:** Peer code review workflow (request → accept → inline review → assessment → notify).

## Test strategy (London School)
Mock `PatternRepository`, `ModerationService`, `NotificationService`, `ReviewService`, `CertificationACL`; assert submit-gating, reviewer assignment, plagiarism flagging, rating aggregation, and review notification — per the PRD §7 test sketches.
