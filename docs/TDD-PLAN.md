# TDD plan — London school, outside-in

Implements [ADR-008](adr/ADR-008-london-school-tdd.md).

## Why mockist here

The riskiest parts of this product are its *interactions*, not its arithmetic.
Capture handing Candidates to Analysis; Analysis raising events Safeguarding
must react to; Coaching being suppressed by an active Red Flag. Bugs there are
conversations between objects going wrong.

Meanwhile the real collaborators are hostile to testing: a microphone, an
eight-hour overnight session, a cloud database. "Use the real thing" is either
impossible or a multi-hour test.

## Where each school is used

The two schools are applied where each is strongest, rather than picking one
dogmatically.

| Layer | Style | Why |
|---|---|---|
| Pure value objects — metrics arithmetic, band classification, STOP-BANG scoring, correlation | **State-based** (Chicago) | These are values. Asserting the output *is* asserting the behaviour, and mocks would add nothing but noise. |
| Aggregates and application services | **Interaction-based** (London) | What matters is which collaborator was called, with what, and in what order. |
| Adapters | **Contract tests** | Run against the double and the real implementation, so the doubles cannot drift. |
| Whole-system | Thin smoke layer | Too slow and flaky to drive design. |

## The cycle, per GitHub issue

```
failing acceptance test, in ubiquitous language, at the service boundary
      │
      ├─ needs something it doesn't own?
      │     → invent the port it wishes it had
      │     → mock it, specify the interaction
      │     → the interface is designed by its consumer
      │
      ├─ unit test drives the next object inward
      │     → repeat until the innermost object is a pure function
      │
      ├─ implement the adapter, contract-test it
      │
      └─ acceptance test passes → refactor → commit
```

**Mock only types you own.** Never `AudioContext`, Firestore or Express
directly — wrap them in a port we control, mock the port, cover the real
adapter with an integration test. This is why `AudioPort` exists, and it is
what let an eight-hour overnight behaviour be tested in milliseconds.

## What the ports were discovered by, not designed for

Each port in `packages/domain/src/ports` exists because a test needed it:

| Port | Discovered while testing | Shape it forced |
|---|---|---|
| `AudioPort` | the Session's frame loop | yields `FrameFeatures` only — which is also how ADR-001 is enforced structurally |
| `ClockPort` | `nightDate()` crossing midnight | time is injected, so tests don't depend on when they run |
| `IdPort` | starting a Night offline | ids are client-generated (ADR-007) |
| `NightRepositoryPort` | replaying a sync | `save` is an idempotent upsert, not an `insert` |
| `WakeLockPort` | FR-C3's refusal path | acquisition returns a boolean rather than throwing |

## Current state

| Suite | Tests | Runtime | Dependencies |
|---|---|---|---|
| `packages/domain` | 142 | ~3.5 s | none — no browser, no server, no emulator |
| `backend` | 26 (+1 skipped) | ~6.5 s | none; the Firestore contract runs when an emulator is present |

## The tests that earned their place

Cases where writing the test changed the code, rather than confirming it:

- **The baseline that hid the snoring.** `AmbientBaseline` returned `NaN` after
  a long continuous noise, because every quiet sample aged out of the 60 s
  window and the median was recomputed from an empty set. `NaN` makes every
  loudness comparison false, so detection would have silently stopped for the
  rest of the night — with no error and a plausible-looking result in the
  morning. It now holds the last known good level.

- **The splitter that ate the night.** The over-long-candidate splitter searched
  the whole interior for its quietest frame. On a run of near-constant loudness
  that is index 1, so each recursion shaved one frame off the front, each sliver
  was discarded as shorter than the minimum, and a twelve-second run collapsed
  to its last six seconds. It now searches the middle half.

- **`unknown` is not zero.** `insight.test.ts` constructs a dataset where
  counting unanswered journal questions as zero flips the alcohol association
  from *increases* to *decreases* — the product would have confidently told the
  user that drinking reduces their snoring. The test asserts both the correct
  result and the incorrect one, so the distinction cannot be optimised away by
  someone who doesn't know why it is there.

- **Zero-score Red Flags.** RF-2 and RF-4 are tested at a STOP-BANG score of 0,
  because the failure mode is a future refactor that folds them into the score.

- **Copy that cannot assert a diagnosis.** I-S4 is a test over the strings
  themselves. Its first two drafts were too blunt — they banned the word
  "diagnosis" outright, failing the copy that says "not a diagnosis", and
  banned "you have", failing "you have reported feeling sleepy". Both were
  loosened to target the medical *claim*, which is what the invariant is
  actually about.

## Contract tests

`backend/tests/repository-contract.ts` is one suite run against both the
in-memory double and the Firestore adapter. It is the mitigation for the
standard way mockist suites rot: the fake quietly stops behaving like the real
thing, and a green suite starts meaning nothing.

## Architecture and privacy as tests

`packages/domain/tests/architecture.test.ts` asserts the domain has zero
dependencies, touches no platform global, and derives no time or identity of
its own. `privacy.test.ts` deep-scans a full night's payload for binary
buffers, long numeric arrays and audio-sounding field names — and includes a
test that deliberately breaks the rule, so the detector cannot pass vacuously.

Both scan code with comments stripped: the first version failed
`ambient-baseline.ts` for a comment reading "the rolling window", and failed
`ports/index.ts` for a comment explaining the no-`Date.now()` rule. Checks that
punish self-documenting code get deleted, so they were fixed instead.
