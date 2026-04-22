# ADR-004: Assessment Strategy — Test-Driven Development for Content

**Status**: Accepted  
**Date**: 2026-04-22  
**Deciders**: Mondweep, Claude  

## Context

Traditional educational content creation:
```
Writer thinks about topic → Writes lesson → Hopes students learn → Maybe some feedback
```

Problem: How do you know if the lesson actually teaches what you want?
- Vague learning objectives ("students will understand tokens")
- No way to measure success
- Content might be clear but not comprehensive
- Feedback comes too late (after deployment)

TDD approach from software engineering: **Write tests before code**.

**Question**: Can we apply TDD to educational content?

## Decision

**Write assessment tests BEFORE writing content (Test-Driven Development for education).**

### The TDD Cycle for Content

```
1. RED: Write assessment.json
   ↓
   "What should students know after this module?"
   Define 3-5 measurable outcomes + 5-7 test questions

2. GREEN: Write index.mdx (minimum content to pass assessment)
   ↓
   "Does the content actually teach these outcomes?"
   Write content, test against assessment manually

3. REFACTOR: Polish, add examples, improve clarity
   ↓
   "Make the teaching excellent, not just adequate"
   Add diagrams, stories, interactive components

4. PUBLISH: Deploy to Netlify, collect real feedback
   ↓
   "What did actual students learn?"
   Iterate based on assessment pass rates, user feedback
```

### Example: Module 1 (Tokens)

**RED Phase: Write assessment.json**
```json
{
  "module_id": "module-01-tokens",
  "learning_outcomes": [
    "Define what a token is in NLP",
    "Calculate approximate token count from text",
    "Explain why tokenization matters for model input"
  ],
  "assessment": [
    {
      "id": "q1",
      "question": "In the context of NLP, what is a token?",
      "type": "free_text",
      "expected_key_phrases": ["discrete unit", "subword OR word", "text"],
      "points": 3
    },
    {
      "id": "q2",
      "question": "A sentence has 10 words. Approximately how many tokens?",
      "type": "multiple_choice",
      "options": {
        "a": "5 tokens",
        "b": "10-15 tokens",
        "c": "50 tokens",
        "d": "200 tokens"
      },
      "correct": "b",
      "explanation": "Tokens ≈ words, but contractions/punctuation affect count",
      "points": 2
    }
  ]
}
```

**GREEN Phase: Write index.mdx**
```mdx
# Tokens & Tokenization

## What is a Token?

A **token** is a discrete unit of text—usually a word, subword, or punctuation mark. 
When you feed text to a language model, it doesn't see your sentence as one thing. 
Instead, it breaks it into tokens first.

## Why Does This Matter?

Models have a maximum context window (e.g., 4,096 tokens). 
If your input is longer, it gets truncated. 
Understanding tokenization helps you predict how much text you can fit.

## Example

"hello world" → ["hello", "world"] (2 tokens)
"don't" → ["don", "'t"] OR ["don't"] depending on tokenizer (1-2 tokens)

## Calculating Token Count

As a rough estimate: **1 token ≈ 0.75 words**

So 100 words ≈ 133 tokens.

(This varies by language and tokenizer, but it's a useful heuristic.)
```

At this point, content exists and covers the assessment points. But it's bare. Move to REFACTOR.

**REFACTOR Phase: Polish & enhance**
- Add interactive visualization: type text, see token count live
- Add code example: show Python tokenization (transformers library)
- Add diagram: illustrate tokenization process
- Add common mistakes: "Why does my text get more tokens than expected?"

**PUBLISH Phase: Deploy & collect feedback**
- Deploy to Netlify
- Track assessment pass rates
- If 70%+ students pass: content is working
- If <70% students pass: content needs clarification (iterate)

## Rationale

