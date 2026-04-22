# Development Guide: TDD Workflow for Content Creation

**Purpose**: Step-by-step guide for creating a module using Test-Driven Development  
**Audience**: Content writers, subject matter experts  
**Based on**: ADR-004 (Assessment Strategy)

---

## The TDD Cycle for Content (Quick Reference)

```
┌─────────────────────────────────────────────────┐
│ STEP 1: RED — Write Assessment (30-60 min)      │
│ Define learning outcomes & write test questions  │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ STEP 2: GREEN — Write Content (2-3 hours)      │
│ Minimum content to pass assessment questions     │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ STEP 3: REFACTOR — Polish (1-2 hours)          │
│ Add examples, diagrams, clarity, interactivity  │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│ STEP 4: PUBLISH — Deploy & Review (1 hour)     │
│ Get feedback, iterate if needed                  │
└─────────────────────────────────────────────────┘
```

**Total time per module**: 5-7 hours (1 day)

---

## Pre-Writing Checklist

Before starting, gather:

- [ ] **Your expertise**: You understand the concept deeply
- [ ] **Audience**: Who is learning this? (beginner/intermediate/advanced)
- [ ] **Related concepts**: What other modules does this connect to?
- [ ] **Prerequisites**: What must they know first?
- [ ] **Estimated duration**: How long should the module take?
- [ ] **Stakeholder input**: Any feedback or direction from team?

---

## STEP 1: RED — Write Assessment (30-60 min)

### 1.1: Define Learning Outcomes

A learning outcome is a **measurable skill** students should have after the module.

**Formula**:
```
[Bloom's Verb] [Subject] [Context]
```

**Bloom's Verbs** (in order of complexity):
1. Define — recall definition
2. Explain — describe how/why
3. Apply — use in a new situation
4. Analyze — break down and examine
5. Evaluate — make judgments

**Writing a Good Outcome**:

✅ **Good**: "Student can explain why tokens are discrete units in NLP"
- Verb: explain (Bloom level 2)
- Subject: tokens
- Context: NLP
- Testable: Yes (can ask "Explain why...")

❌ **Bad**: "Student will understand tokenization"
- Too vague (what does "understand" mean?)
- Not testable
- No context

### 1.2: Write 3-5 Learning Outcomes

**Example for Module 1: Tokens & Tokenization**

```json
{
  "learning_outcomes": [
    {
      "id": "lo1",
      "verb": "define",
      "subject": "token",
      "context": "in NLP",
      "full_statement": "Define what a token is in NLP"
    },
    {
      "id": "lo2",
      "verb": "apply",
      "subject": "token counting",
      "context": "text approximation",
      "full_statement": "Apply the 1 token ≈ 0.75 words heuristic to estimate token count"
    },
    {
      "id": "lo3",
      "verb": "explain",
      "subject": "tokenization importance",
      "context": "model input",
      "full_statement": "Explain why tokenization matters for model context windows"
    }
  ]
}
```

### 1.3: Write Assessment Questions

**File**: `assessment.json`

Create 5-7 questions that validate each outcome.

**Question Template**:
```json
{
  "id": "q1",
  "type": "free_text|multiple_choice|code|matching",
  "question_text": "...",
  "learning_outcome_id": "lo1",
  "correct_answer": "...",
  "explanation": "Why is this correct?",
  "points": 3
}
```

**Example Questions for Module 1**:

```json
{
  "assessment": [
    {
      "id": "q1",
      "type": "free_text",
      "question_text": "In your own words, what is a token?",
      "learning_outcome_id": "lo1",
      "expected_key_phrases": ["discrete unit", "word OR subword", "text"],
      "explanation": "A token is the smallest unit of text the model processes.",
      "points": 3
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "question_text": "A sentence has 40 words. Approximately how many tokens?",
      "learning_outcome_id": "lo2",
      "options": {
        "a": "20 tokens",
        "b": "40-50 tokens",
        "c": "100+ tokens",
        "d": "Can't be determined"
      },
      "correct": "b",
      "explanation": "Using 1 token ≈ 0.75 words: 40 * 1.33 ≈ 53 tokens",
      "points": 2
    },
    {
      "id": "q3",
      "type": "free_text",
      "question_text": "Why does tokenization matter for your model?",
      "learning_outcome_id": "lo3",
      "expected_key_phrases": ["context window", "limit", "truncation"],
      "explanation": "Models have max token limits. Tokenization helps you count to stay under the limit.",
      "points": 2
    }
  ],
  "passing_score": 70,
  "total_points": 7
}
```

### 1.4: Validate Your Assessment

