# PRD: Prose Refinery — A Non-Fiction Writing Refinement Tool

## 1. Overview

**Prose Refinery** is a focused tool that helps writers improve drafts of non-fiction text. It does not generate content from scratch — it takes what a writer has already written and makes it clearer, tighter, and more effective for its intended audience.

This project is also designed as a **practical prompt engineering learning exercise**. Each feature deliberately uses a different prompting pattern, so the builder gains hands-on experience with techniques that transfer to any LLM-powered application.

---

## 2. Problem Statement

Non-fiction writers (bloggers, technical authors, essayists, researchers) face a consistent set of refinement challenges:

- **Clarity**: Ideas are sound but sentences are tangled or ambiguous.
- **Conciseness**: Drafts contain filler, redundancy, and weak constructions.
- **Structure**: Paragraphs or sections don't flow logically.
- **Tone mismatch**: The writing doesn't match the intended audience (too academic, too casual, too dry).
- **Self-editing blindness**: Writers can't see their own patterns and habits.

Existing tools either do surface-level grammar checks (Grammarly) or generate entirely new text (ChatGPT). There is a gap for a tool that **respects the writer's voice and intent** while systematically improving the craft of the writing.

---

## 3. Target Users

| User type | Description |
|-----------|-------------|
| **Primary** | Non-fiction writers working on blog posts, essays, articles, documentation |
| **Secondary** | Technical writers refining documentation, README files, proposals |
| **Tertiary** | Students working on academic papers or thesis chapters |

---

## 4. Core Principles

1. **Refine, don't replace.** The writer's ideas and voice are the source of truth. The tool improves expression, not meaning.
2. **Show the reasoning.** Every suggestion should explain *why* the change improves the text, so the writer learns — not just accepts.
3. **One concern at a time.** Don't overwhelm. Let the writer focus on clarity, then structure, then tone — not everything at once.
4. **Transparent prompting.** Since this is a learning project, the prompts powering each feature should be visible and editable by the user.

---

## 5. Features & Prompt Engineering Patterns

Each feature maps to a specific prompting technique. This is the pedagogical backbone of the project.

### 5.1 Clarity Pass

**What it does:** Identifies sentences that are ambiguous, convoluted, or hard to parse. Suggests rewritten alternatives that preserve meaning.

**Prompt engineering pattern: Few-Shot Prompting**

Why this pattern: The model needs concrete examples of what "unclear" vs "clear" looks like in non-fiction. Providing 3-5 before/after pairs in the prompt calibrates its judgment far better than abstract instructions.

- Input: Raw draft text
- Output: List of flagged sentences, each with the original, a suggested revision, and a one-line explanation
- The user should be able to add their own few-shot examples to tune what "clarity" means for their style

### 5.2 Conciseness Pass

**What it does:** Finds wordiness, filler phrases, redundancies, and passive constructions that weaken the prose. Suggests tighter alternatives.

**Prompt engineering pattern: System Prompt with Rules**

Why this pattern: Conciseness has well-defined, enumerable rules (eliminate "in order to," replace "due to the fact that," avoid nominalizations). A strong system prompt with explicit rules is the right tool for codified knowledge.

- Input: Raw draft text
- Output: Inline suggestions showing what to cut or compress, with word count reduction stats
- The rule set should be visible and editable so the user can add domain-specific rules

### 5.3 Structure Analysis

**What it does:** Evaluates the logical flow of a piece. Identifies where the argument jumps, where transitions are missing, and where sections could be reordered.

**Prompt engineering pattern: Chain-of-Thought (CoT)**

Why this pattern: Evaluating structure requires reasoning across the entire text — understanding what each paragraph argues, how it connects to the next, and where gaps exist. CoT forces the model to reason step-by-step rather than giving a surface-level answer.

- Input: Full draft (or a section)
- Output: A structural outline of what the text currently argues, annotated with observations about flow, gaps, and suggested reordering
- The CoT reasoning should be shown to the user, not hidden — this is where the learning happens

### 5.4 Tone Adjustment

**What it does:** Rewrites text to match a specified audience and register (e.g., "explain this to a general audience" or "make this more authoritative for a peer-reviewed context").

**Prompt engineering pattern: Role Prompting + Parameterization**

Why this pattern: Tone is subjective and audience-dependent. By assigning the model a specific role ("You are an editor at The Atlantic" vs "You are a technical documentation lead at Stripe") and parameterizing the audience, the user learns how role framing shapes output.

- Input: Text + target audience selector + tone selector
- Output: Rewritten text adjusted for the selected audience/tone
- Predefined audience/tone presets, but the user can define custom ones

### 5.5 Iterative Refinement Loop

**What it does:** Lets the writer have a back-and-forth conversation about a specific passage. The writer can push back, ask for alternatives, or add constraints ("keep the metaphor but make it shorter").

**Prompt engineering pattern: Multi-Turn Context Management**

Why this pattern: This teaches the critical skill of managing conversation history — what to keep in context, what to summarize, and how prior turns affect subsequent outputs. The user learns that prompt engineering isn't just about single prompts but about managing state across interactions.

- Input: A selected passage + ongoing conversation
- Output: Revised versions that incorporate all prior feedback
- The context window usage should be visible (e.g., token count) so the user sees the tradeoffs

### 5.6 Prompt Playground

**What it does:** Exposes the raw prompts behind each feature. The user can edit them, test variations, and see how changes affect output quality.

**Prompt engineering pattern: Meta-learning**

Why this pattern: This is the capstone learning feature. By letting the user modify the actual prompts, they internalize what makes prompts effective. They can A/B test their own prompt variations against the defaults.

