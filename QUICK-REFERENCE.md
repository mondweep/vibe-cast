# Quick Reference: Tutorial System

**For Content Writers: One-Page Guide**

---

## The TDD Cycle (5-7 hours per module)

```
RED (30-60 min)          GREEN (2-3 hours)        REFACTOR (1-2 hours)     PUBLISH (1 hour)
└─ Write assessment  →   └─ Write content    →    └─ Polish & enhance  →   └─ Deploy & review
   (3-5 outcomes)          (1800-2200 words)        (examples, diagrams)      (get feedback)
   (5-7 questions)         (covers outcomes)        (interactive elements)     (iterate if needed)
```

---

## File Structure Per Module

```
module-XX-slug/
├── index.mdx              ← Content (markdown + jsx)
├── objectives.json        ← Learning outcomes (3-5)
├── assessment.json        ← Quiz questions (5-7)
├── exercises.json         ← Practice problems (3-5, optional)
└── assets/
    ├── diagrams/          ← SVG/PNG visuals
    ├── code/              ← Code examples
    └── images/            ← Photos, illustrations
```

---

## Essential Files to Reference

| File | Purpose | When to Use |
|------|---------|-----------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Step-by-step TDD guide | **Every time you create a module** |
| [DDD/ubiquitous-language.md](./DDD/ubiquitous-language.md) | Terminology guide | When unsure what to call something |
| [ADR/](./ADR/) | Architecture decisions | Understanding why we do things |
| [tests/content-validation.spec.json](./tests/content-validation.spec.json) | Quality checklist | Before publishing |

---

## Commands You'll Use

```bash
# Install dependencies (once)
npm install

# Build locally to test
npm run build

# Validate content before publishing
npm run validate-assessment      # Check assessment.json
npm run validate-content         # Check all content
npm run check-links              # Find broken links

# Commit and deploy
git add -A
git commit -m "feat: Add module-XX-[slug]"
git push origin tutorial-system
# Netlify auto-deploys (2-3 min)
```

---

## Learning Outcomes Format

**Template**:
```json
{
  "id": "lo1",
  "verb": "define|explain|apply|analyze|evaluate",
  "subject": "What concept?",
  "context": "Where/why does it matter?",
  "full_statement": "[Verb] [subject] [context]"
}
```

**Example**:
```json
{
  "id": "lo1",
  "verb": "define",
  "subject": "token",
  "context": "in NLP",
  "full_statement": "Define what a token is in NLP"
}
```

---

## Assessment Question Format

**Template**:
```json
{
  "id": "q1",
  "type": "free_text|multiple_choice|code",
  "question_text": "Your question here?",
  "learning_outcome_id": "lo1",
  "correct_answer": "...",
  "explanation": "Why is this correct?",
  "points": 3
}
```

**Example**:
```json
{
  "id": "q1",
  "type": "free_text",
  "question_text": "What is a token?",
  "learning_outcome_id": "lo1",
  "expected_key_phrases": ["discrete unit", "word", "text"],
  "explanation": "A token is the smallest unit the model processes.",
  "points": 3
}
```

---

## Content Template (Markdown)

```mdx
# Module Title

## Learning Outcomes
- [auto-generated from objectives.json]

## Introduction
Why should the reader care?

## Section 1: Core Concept
Explain concept #1
- Include example
- Relate to learning outcome

## Section 2: Application
How to apply this concept
- Show practical example
- Connect to next concept

## Summary
Recap the key points
- Preview next module
- Learning outcomes checklist

## Exercises
[auto-pulled from exercises.json]

## Assessment
[auto-pulled from assessment.json]
```

---

## Success Checklist

Before publishing a module:

**Content**:
- [ ] Learning outcomes defined (3-5)
- [ ] Assessment written (5-7 questions)
- [ ] Content covers all outcomes
- [ ] 1800-2200 words
- [ ] ≥2 examples, ≥1 diagram, ≥1 code snippet

**Quality**:
- [ ] Assessment questions are answerable from content
- [ ] External reader passes ≥70% of assessment
- [ ] No broken links
- [ ] Mobile responsive
- [ ] Code examples run without errors
- [ ] Diagrams display correctly

**Technical**:
- [ ] `npm run validate-content` passes
- [ ] `npm run check-links` passes
- [ ] Astro builds without errors
- [ ] All assets in correct folders

---

## Troubleshooting Quick Fixes

**"I'm not sure what to teach"**  
→ Read DEVELOPMENT.md Step 1 (RED phase)  
→ Write learning outcomes first  
→ Write assessment questions  
→ Then write content

**"My content doesn't cover the assessment"**  
→ Read the assessment questions carefully  
→ Add examples that directly answer them  
→ Make sure each outcome appears in content

**"External reviewer can't pass the assessment"**  
→ Content is too vague  
→ Add more explanation or examples  
→ Rewrite assessment questions if they're unfair

**"Netlify deploy is failing"**  
→ Run `npm run build` locally  
→ Fix any build errors  
→ Try again

---

## Terminology You'll Use

| Term | Means | Example |
|------|-------|---------|
| **Module** | One lesson (10-20 min, 1-2 concepts) | "Tokens & Tokenization" |
| **Learning Outcome** | Measurable skill after module | "Define what a token is" |
| **Assessment** | Quiz testing the outcomes | "5-7 questions on tokens" |
| **Exercise** | Practice problem (optional, self-check) | "Estimate token count of text" |
| **Concept** | Atomic idea | "Tokenization" |
| **Channel** | Platform where it's published | Netlify, LinkedIn, Disco, Blog |

---

## Timeline Per Module

- **Red**: 30-60 min (write assessment)
- **Green**: 2-3 hours (write content)
- **Refactor**: 1-2 hours (polish)
- **Publish**: 1 hour (deploy & review)
- **Total**: 5-7 hours (1 day intensive work)

---

## Next Module After You Finish

After publishing a module:
1. Get external feedback
2. Analyze assessment pass rates
3. Iterate if needed
4. Move to next module

---

**Questions?** See DEVELOPMENT.md for detailed step-by-step guide.

**Stuck?** Check DDD/ubiquitous-language.md for terminology or ADR/ for design decisions.
