# PRD — Visual Mathematical Dictionary

**Status:** Draft v1
**Owner:** Mondweep Chakravorty
**Label:** `visual-math-dictionary`

---

## 1. Problem

*The Princeton Companion to Mathematics* is the best single map of modern
mathematics in print, and almost nobody finishes it. It is 1057 pages and 288
articles written by working mathematicians for readers who already have the
scaffolding. Someone who wants to *understand* the landscape — not just own the
book — hits three walls:

1. **No route through it.** Article III.21 (Elliptic Curves) assumes III.30
   (Galois Groups) which assumes I.3 (Some Fundamental Mathematical
   Definitions). The dependencies are real but invisible; the book is ordered
   alphabetically within parts, not pedagogically.
2. **Static pictures for moving ideas.** Curvature, homotopy, the Fourier
   transform and dynamical systems are all fundamentally about *things
   changing*. A still figure with a caption is the wrong medium for them.
3. **No feedback loop.** You cannot tell whether you understood an article. You
   close it feeling enlightened and cannot reconstruct the argument a week
   later. Reading is mistaken for mastery.

## 2. What we are building

A learning app that turns the Companion's topic map into a **visual, scroll-driven
course with real assessment**.

Each concept becomes a **lesson**: a scrollytelling narrative where the diagram
is pinned and *transforms* as you scroll — not a wall of text with pictures
beside it. The animation is the explanation. Formal notation arrives only after
the picture has done its work.

Progress is governed by a **prerequisite graph** and a **spaced-repetition
schedule**, so the app decides what you are ready for and what you are about to
forget.

## 3. Copyright position — read this first

The Companion is © 2008 Princeton University Press, All Rights Reserved. This
project therefore:

- **Extracts only a citation index** — part/article numbers, titles, and page
  offsets. This is a bibliography, in `data/curriculum.json`. See
  `tools/extract_curriculum.py`, which is the only code that ever opens the PDF.
- **Writes every word of lesson content, every diagram and every test question
  from scratch.** No prose, figures or exercises are copied, paraphrased
  closely, or machine-derived from the book.