1. **Clarity of intent**: Must define learning objectives upfront, not retroactively
2. **Accountability**: Can measure "did this module teach X?" via assessment
3. **Focus**: Content stays focused on objectives, avoids tangents
4. **Iteration**: Can A/B test different approaches (does narrative or example teach better?)
5. **Scalability**: If someone else writes a module, they know exactly what to teach
6. **Quality gate**: Assessment is a quality bar (don't deploy until passing rate is high)

## How It Works in Practice

### Pre-write Checklist
- [ ] Learning outcomes defined (3-5, measurable verbs)
- [ ] Assessment written (5-7 questions)
- [ ] Assessment answers validated (can answer them yourself)
- [ ] Prerequisite modules identified
- [ ] Estimated reading time calculated

### During Writing
- [ ] Content addresses all learning outcomes
- [ ] Assessment questions are answerable from content
- [ ] Examples are concrete and runnable
- [ ] Diagrams match explanations

### Pre-publish Checklist
- [ ] Manual test: Can you pass your own assessment?
- [ ] External reader: Can someone unfamiliar pass the assessment?
- [ ] Clarity: Is anything unclear or confusing?
- [ ] Completeness: Are all objectives addressed?

## Assessment File Format

```json
{
  "module_id": "module-XX-slug",
  "title": "Module Title",
  "learning_outcomes": [
    {
      "id": "lo1",
      "verb": "define|explain|apply|analyze",
      "subject": "What concept?",
      "context": "Why does it matter?"
    }
  ],
  "assessment": [
    {
      "id": "q1",
      "learning_outcome_id": "lo1",
      "question": "Question text",
      "type": "free_text|multiple_choice|code|matching",
      "correct_answer": "...",
      "explanation": "Why is this correct?",
      "points": 5
    }
  ],
  "passing_score": 70,
  "estimated_duration_minutes": 15
}
```

## Consequences

### Positive ✅
- **Clear success criteria**: Know exactly what students should learn
- **Focused writing**: Content doesn't meander or include unnecessary topics
- **Measurable learning**: Can track assessment pass rates
- **Quality guarantee**: Don't publish until content meets standard
- **Collaboration**: New writers know exactly what to write

### Negative / Constraints ⚠️
- **Upfront effort**: Writing assessment takes 20-30% of module creation time
- **Risk of teaching to the test**: Content might over-optimize for assessment questions
- **Limited flexibility**: Hard to add emergent topics that weren't in assessment
- **Iteration cost**: If assessment is wrong, content is wrong, need to rewrite

### Mitigation Strategies
- REFACTOR phase allows adding depth beyond assessment baseline
- Assessment should test understanding, not memorization (good test design)
- External review of assessment before writing content

## Examples of Good vs. Bad Assessments

### ❌ Bad: Too vague
```json
{
  "question": "Do you understand tokens?",
  "type": "yes_no"
}
```
Reason: Not measurable, too binary

### ❌ Bad: Too narrow
```json
{
  "question": "What is the exact token count of 'hello world'?",
  "type": "number"
}
```
Reason: Tests memorization, not understanding. Token count depends on tokenizer.

### ✅ Good: Measurable and meaningful
```json
{
  "question": "A sentence has 50 words. Approximately how many tokens?",
  "type": "multiple_choice",
  "options": {
    "a": "25-30",
    "b": "50-75",
    "c": "200+"
  },
  "explanation": "Using 1 token ≈ 0.75 words: 50 * 1.33 ≈ 65-70 tokens"
}
```
Reason: Tests application of concept, realistic range, explanation provided

## Related Decisions
- ADR-001: MDX format (assessment.json pairs with index.mdx)
- ADR-003: Modular lessons (each module has one assessment)
- ADR-002: Netlify (assessment data tracks learning via analytics)

## References
- [Bloom's Taxonomy of Learning Objectives](https://en.wikipedia.org/wiki/Bloom%27s_taxonomy)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)
- [Constructivism in Education](https://en.wikipedia.org/wiki/Constructivism_(philosophy_of_education))
- [Kirkpatrick's Four Levels of Learning Evaluation](https://en.wikipedia.org/wiki/Kirkpatrick%27s_Four_Levels_of_Training_Evaluation)
