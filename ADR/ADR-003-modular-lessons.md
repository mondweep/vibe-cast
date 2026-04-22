# ADR-003: Course Granularity — Modular Lessons

**Status**: Accepted  
**Date**: 2026-04-22  
**Deciders**: Mondweep, Claude  

## Context

The tutorial must be distributed across multiple platforms:
- **Netlify**: Best for deep, interactive content (20+ min modules)
- **LinkedIn Learning**: Strict 10-15 minute lessons
- **Disco**: Card-based, topic-focused (short, standalone)
- **Blog**: 1500-3000 word posts

Each platform has different content constraints and user expectations. A 50-minute single module doesn't work for LinkedIn. A 5-minute micro-lesson doesn't provide enough depth for Netlify.

**Question**: How granular should each module be? (One big course? Many small lessons?)

## Decision

**Each module is a self-contained lesson of 10-20 minutes (~2000 words), covering 1-2 tightly related concepts.**

### Definition of a Module
```
Module = {
  title: "Tokens & Tokenization",
  duration: "15 minutes",
  learning_objectives: 3-5,
  concepts: 1-2,
  prerequisites: [Module | null],
  assessment: "5-7 questions",
  length: "1800-2200 words",
  interactivity: "2-3 interactive components"
}
```

## Rationale

1. **LinkedIn Learning constraint**: 10-15 min modules are native to their platform
   - Longer modules require breaking into chapters
   - Shorter modules feel incomplete
   - 10-20 min is the Goldilocks zone

2. **Blog cross-posting**: 2000-word blog posts are standard
   - Easier to share on Medium, Dev.to, Substack
   - SEO-friendly length

3. **Parallel content creation**: Allows team to work on different modules simultaneously
   - Writer A: Module 1
   - Writer B: Module 2
   - No dependency blocking

4. **Disco cards**: Self-contained topics fit naturally into course cards
   - One module = one card
   - No partial modules or "Part 1 of 3" confusion

5. **Prerequisite clarity**: Small modules make dependencies explicit
   - "Module 4 requires Module 3" is clear
   - User knows whether to jump in or start earlier

6. **Assessment alignment**: One module = one measurable outcome set
   - TDD: 1 assessment = 1 module
   - Easier to grade: "Did student master Tokens?" vs "Did student master 50% of the course?"

## Alternatives Considered

### Option A: One Large Course (50-100 min)
- ✅ Comprehensive narrative arc
- ❌ Too long for LinkedIn Learning
- ❌ Harder to repurpose across platforms
- ❌ Single failure breaks entire course experience
- Decision: Rejected—doesn't align with multi-platform strategy

### Option B: Many Micro-lessons (5-10 min)
- ✅ Easy to fit LinkedIn/Disco constraints
- ❌ Too shallow for real learning (can't explain SVD in 5 min)
- ❌ Too many prerequisites ("You must complete 20 lessons first")
- ❌ Platform lock-in (optimized for short-form, not learning)
- Decision: Rejected—sacrifices educational depth

### Option C: Mixed granularity (5-30 min varies)
- ✅ Flexible
- ❌ Inconsistent experience
- ❌ Harder to plan timeline
- ❌ Confusing user expectations ("Why is this one 30 min?")
- Decision: Rejected—creates friction

### Option D: Modular 10-20 min (Chosen) ✅
- ✅ Works across all platforms
- ✅ Deep enough to teach meaningfully
- ✅ Parallel creation possible
- ✅ Clear prerequisites
- ✅ Natural learning units

## Course Structure Example

```
AI Safety & Jailbreaks Tutorial
│
├─ Foundation Layer (6 modules, 90 min total)
│  ├─ Module 1: Tokens & Tokenization [15 min] *
│  ├─ Module 2: Transformer Architecture [20 min] (prereq: M1)
│  ├─ Module 3: Attention Mechanism [15 min] (prereq: M2)
│  ├─ Module 4: Embeddings & Representations [15 min] (prereq: M2)
│  ├─ Module 5: Linear Algebra — SVD [20 min] *
│  └─ Module 6: Matrix Decomposition Deep Dive [15 min] (prereq: M5)
│
├─ Core Safety Layer (4 modules, 70 min)
│  ├─ Module 7: Abliteration via SVD [20 min] (prereq: M5)
│  ├─ Module 8: Mixture of Experts [15 min] (prereq: M2)
│  ├─ Module 9: Quantization & Model Compression [15 min] (prereq: M4)
│  └─ Module 10: Context Windows & KV Cache [15 min] (prereq: M1)
│
└─ Research Layer (3 modules, 60 min)
   ├─ Module 11: StrongREJECT Benchmark [20 min] (prereq: M1, M7)
   ├─ Module 12: Jailbreak Evaluation Metrics [20 min] (prereq: M11)
   └─ Module 13: Abliterated vs Aligned Models [15 min] (prereq: M7, M8)

* Priority for Phase 1
```

## Consequences

### Positive ✅
- **Platform alignment**: Works natively with LinkedIn (10-15 min), Disco (topic cards), Blog (2000 words)
- **Scalability**: Can add new modules without affecting existing ones
- **Parallelizable**: Team members don't block each other
- **Clear dependencies**: Prerequisite graph is manageable
- **Assessment simplicity**: One module = one testable outcome set
- **User flexibility**: Learners can take modules in order or jump to topics of interest

### Negative / Constraints ⚠️
- **Prerequisite complexity**: Must maintain dependency graph (doc in DDD)
- **Context spanning**: Learner must remember Module 1 when taking Module 5
- **Recommendation engine**: Need clear pathways ("Start here" → "Then take...")
- **Chunking loss**: Can't tell a complete 60-minute narrative in modules
- **Dependency hell risk**: Deep trees of prerequisites (mitigate: limit depth to 3)

## Guidelines

### Writing a Module (Checklist)

- [ ] **Scope**: Covers exactly 1-2 concepts, not more
- [ ] **Duration**: 15-20 minutes for typical reader
- [ ] **Word count**: 1800-2200 words (use `wc` to verify)
- [ ] **Objectives**: 3-5 measurable learning outcomes (TDD: write assessment first)
- [ ] **Examples**: At least 2-3 concrete examples or code samples
- [ ] **Visual**: At least 1 diagram or visualization
- [ ] **Assessment**: 5-7 quiz questions covering objectives
- [ ] **Prerequisite**: Modules needed before this one (0-2 typical)
- [ ] **Independence**: Module works standalone (can take out of order)

### Module Naming Convention
```
module-{N:02d}-{slug}/
├─ 01-module-tokens/          ← "01" = position, "tokens" = topic slug
├─ 02-module-transformers/
├─ 05-module-svd-decomposition/
└─ ...
```

## Related Decisions
- ADR-001: MDX format (each module = 1 MDX file)
- ADR-002: Netlify hosting (each module = separate page route)
- ADR-004: TDD assessments (assessment.json validates the module)

## References
- [LinkedIn Learning Module Best Practices](https://learning.linkedin.com/en-us/blog/learning-and-development/your-ultimate-guide-to-linkedin-learning-authors)
- [Course Design Principles](https://en.wikipedia.org/wiki/Curriculum_design)
- [Cognitive Load Theory - Module Sizing](https://en.wikipedia.org/wiki/Cognitive_load)
