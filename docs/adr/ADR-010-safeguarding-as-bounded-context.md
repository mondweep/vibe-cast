# ADR-010: Safeguarding is a first-class bounded context, not UI copy

**Status:** Accepted · **Date:** 2026-09-16 · **Drives:** FR-S*, G5, PRD §0

## Context

Habitual loud snoring is a cardinal symptom of obstructive sleep apnoea. A
product that measures snoring and says nothing about that is not neutral — it
actively reassures, because it hands the user a number that goes down and an
implicit message that the number is the whole story. Untreated OSA carries real
cardiovascular risk and real road-safety risk.

The easy implementation is a disclaimer in the footer and a paragraph in the
terms. That satisfies a lawyer and fails the user, because it puts the safety
message where nobody reads it and gives the coaching engine free rein to keep
optimising a metric while a Red Flag goes unspoken.

## Decision

**Model safeguarding as a bounded context with its own aggregate, invariants,
domain events and tests** — peer to Analysis and Coaching, not subordinate to
the UI.

- `RiskAssessment` is an aggregate root with the invariants in PRD §4.4
  (I-S1 … I-S4), including **I-S4: no output ever asserts presence or absence
  of a disease.**
- Red Flag rules RF-1 … RF-4 are **domain rules with unit tests**, not
  conditional rendering. RF-2 (witnessed breathing pauses) and RF-4 (sleepiness
  while driving) fire regardless of any other data, including a low STOP-BANG
  score.
- `RedFlagRaised` is a domain event. Insight & Coaching is a **customer** of
  this context (PRD §4.3) and **must suppress or reframe coaching output while
  a flag is active** — encoded as FR-I6 and tested. The product may not respond
  to "you may need a doctor" with "try a nasal strip".
- A flag persists until explicitly acknowledged (I-S3). No navigation, refresh
  or state change clears it.
- STOP-BANG scoring uses **published thresholds** (0–2 Low, 3–4 Intermediate,
  ≥ 5 High), implemented once, in the domain, with the questionnaire's own
  wording.

## Alternatives considered

1. **Disclaimer text only.** Cheapest, and what most consumer snore apps do.
   Rejected: it discharges legal exposure while leaving the actual user risk —
   a person optimising their snore score for months while untreated OSA goes
   undetected — entirely unaddressed.
2. **Full clinical screening with a richer instrument (e.g. Epworth + STOP-BANG
   + overnight oximetry integration).** Better sensitivity. Rejected for v1:
   oximetry needs hardware we don't have, and the more clinical the output
   looks, the closer we drift to regulated medical-device territory. STOP-BANG
   alone is validated, brief, and unambiguously a screening questionnaire.
3. **Refer everyone to a doctor, always.** Safe but useless — universal warnings
   are ignored, and it would make the product pointless.

## Consequences

**Positive**
- The safety behaviour is specified, tested and cannot be regressed by a UI
  refactor or a copy change.
- The coaching/safeguarding precedence is explicit in the model, so it is
  impossible to ship a build that cheerfully coaches over an active Red Flag.
- Gives a defensible answer to "is this a medical device?": it screens and
  signposts using a published instrument, and never diagnoses.

**Negative**
- Some users will get a Red Flag, see a clinician, and be told they are fine.
  That is the correct trade — STOP-BANG is deliberately sensitive rather than
  specific, and the copy sets that expectation honestly.
- Suppressing coaching during a flag reduces engagement. Accepted deliberately.
- Constrains future product copy: marketing may never imply diagnostic capability.

## Validation

- Unit tests for every Red Flag rule, including RF-2 and RF-4 firing at a
  STOP-BANG score of 0.
- Test: with an active Red Flag, the coaching service returns suppressed output.
- Test: a flag survives reload and is cleared only by explicit acknowledgement.
- Copy review: no Safeguarding string asserts or denies a diagnosis.
