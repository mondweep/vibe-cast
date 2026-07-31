# ADR-0010: Every bulletin in `fixtures/` ships pre-parsed; the historical ones are split out of first paint

- **Status:** Accepted
- **Date:** 2026-07-28
- **Amended:** 2026-07-31 — the archive grew from eight bulletins to eleven, and
  the generator stopped holding a hard-coded list of dates. See *Amendment* at
  the foot of this record. Figures throughout have been restated for the
  eleven-bulletin archive; the decision itself is unchanged.
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

**Consecutive real bulletins now exist in `fixtures/`.** Eight when this was
decided (20 to 27 July 2026), eleven today (20 to 30 July), no gaps, every one
parsing at 23/23 sections with zero degraded. They are not a demonstration
dataset. They are the PDFs DRIMS published, read by the same parser that reads
the officer's. A trend drawn across them is a real trend, and calling it an
example understates it.

The cost is the thing that had to be looked at rather than assumed. First paint
was 232.0 kB gzipped against the NFR-4 budget of 300 kB. The parsed reports are
~2.2 MB of TypeScript; built and minified, the ten historical ones come to
**95 kB gzipped**. Adding them eagerly would put first paint over budget, and
would make every visitor download ten bulletins before seeing anything, most of
whom will look at one screen and leave.

## Decision

**Ship every fixture, pre-parsed and committed. Split them so first paint pays
for one.**

### 1. Three generated modules, one generator

`scripts/generate-bundled-bulletins.ts` discovers every
`fixtures/Daily_Flood_Report_YYYYMMDD.pdf` on disk, parses them all, and emits:

| Module | Contents | Loading |
|---|---|---|
| `src/generated/newest-bulletin.ts` | the newest report (30 July) | eager, in the entry chunk |
| `src/generated/bulletin-archive.ts` | the ten older reports | dynamic import only |
| `src/generated/bundled-bulletins.ts` | dates, range, and the `import()` | eager, ~0.7 kB |

Discovery, rather than a list, is deliberate and was learned the hard way — see
the *Amendment* below.

This follows `generate-assam-districts.ts` and its predecessor exactly, for the
same reasons: the committed artefact costs no build-time work (Netlify must
never have to run pdf.js in Node — ADR-0007), the PDFs never reach the bundle,
and the shape stays under the type checker.

Shipping the parsed reports rather than the PDFs is what makes any of this
affordable: 12.9 MB of PDF becomes 95 kB gzipped of data, and the default path
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

`src/adapters/pdf/bundled-bulletins.test.ts` reparses every fixture on every test
run and asserts the committed artefacts deep-equal the result. It covers
**every** bundled bulletin, not just the eager one: an archive verified only at
its newest day would be ten-elevenths unchecked, and the ten unchecked days are
precisely the ones the Trend view draws. It also pins the verified statewide
affected population, relief camps, camp inmates and non-camp inmates for each
day — each read from the PDF's own printed `Total` row through the text layer,
never copied from parser output — so a parser change that shifts a headline
figure stops here rather than on an officer's screen.

It also asserts that all 23 sections of every bundled bulletin read at
`confidence: high`. That assertion is not decoration; it caught a husk. See the
*Amendment*.

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
bulletin and is about to hold eleven. It says so. The Trend and Cumulative &
Peak views render "Loading the bundled history — 10 more real ASDMA bulletins are
on their way", and the copy that would otherwise appear ("1 bulletin held — load an
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

**First paint: 232.0 kB → 242.8 kB gzipped** (81% of the NFR-4 budget, measured
by `verify:lazy-archive` against the built `dist/`). The growth is the eager
bulletin itself: 30 July names twelve Districts where 27 July named eight. The
95 kB archive chunk arrives after paint, on its own.

**The Trend view shows a ten-day series out of the box, with no gaps.** 20–30
July is consecutive, so the no-interpolation guarantee is not exercised by the
default state — it is still exercised by tests that deliberately withhold days.
That contiguity is a property of the fixtures and not a safe assumption: it was
briefly broken (see the *Amendment*), and
`src/adapters/pdf/bundled-bulletins.test.ts` asserts the full date list so a
future hole is announced rather than discovered.