Checklist before moving to GREEN:

- [ ] Each learning outcome has ≥1 question
- [ ] Each question maps to exactly one outcome
- [ ] You can answer all questions correctly from your expertise
- [ ] Questions test understanding, not just memorization
- [ ] Difficulty distribution is reasonable (mix of easy/medium/hard)
- [ ] Passing score (70%) is achievable for a student who studied the module
- [ ] Answers are unambiguous (clear what's correct)

---

## STEP 2: GREEN — Write Content (2-3 hours)

### 2.1: Outline Content

**Goal**: Map learning outcomes to content sections.

```
Module Outline
├─ Introduction (0.5 pages)
│  └─ Hook: Why should we care about tokens?
│
├─ Section 1: What is a Token? (1 page)
│  └─ Outcome: lo1 (Define token)
│  └─ Cover: discrete unit, word vs subword
│
├─ Section 2: Tokenization Process (1 page)
│  └─ Outcome: lo2 (Apply token counting heuristic)
│  └─ Cover: how tokenizers work, common patterns
│
├─ Section 3: Why It Matters (1 page)
│  └─ Outcome: lo3 (Explain importance)
│  └─ Cover: context window limits, truncation
│
└─ Summary & Next Steps (0.5 pages)
   └─ Recap outcomes, preview next module
```

### 2.2: Write First Draft

**File**: `index.mdx`

Write the minimum content needed to pass the assessment. No fluff, no extras.

```mdx
# Tokens & Tokenization

## What is a Token?

A **token** is a discrete unit of text that a language model processes.
Models don't see "hello world" as a single thing. Instead, they break it into tokens.

Example:
- "hello" → 1 token
- "world" → 1 token  
- "don't" → 1-2 tokens (depends on tokenizer)

## Tokenization Process

A tokenizer converts text into tokens. Different tokenizers work differently:

- **Word tokenizer**: Splits by spaces → ["hello", "world"]
- **Subword tokenizer**: Splits into smaller units → ["hel", "lo", "world"]
- **Character tokenizer**: Every character is a token

## Why Tokenization Matters

Models have a **context window** — a maximum number of tokens they can process at once.

Example: If a model's context is 4,096 tokens and you give it a 10,000-token text, 
the extra gets cut off.

To avoid this, you need to know: How many tokens is my text?

**Quick estimate**: 1 token ≈ 0.75 words
- 100 words ≈ 133 tokens
- 1,000 words ≈ 1,330 tokens

## Summary

- Tokens are the smallest units models process
- Tokenizers convert text to tokens
- Know your model's context window to avoid truncation
```

### 2.3: Self-Test Against Assessment

Now take your own assessment:

```bash
# Read your content
# Answer your own questions from assessment.json
# Did you answer correctly?
```

- ✅ Yes → Move to REFACTOR
- ❌ No → Rewrite the section that's unclear

---

## STEP 3: REFACTOR — Polish & Enhance (1-2 hours)

Your content now passes the assessment. Now make it excellent.

### 3.1: Add Examples

For each concept, add a concrete example.

```mdx
# Examples

## Example 1: Simple Text
Text: "Hello, world!"
Tokens: ["Hello", ",", "world", "!"] → 4 tokens

## Example 2: With Contraction
Text: "Don't worry"
Tokens: ["Don", "'t", "worry"] OR ["Don't", "worry"] → 2-3 tokens
(Depends on the tokenizer)

## Example 3: Estimating Token Count
- Text: "The quick brown fox jumps over the lazy dog"
- Word count: 9 words
- Estimate: 9 * 1.33 ≈ 12 tokens
- Actual: 11 tokens ✓
```

### 3.2: Add Diagrams

Create or reference visual aids.

```mdx
# Visual: Tokenization Flow

[Diagram showing: Text → Tokenizer → Token List]

(Will be in assets/diagrams/tokenization-flow.svg)
```

### 3.3: Add Code Examples (if applicable)

```mdx
# Code Example: Tokenizing with Python

\`\`\`python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("gpt2")
text = "Hello, world!"
tokens = tokenizer.encode(text)

print(f"Text: {text}")
print(f"Tokens: {tokens}")
print(f"Token count: {len(tokens)}")
\`\`\`

Output:
```
Text: Hello, world!
Tokens: [15496, 11, 1917, 0]
Token count: 4
```
```

### 3.4: Add Interactive Components (optional)

```mdx
# Interactive: Estimate Token Count

<TokenCounter />
(React component that lets users paste text and see live token count)
```

### 3.5: Review Checklist

- [ ] All learning outcomes addressed with examples
- [ ] Assessment questions are answerable from content
- [ ] Diagrams match explanations
- [ ] Code examples are correct and runnable
- [ ] Tone is conversational (not too academic, not too casual)
- [ ] Word count is 1,800-2,200 words
- [ ] No broken links or typos
- [ ] Formatting is consistent (headers, bold, code blocks)

---

## STEP 4: PUBLISH — Deploy & Review (1 hour)

### 4.1: Pre-Publish Checklist

- [ ] assessment.json validates (can run `npm run validate-assessment`)
- [ ] index.mdx builds without errors (`npm run build`)
- [ ] All assets load (diagrams, images, code)
- [ ] Links work (internal and external)
- [ ] Mobile responsive (test on phone/tablet)

### 4.2: Deploy to Netlify

```bash
git add -A
git commit -m "feat: Add module-01-tokens

- Define learning outcomes (3 outcomes)
- Write assessment (7 questions, 70% pass)
- Create content covering all outcomes
- Add diagrams and code examples

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin tutorial-system
# Netlify auto-deploys on push
# Wait 2-3 minutes for build...
# Check: https://ai-safety-tutorial.netlify.app
```

### 4.3: Get Feedback

- [ ] Send preview link to 2-3 people
- [ ] Ask them to take the assessment
- [ ] Track pass rate (target: ≥70%)
- [ ] Collect feedback on clarity

### 4.4: Iterate

If feedback suggests changes:
1. Update content in index.mdx
2. Update assessment.json if questions were unclear
3. Commit and push
4. Netlify auto-deploys
5. Re-test with external readers

---

## Common Questions

### Q: Should I write assessment BEFORE content?
**A**: Yes. It forces you to be clear about what you're teaching. If you can't write clear assessment questions, your learning outcomes aren't clear enough.

### Q: What if my content is too long for the time estimate?
**A**: You probably included too much. Break it into 2 modules. Remember: 1-2 concepts per module.

### Q: Can I include tangential information?
**A**: Only if it directly supports a learning outcome. If it doesn't help students answer assessment questions, it's distraction.

### Q: What's the difference between Assessment and Exercises?
- **Assessment**: Required, tests learning outcomes, graded (pass/fail)
- **Exercises**: Optional, reinforces concepts, self-checked, hints provided

### Q: How do I handle prerequisites?
**A**: List in objectives.json:
```json
{
  "prerequisites": ["module-01-tokens"],
  "prerequisite_warning": "This module requires understanding of tokens. Take Module 1 first."
}
```

### Q: What if students struggle with the assessment?
**A**: Check:
1. Is the content clear? (rewrite confusing parts)
2. Are questions answerable from content? (rewrite vague questions)
3. Is the passing score realistic? (70% is industry standard)
4. Do you need more examples? (add exercises)

---

## File Checklist

When you're done, you should have:

```
module-XX-slug/
├── index.mdx                 ✓ Content (1800-2200 words)
├── objectives.json           ✓ Learning outcomes (3-5)
├── assessment.json           ✓ Assessment (5-7 questions)
├── exercises.json            ✓ Exercises (3-5 practice problems)
├── README.md                 ✓ Module overview & TDD flow
└── assets/
    ├── diagrams/
    │   └── *.svg             ✓ Visual representations
    ├── code/
    │   └── *.py              ✓ Code examples (if applicable)
    └── images/
        └── *.png             ✓ Photos/illustrations (if applicable)
```

---

## Time Estimate Summary

| Phase | Activity | Time |
|-------|----------|------|
| RED | Write assessment | 30-60 min |
| GREEN | Write minimum content | 2-3 hours |
| REFACTOR | Polish & enhance | 1-2 hours |
| PUBLISH | Deploy & review | 1 hour |
| **TOTAL** | **One module** | **5-7 hours** |

---

## Example Timeline

**Day 1**:
- 30 min: Define learning outcomes
- 30 min: Write assessment.json
- 2 hours: Write index.mdx (first draft)
- 30 min: Self-test against assessment
- 1.5 hours: Add examples, diagrams, polish
- 1 hour: Commit, deploy, send for review

**Day 2** (if feedback):
- 1-2 hours: Iterate based on feedback
- 30 min: Re-deploy
- Done

---

## Next Steps After Publishing

1. **Collect analytics**: How many people take the module? Pass rate?
2. **Monitor feedback**: Common questions or confusion points?
3. **Plan next module**: What prerequisites does the next concept need?
4. **Iterate**: If pass rate <70%, improve content

---

**Last Updated**: 2026-04-22  
**Questions?** See ADR-004 for detailed rationale