- Shows the system prompt, user prompt template, and any few-shot examples for each feature
- Side-by-side comparison: run the same input through two different prompts
- Save custom prompt variants

---

## 6. Non-Fiction Genre Modes

Different non-fiction forms have different refinement needs. The tool should support selectable genre modes that adjust the behavior of all passes:

| Mode | Priorities |
|------|-----------|
| **Essay / Opinion** | Argument strength, rhetorical flow, voice preservation |
| **Technical / Documentation** | Precision, scannability, consistent terminology |
| **Journalism / Reporting** | Objectivity, attribution, inverted pyramid structure |
| **Academic** | Citation awareness, hedging language, formal register |
| **Business / Memo** | Brevity, action-orientation, executive summary clarity |

Each mode adjusts the system prompts and evaluation criteria across all features. This teaches the user how **context framing** changes model behavior without changing the core logic.

---

## 7. User Interface

### 7.1 Layout

```
+--------------------------------------------------+
|  [Genre Mode ▼]    [Feature Pass ▼]    [⚙ Prompts] |
+--------------------------------------------------+
|                    |                               |
|   INPUT PANE       |   OUTPUT PANE                 |
|                    |                               |
|   Paste or type    |   Refined text with           |
|   your draft       |   inline annotations          |
|   here             |                               |
|                    |   [Explanation Panel]          |
|                    |   Why each change was made     |
|                    |                               |
+--------------------------------------------------+
|   [Refine]    [Accept All]    [Accept Selected]    |
+--------------------------------------------------+
```

### 7.2 Key Interactions

- **Diff view**: Show changes as insertions/deletions (like a code review) so the writer sees exactly what changed
- **Accept/reject per suggestion**: The writer controls what gets applied
- **Explanation toggle**: Show or hide the reasoning behind each suggestion
- **Word count delta**: Always visible — writers care about length
- **Prompt inspector**: A drawer/panel that shows the exact prompt being sent to the API for the current operation

---

## 8. Technical Architecture

### 8.1 Recommended Stack

This is a learning project, so the stack should be simple and transparent:

| Layer | Recommendation | Rationale |
|-------|---------------|-----------|
| **Frontend** | Next.js (App Router) or plain React + Vite | Familiar, well-documented, large community for help |
| **API layer** | Next.js API routes or Express | Keeps prompts server-side but inspectable |
| **LLM provider** | Anthropic Claude API (via `@anthropic-ai/sdk`) | Strong at following nuanced editorial instructions |
| **State** | Local storage + optional file export | No database needed for v1 — keep it simple |
| **Styling** | Tailwind CSS | Fast to prototype, easy to maintain |

### 8.2 API Design

Each refinement pass is a single API endpoint:

```
POST /api/refine
{
  "text": "...",
  "pass": "clarity" | "conciseness" | "structure" | "tone" | "iterate",
  "genre": "essay" | "technical" | "journalism" | "academic" | "business",
  "options": {
    "audience": "...",        // for tone pass
    "tone": "...",            // for tone pass
    "conversation": [...]     // for iterative pass
  },
  "customPrompt": "..."       // optional override from playground
}
```

Response:

```
{
  "suggestions": [
    {
      "original": "...",
      "revised": "...",
      "explanation": "...",
      "position": { "start": 0, "end": 42 }
    }
  ],
  "meta": {
    "wordCountOriginal": 450,
    "wordCountRevised": 380,
    "tokensUsed": 1200,
    "promptUsed": "..."        // transparency
  }
}
```

---

## 9. Prompt Engineering Learning Roadmap

This section makes the pedagogical arc explicit. Build the features in this order:

| Phase | Feature | Pattern Learned | Concept |
|-------|---------|----------------|---------|
| 1 | Conciseness Pass | System prompts with rules | How explicit instructions shape behavior |
| 2 | Clarity Pass | Few-shot examples | How examples calibrate judgment better than descriptions |
| 3 | Tone Adjustment | Role prompting + parameters | How framing and variables create flexible prompts |
| 4 | Structure Analysis | Chain-of-thought | How step-by-step reasoning improves complex analysis |
| 5 | Iterative Refinement | Multi-turn context | How conversation history and context management work |
| 6 | Prompt Playground | Meta-learning | How to evaluate, compare, and iterate on prompts |

Each phase builds on the previous one. By the end, the builder has hands-on experience with the most important prompting techniques.

---

## 10. Success Criteria

For the **product**:
- A writer can paste a 500-2000 word draft and get actionable refinement suggestions in under 10 seconds
- At least 70% of suggestions should feel useful (self-reported by the writer)
- The writer should be able to complete a full refinement cycle (all passes) in under 15 minutes

For the **learning objective**:
- The builder can explain the difference between few-shot, CoT, and role prompting with concrete examples from their own project
- The builder can modify a prompt and predict how the change will affect output
- The builder has a portfolio piece that demonstrates applied prompt engineering

---

## 11. What This Is Not

- **Not a grammar checker.** Use Grammarly or LanguageTool for that. This tool operates at a higher level.
- **Not a content generator.** It will never write new paragraphs from scratch. It refines what exists.
- **Not a plagiarism detector.** Out of scope entirely.
- **Not a publishing platform.** Export your refined text and take it wherever you publish.

---

## 12. Future Considerations (Out of Scope for v1)

- Document-level analysis across multiple sections/chapters
- Version history and change tracking across sessions
- Collaborative editing (multiple users refining the same doc)
- Fine-tuning or custom model training on the user's past writing
- Browser extension for in-place refinement on any text field