**Cumulative & Peak is meaningful on first load**, and the flow/stock rule holds
across a period eleven days long: flood deaths accumulate to 73 (a floor —
twelve District rows carried no figure), Population Affected peaks at 721,024 on
23 July with no total anywhere, Inmates in Relief Camps peaks three days later on
the 26th at 37,724, and Crop Area Submerged peaks on a third day again, 24 July
at 56,606.777 Hect. Those lags — water, then camps, then the crop assessment
catching up — are visible on the first screen an officer sees, and are the sort
of thing a single bulletin cannot show at all.

**The archive ages.** It is fixed at build time and 30 July 2026 will not get any
newer. The staleness banner is what carries this, and it now measures against the
newest bulletin *held* rather than against a designated sample — which is both
more correct and simpler than the four-condition retention rule it replaces.

**A known parser defect became visible.** Five of the eleven bulletins wrap a
District name across two lines in the PDF, and the column reader splits it:
"Karbi Anglong" arrives as "Karbi" and "Anglong", "Bongaigaon" as "Bongaigao n"
or as "Bongaigao" and "n", "Kamrup (M)" loses its stem. It is pinned in
`src/adapters/ui/assam-districts.test.ts` so it cannot quietly get worse, and it
is a defect in `adapters/pdf`, to be fixed there. The obvious geometric fix
demonstrably corrupts other bulletins, so it has not been attempted.

It used not to reach the screen at all, because the choropleth and the District
ranking are drawn from the anchoring bulletin alone and the archive contributes
only statewide totals. **On 30 July it does**: `Bongaigao n` is a row of the
newest bundled bulletin, so it is a District the choropleth cannot shade on the
first screen an officer sees. The consequence is small — Bongaigaon reports zero
affected that day — but the defect is no longer purely historical, and that
raises its priority.

## Alternatives considered

**Ship them all eagerly.** Over the NFR-4 budget, and every visitor pays for ten
bulletins they may never look at. Rejected on the budget alone; the waste would
have been reason enough. The margin only gets thinner as the archive grows,
which is the point of measuring it in CI rather than reasoning about it.

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
with real figures immediately; waiting on 95 kB to show anything would trade the
NFR-3 guarantee for a cosmetic one.

## Amendment — 2026-07-31

Three days of bulletins were added (28, 29 and 30 July) and the archive grew to
eleven. Getting there exposed three things worth recording, because each is a
failure this decision's own controls were supposed to catch, and two of them
were caught only just.

**The generator held a hard-coded list of eight dates.** The Drive sync would
download a new bulletin, the generator would ignore it, the tests and the build
would pass, and CI would commit a change that altered nothing — the deployed
console sitting unchanged while every signal said success. It now discovers
`fixtures/Daily_Flood_Report_YYYYMMDD.pdf` from disk, so "what is in `fixtures/`"
and "what the console ships" are the same statement by construction.

**A bulletin arrived that was not a bulletin.** The file in Drive named for
28 July was a 9 kB HTML page from the ASDMA website. The sync refused it
correctly, and for a period the bundle genuinely carried a one-day hole — which
the Trend view drew as a break and `detectGaps` reported, exactly as they
should. The real PDF was uploaded afterwards and the range is contiguous again.

**The 28 July bulletin then parsed to a husk.** Channel detection could not find
the Particulars gutter, silently fell back to `FALLBACK_BODY_START` (74pt),
landed right of the District column, and produced 23 of 23 sections demoted to
`failed`, no statewide totals, and eighteen "Districts" carved out of Remarks
prose — the same fault 25 and 26 July once had. The generator serialised it
without complaint, reporting "0 reconciliation failures", because reconciliation
can only validate the sections it found and has no opinion about the twenty-three
it did not.

What stopped it shipping was the document-integrity check and the assertion in
`bundled-bulletins.test.ts` that every bundled bulletin reads at `confidence:
high`. Nothing else did. Worth noting for whoever meets the next one: while the
husk was in the archive, cumulative flood deaths read **66** rather than 73 —
a plausible number, not an obviously broken one — and the only thing on screen
saying otherwise was the honest caveat "1 loaded bulletin (2026-07-28) did not
report it". A silently wrong toll is exactly the failure this console exists to
refuse, and the margin was one assertion.