- **Cites the source article on every lesson** ("This is PCM III.21 — read it
  for the full treatment"), so the app drives readers *to* the book rather than
  substituting for it.
- **Never ships the PDF.** The book file is not a build input, is not deployed,
  and must not be committed. `.gitignore` blocks it.

> **Open action:** `PCM.pdf` was committed to this public repository in `ef953fe`
> and is currently downloadable by anyone. It needs removing, which requires
> rewriting the branch history — deleting it in a later commit leaves the blob
> reachable. This is tracked as a P0 issue.

## 4. Users

| | |
|---|---|
| **Primary** | A technically literate adult — engineer, scientist, developer — with school or early-undergraduate mathematics, who wants a genuine working map of the field. Studies in 20–40 minute sessions. Motivated but has no external deadline, so the app must supply the pull. |
| **Secondary** | An undergraduate using it alongside a course, arriving with a specific concept to understand today. |
| **Explicit non-user** | The research mathematician. They should read the book. |

## 5. Learning model

Four ideas, in order of importance:

**5.1 Picture first, notation last.** Every lesson opens with something moving
that is *already* the idea. The formal definition appears only once the reader
can predict what it must say. A lesson that leads with notation has failed its
brief.

**5.2 The prerequisite graph is the curriculum.** Concepts form a DAG. A lesson
is unlocked when its parents are at mastery. The graph is authored per-lesson in
front-matter, not inferred, so it is reviewable in a pull request.

**5.3 Retrieval, not recognition.** Progress is measured by what you can
*reconstruct*, never by what looks familiar. This rules out the passive
multiple-choice quiz as the primary instrument (see §6).

**5.4 Forgetting is scheduled for.** Every mastered concept re-surfaces on a
spaced-repetition schedule. Mastery decays if unrehearsed, and the app says so
honestly rather than showing a permanent green tick.

## 6. Assessment — "shape suitable tests so a learner finds it fun"

Fun here means *agency and surprise*, not points and confetti. The design rule:
**the learner should be doing mathematics, not recalling sentences about
mathematics.** Six formats, roughly in order of how much we lean on them:

| Format | What the learner does | Why it works |
|---|---|---|
| **Predict-then-run** | Before an animation plays, commit to what will happen — drag the curve where you think it goes, place the fixed point, guess the dimension. The animation then runs and grades the prediction. | Commitment before feedback is the single strongest retention lever. Being wrong is *entertaining* when the reveal is a good animation. |
| **Construct it** | Build an object meeting a constraint by direct manipulation: "make this map surjective but not injective", "draw a graph with no Hamiltonian cycle". | Construction requires the actual concept. It cannot be bluffed by elimination. |
| **Counterexample hunt** | Given a plausible false claim, find the case that breaks it. Timed, with a hint economy. | This *is* the core mathematical skill, and it plays like a puzzle game. |
| **Spot the flaw** | A short proof with exactly one invalid step. Find it and say why. | Trains the reading skill the book actually demands. Naturally competitive. |
| **Connect the graph** | Given a concept, reassemble its neighbourhood in the prerequisite DAG from memory. | Tests structural understanding, which is what the Companion is uniquely good for. |
| **Boss level** | A Part IV branch (e.g. IV.6 Algebraic Topology) unlocks a multi-step challenge chaining every Part III prerequisite. | Gives the DAG a payoff and makes long-range progress legible. |

Anti-goals for assessment: streak guilt, artificial timers on conceptual work,
leaderboards, lives/hearts, anything that punishes a wrong answer harder than it
rewards a considered one.

## 7. The visual format

**Scrollytelling with a pinned canvas.** Scroll position drives an animation
timeline. The narrative text moves; the diagram stays and transforms.

**Parallax narrative.** Depth layers carry meaning rather than decoration:
background = the ambient space, midground = the object under discussion,
foreground = annotations and labels. Layers move at different rates so structure
reads at a glance.

**Hyperframe.** *This term is not standard, so we define it here:* a **hyperframe**
is a persistent canvas that survives across scroll sections, so one diagram is
progressively transformed rather than swapped out — plus the ability to open an
**inset frame within that frame** showing a prerequisite concept, without losing
scroll position or animation state. Clicking "vector space" mid-lesson on
eigenvalues opens the vector-space diagram *inside* the current figure, then
closes back into it. This is what stops a lesson graph from becoming a
tab-explosion.

Used **where necessary**, not everywhere: a hyperframe earns its place only when
a concept genuinely depends on another *while you are looking at it*.

Accessibility is not optional: every animation has a reduced-motion fallback
that conveys the same content in discrete steps, all figures carry text
alternatives, and no assessment depends on colour discrimination or fine motor
control.

## 8. Scope

**v1 (first vertical slice)**
- Part I as the on-ramp: I.1–I.4.
- One linked Part III chain proving the format on real concepts.
- Three assessment formats live: predict-then-run, construct it, counterexample hunt.
- Prerequisite graph, mastery state, spaced-repetition scheduling.
- Deployed on Google Cloud with sign-in and cross-device progress.

**v2** — the rest of Part III (99 concepts), boss levels, remaining assessment formats.
**v3** — Part IV branches, Part V theorems as narrative set-pieces.

**Out of scope** — Part VI (biography, poor fit for this format), user-generated
content, social features, mobile native apps, any offline copy of the book.

## 9. Success measures

| Measure | Target | Why this one |
|---|---|---|
| Lesson completion rate | > 70% of started lessons finished | A scrollytelling lesson that loses people mid-scroll has failed as narrative. |
| Day-7 retrieval | > 60% correct on first review after a week | The only measure that distinguishes learning from reading. |
| Return rate | > 3 sessions/week, unprompted | Nothing external compels use, so returning *is* the fun signal. |
| Assessment completion | > 80% of lessons end with the test attempted | If tests are skipped they are not fun, whatever else the numbers say. |
| Concepts at mastery | Rising week over week, decay accounted for | The headline number, and it must be allowed to fall. |

## 10. Risks

| Risk | Mitigation |
|---|---|
| **Content cost dominates.** Hand-authored animations do not scale to 288 articles. | Build a small library of reusable diagram primitives; a lesson should be mostly composition. Measure authoring hours per lesson from lesson one and treat it as a headline metric. |
| **Copyright.** Derived content drifts toward the source. | Content written from the topic title and independent sources only; PDF touched by one script; the book cited, never quoted. |
| **Scrollytelling is easy to do badly** — scroll-jacking, motion sickness, unskippable animation. | Scroll must never be hijacked; the reader can always jump sections; reduced-motion path is a first-class build target, not an afterthought. |
| **Assessment feels like homework.** | Ship the fun formats in the first slice, not after the "real" work. If predict-then-run is not enjoyable in v1, the premise is wrong and we should know early. |
| **The DAG becomes a cage.** Strict gating frustrates a reader who wants one specific concept today. | Prerequisites advise by default and gate only boss levels. Any lesson is reachable directly, with a "you'll want these first" banner. |

## 11. Open questions

1. **Audience** — private to one Google account, or public? Affects auth,
   Firestore rules and the copyright surface. *Proceeding private-first, as the
   reversible choice.*
2. **Where the concept chain starts** — v1 assumes vector space → linear map →
   eigenvalue → quadratic form. Confirm this is the right entry point.
3. **GCP project** — new project, or an existing one? Needs a billing account
   attached either way.
