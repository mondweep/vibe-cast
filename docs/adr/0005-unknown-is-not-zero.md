# ADR-0005: Unknown is not zero

- **Status:** Accepted
- **Date:** 2026-07-27
- **Deciders:** Full swarm

## Context

The DRIMS bulletin expresses "no data" in at least four ways, and they do not all mean the same thing:

| Source | Appears as | Actually means |
|---|---|---|
| `Nil` in a count column | `0` | Zero |
| `Nil` in a name column | text `Nil` | No such item exists |
| `SNR` | text | **Status Not Reported** — unknown |
| Blank cell | nothing | Ambiguous: unreported, or nothing to report |

In the 2026-07-27 bulletin, the Sonari RC part rows carry `SNR` in coordinate and figure columns, while Dhemaji and Dibrugarh carry genuine zeros across every impact section.

The natural implementation — `parseInt(cell) || 0` — collapses all four into `0`. That single line would let the console report "Sonari RC part: 0 schools damaged" when the truth is "Sonari RC part has not told us about its schools."

For a flood console this is the most dangerous class of bug available. It is silent, it looks like good news, and it produces exactly the wrong operational response: a district that has not reported gets deprioritised as though it were fine.

## Decision

**Unknown and zero are different types, distinguishable end to end, from cell parse to rendered pixel.**

1. `parseDrimsNumber` returns a discriminated union `{kind:'value'|'zero'|'unknown'}`. **It never returns a bare number.** Callers must handle all three cases; TypeScript's exhaustiveness checking enforces it.
2. `Quantity<U>` is `Known<U> | Unknown<U>`. `valueOf()` returns `number | undefined` — deliberately not `valueOr(0)`.
3. `sumQuantities` returns `{total, hadUnknowns}`. A partial total is flagged as partial and can never be presented as complete.
4. Sections that fail extraction get confidence `failed` and render as **"could not read"**, never as `0` (PRD §5.1 invariant 4).
5. Derived metrics computed from partial inputs are marked partial and say so in the UI.
6. Serialisation preserves the distinction: JSON uses `null` for unknown and `0` for zero; CSV uses an empty cell for unknown and `0` for zero. A round-trip test proves it survives.
7. The UI renders unknown as `—` with a tooltip explaining it was not reported. An officer can always tell "nothing happened" from "nobody told us".

## Consequences

**Positive**

- The most dangerous silent-corruption class is eliminated structurally rather than by discipline.
- Officers can distinguish a quiet district from an unreporting one — an operationally significant difference that the PDF itself obscures.
- Reconciliation gets more precise: sums that skipped unknowns are marked, so a total that looks low is explained rather than merely wrong.

**Negative**

- Every consumer must handle three cases instead of using a number directly. This is friction on every call site, and it is the point.
- More verbose arithmetic: no bare `a + b`.
- Some UI states need a third rendering that a simpler model would not need.

**Accepted because** the alternative is a console that confidently reports zero deaths in a district that has not filed a report.

## Alternatives considered

- **`number | null` with null meaning unknown.** Rejected: `null` is too easy to coerce accidentally — `null + 5` is `5` in JavaScript, silently. The union with a `kind` tag cannot be coerced by accident.
- **Sentinel value such as `-1`.** Rejected: sentinels leak into arithmetic and charts. A `-1` on an axis is worse than a gap.
- **Treat unknown as zero and add a footnote.** Rejected: footnotes are not read under time pressure, and the number is what drives the decision.
