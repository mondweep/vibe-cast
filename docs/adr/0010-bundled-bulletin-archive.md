# ADR-0010: Eight bulletins ship pre-parsed; the historical seven are split out of first paint

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** Composition swarm

## Context

The console shipped with one bulletin — 27 July 2026 — parsed at build time and
framed as a *worked example*, with a "Remove the example" control and a
disclosure note wherever it contributed. That framing was chosen when it was a
single day standing next to whatever the officer loaded, and it was the honest
description of what it then was.

It stopped being honest for two reasons.

**The product's most important moment is a link someone else opens.** The owner
sends a URL. The recipient is not going to go and find a DRIMS PDF before
deciding whether the thing is worth their attention. With one bulletin the
console could show a situation but not a *trend*: the Trend view drew a single
point, Cumulative & Peak said "One bulletin is loaded — load earlier DRIMS PDFs
to accumulate across days", and the four questions the product exists to answer
across time were all answered with an instruction to go and do some work. The
recipient saw the shape of a product, not the product.

**Eight consecutive real bulletins now exist in `fixtures/`.** 20 to 27 July
2026, no gaps, all eight parsing at 23/23 sections with zero degraded. They are
not a demonstration dataset. They are the PDFs DRIMS published, read by the same
parser that reads the officer's. A trend drawn across them is a real trend, and
calling it an example understates it.

The cost is the thing that had to be looked at rather than assumed. First paint
was 232.0 kB gzipped against the NFR-4 budget of 300 kB. The eight parsed
reports are ~1.7 MB of TypeScript; built and minified, the seven historical ones
come to **76 kB gzipped**. Adding them eagerly would land first paint near
309 kB — over budget — and would make every visitor download seven bulletins
before seeing anything, most of whom will look at one screen and leave.

## Decision

**Ship all eight, pre-parsed and committed. Split them so first paint pays for
one.**

### 1. Three generated modules, one generator

`scripts/generate-bundled-bulletins.ts` parses all eight fixtures and emits:

| Module | Contents | Loading |
|---|---|---|
| `src/generated/newest-bulletin.ts` | the 27 July report | eager, in the entry chunk |
| `src/generated/bulletin-archive.ts` | the seven older reports | dynamic import only |
| `src/generated/bundled-bulletins.ts` | dates, range, and the `import()` | eager, ~0.7 kB |

This follows `generate-assam-districts.ts` and its predecessor exactly, for the
same reasons: the committed artefact costs no build-time work (Netlify must
never have to run pdf.js in Node — ADR-0007), the PDFs never reach the bundle,
and the shape stays under the type checker.

Shipping the parsed reports rather than the PDFs is what makes any of this
affordable: 9.9 MB of PDF becomes 76 kB gzipped of data, and the default path
loads no pdf.js at all (NFR-3).

### 2. The split is enforced mechanically, not asserted

A dynamic import is one careless refactor away from being a static one, at which
point the archive is silently in first paint and nothing goes red.
`scripts/verify-lazy-archive.ts` — sibling to `verify-lazy-pdfjs.ts` — checks the
real `dist/` and fails unless all four of these hold:

1. the archive is its own chunk in `dist/assets`;
2. `index.html` does not `modulepreload` it;
3. no eagerly loaded chunk imports it statically — the entry *and* everything the
   entry preloads, because a static import from `charts` would be just as eager;
4. some eagerly loaded chunk *does* import it dynamically, so a green result
   cannot mean the archive is dead code that never loads at all.

It then prints measured gzipped first paint and fails if it exceeds 300 kB.

### 3. Every bundled bulletin is verified against its PDF

`src/adapters/pdf/bundled-bulletins.test.ts` reparses all eight fixtures on every
test run and asserts the committed artefacts deep-equal the result. It covers
**every** bundled bulletin, not just the eager one: an archive verified only at
its newest day would be seven-eighths unchecked, and the seven unchecked days are
precisely the ones the Trend view draws. It also pins the verified statewide
affected population for each day, so a parser change that shifts a headline
figure stops here rather than on an officer's screen.

### 4. It is history, not an example

The framing changes with the data. The archive is presented as bundled history:
what it is, its date range, and that it ships with the console rather than being
something the officer loaded. Four rules follow:

- **The officer's own copy always wins.** A bulletin loaded for a day the archive
  covers supersedes the bundled one. This needs no special case — the bundled
  reports are handed to `BulletinTimeline` first, and same-day supersession is
  already what the aggregate specifies for a re-issued bulletin.
- **The headline views follow the newest bulletin held**, archive or loaded.
- **Staleness is measured against that same bulletin**, so bundled history can
  never make a stale console look current, and never reports as stale a console
  holding something newer.
- **It is theirs to clear** — renamed from "Remove the example" to "Clear the
  bundled history" — and it is **never written to their IndexedDB.** It is not
  their record.

### 5. The interim state is stated, not smoothed over

Between first paint and the archive arriving, the console genuinely holds one
bulletin and is about to hold eight. It says so. The Trend and Cumulative & Peak
views render "Loading the bundled history — 7 more real ASDMA bulletins are on
their way", and the copy that would otherwise appear ("1 bulletin held — load an
earlier DRIMS PDF to compare", "load earlier DRIMS PDFs to accumulate across
days") is suppressed while that is true.

This is the part most likely to be cut as a nicety, so the reasoning is worth
recording: a console that announces a count and then silently corrects it has
taught the officer that its own account of what it holds is unreliable. Every
other honesty control in this product — reconciliation warnings, derived badges,
gap markers, the staleness banner — depends on that account being trusted.

A failed load is reported the same way: "The bundled history could not be
loaded", rather than a one-bulletin console that looks like a design choice.

## Consequences

**First paint: 232.0 kB → 232.7 kB gzipped** (78% of the NFR-4 budget). The
+0.7 kB is the loader and the date manifest. The 76 kB archive chunk arrives
after paint, on its own.

**The Trend view shows a seven-day series out of the box, with no gaps.** 20–27
July is consecutive, so the no-interpolation guarantee is not exercised by the
default state — it is still exercised by tests that deliberately withhold days.

**Cumulative & Peak is meaningful on first load**, and the flow/stock rule holds
across a period eight days long: flood deaths accumulate to 61 (a floor — twelve
District rows carried no figure), Population Affected peaks at 721,024 on 23 July
with no total anywhere, and Inmates in Relief Camps peaks two days later on the
26th. That lag between water and camps is visible on the first screen an officer
sees, and it is the sort of thing a single bulletin cannot show at all.

**The archive ages.** It is fixed at build time and 27 July 2026 will not get any
newer. The staleness banner is what carries this, and it now measures against the
newest bulletin *held* rather than against a designated sample — which is both
more correct and simpler than the four-condition retention rule it replaces.

**A known parser defect became visible.** Four of the eight bulletins wrap a
District name across two lines in the PDF, and the column reader splits it:
"Karbi Anglong" arrives as "Karbi" and "Anglong", "Bongaigaon" as "Bongaigao"
and "n", "Kamrup (M)" loses its stem. It does not reach the screen — the
choropleth and the District ranking are drawn from the anchoring bulletin alone,
and the archive contributes only statewide totals — and an officer loading those
PDFs by hand has always hit it. It is pinned in
`src/adapters/ui/assam-districts.test.ts` so it cannot quietly get worse, and it
is a defect in `adapters/pdf`, to be fixed there.

## Alternatives considered

**Ship all eight eagerly.** ~309 kB first paint, over the NFR-4 budget, and every
visitor pays for seven bulletins they may never look at. Rejected on the budget
alone; the waste would have been reason enough.

**Fetch the archive as JSON at runtime.** Cheaper first paint still, but it
breaks the zero-network-egress guarantee that ADR-0004 makes a browser-enforced
property, and it introduces a failure mode — a request that can be blocked,
cached wrong, or served stale — for data that is already ours at build time.

**Keep one bulletin and add a "load the sample archive" button.** Preserves the
budget perfectly and defeats the entire purpose: the recipient of a link would
still open on one bulletin and still have to do work before the product did
anything.

**Show nothing until the archive lands.** Removes the interim state by making
first paint useless. The eager bulletin exists precisely so the console renders
with real figures immediately; waiting on 76 kB to show anything would trade the
NFR-3 guarantee for a cosmetic one.
