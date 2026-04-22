# Ubiquitous Language: AI Safety Tutorial Content System

**Purpose**: Single source of truth for terminology across the entire project  
**Usage**: Copy relevant sections into team docs, code comments, PR templates

---

## Learning Design Terminology

### Module
**Definition**: A self-contained lesson lasting 10-20 minutes, covering 1-2 related concepts.

**Characteristics**:
- Standalone (can be taken in or out of order, though prerequisites apply)
- Focused scope (not trying to teach 10 things)
- Has learning objectives and assessment
- Published across all platforms (Netlify, LinkedIn, Disco, Blog)

**Examples**:
- "Tokens & Tokenization" (Module 1)
- "SVD Decomposition" (Module 5)
- "Abliteration via SVD" (Module 7)

**NOT**:
- ❌ A course (that's multiple modules)
- ❌ A chapter (modules are self-contained, chapters aren't)
- ❌ A lecture (too specific to one format)

---

### Lesson
**Definition**: A section within a module that teaches a single concept or skill.

**Characteristics**:
- Part of exactly one module
- Ordered within the module
- Usually 3-5 minutes of content
- May include interactive elements

**Example**:
- Module 1 "Tokens & Tokenization" contains:
  - Lesson 1.1: "What is a token?"
  - Lesson 1.2: "Why tokenization matters"
  - Lesson 1.3: "Calculating token count"

---

### Concept
**Definition**: An atomic idea or skill that can be taught, tested, and referenced.

**Characteristics**:
- Reusable (appears in multiple modules)
- Testable (can ask questions about it)
- Named and defined precisely
- Often has multiple representations (text, math, code, visual)

**Examples**:
- "Tokenization"
- "Singular Value Decomposition"
- "Mixture of Experts"
- "Attention Mechanism"

**NOT**:
- ❌ A module (modules are larger, contain multiple concepts)
- ❌ A topic (too vague; topics contain concepts)

---

### Learning Outcome
**Definition**: A measurable skill or knowledge that a student should have after studying a module.

**Characteristics**:
- Starts with a verb from Bloom's Taxonomy: define, explain, apply, analyze, evaluate
- Specific (not "understand tokens" but "define what a token is")
- Testable (assessment questions can validate it)
- 3-5 per module

**Examples**:
- "Define what a token is in NLP"
- "Calculate approximate token count from text"
- "Explain why tokenization matters for model input"

**Good vs. Bad**:
- ✅ Good: "Student can apply SVD decomposition to a 3×3 matrix"
- ❌ Bad: "Student will understand SVD"

---

### Assessment
**Definition**: A collection of questions that validate whether a student achieved the learning outcomes.

**Characteristics**:
- Maps to learning outcomes (each question tests one or more outcomes)
- Validates understanding, not just memorization
- 5-7 questions per module
- Has a passing score (typically 70%+)

**Examples**:
- Multiple choice question: "What is approximately the token count of a 50-word sentence?"
- Free text: "Explain why removing safety directions via SVD degrades reasoning"
- Code challenge: "Decompose this matrix using SVD"

**Relationship to Module**:
```
Module
  ├─ Learning Outcomes (3-5)
  └─ Assessment
      ├─ Question 1 → tests Learning Outcome A
      ├─ Question 2 → tests Learning Outcome B
      ├─ Question 3 → tests Learning Outcome A (reinforcement)
      └─ ...
```

---

### Exercise
**Definition**: A practice problem that students work through hands-on to reinforce learning.

**Characteristics**:
- Reinforces one or more concepts from the module
- Has a solution and explanation
- Can be code, math, writing, or conceptual
- Optional (assessment is required, exercises are bonus)
- Difficulty levels: easy, medium, hard

**Examples**:
- Write Python code to tokenize a sentence
- Calculate SVD decomposition manually
- Explain in your own words why abliteration reduces reasoning

**vs. Assessment**:
| Assessment | Exercise |
|-----------|----------|
| Required | Optional |
| Measures learning | Reinforces learning |
| Tests all outcomes | Tests specific skills |
| Graded (pass/fail) | Self-checked |

---

### Prerequisite
**Definition**: A module that must be completed before starting another module.

**Characteristics**:
- Forms a dependency graph
- Should be acyclic (no circular dependencies)
- Can have multiple prerequisites
- Shown to learners as "Requires: [Module 1, Module 2]"

**Example**:
- Module 7 "Abliteration via SVD" requires Module 5 "SVD Decomposition"
- Module 2 "Transformers" requires Module 1 "Tokens"

**NOT**:
- ❌ Recommendations (those are "suggested" not required)
- ❌ Corequisites (modules taken simultaneously)

---

## Platform & Publishing Terminology

### Channel
**Definition**: A platform where content is published.

**Supported Channels**:
1. **Netlify**: Interactive web version with full features
2. **LinkedIn Learning**: Structured course platform, 10-15 min lessons
3. **Disco**: Community platform with course cards
4. **Blog**: Standalone posts (Medium, Dev.to, Substack)

**Publishing Strategy**:
- Content source: MDX (single version of truth)
- Export: MDX → HTML (Netlify), JSON (LinkedIn), Markdown (Blog)
- Cross-promotion: Link between channels (Netlify module links to LinkedIn lesson)

---

### Published Version
**Definition**: A snapshot of module/course content at a specific moment in time.

**Characteristics**:
- Immutable (once published, doesn't change)
- Tied to specific channel(s)
- Has metadata: published_date, author, version number
- Can be rolled back to

**Example**:
```
Module 1: "Tokens & Tokenization"
  ├─ Draft (v0.1) — being written
  ├─ Published v1.0 (Netlify, LinkedIn) — published 2026-04-25
  └─ Published v1.1 (all channels) — published 2026-05-01
```

---

### Status
**Definition**: The lifecycle state of a module or course.

**States**:
- **Draft**: Being written, not yet published
- **Published**: Live on at least one channel
- **Archived**: Older version, no longer current but kept for reference

**NOT**:
- ❌ "Private" / "Public" (publishing decision, not lifecycle)
- ❌ "Review" (all modules are reviewed before publishing)

---

### Artifact
**Definition**: Any supporting content: diagrams, code examples, images.

**Types**:
- **Diagram**: SVG or PNG visual (e.g., "Attention mechanism flow")
- **Code Snippet**: Runnable code example (Python, JavaScript, pseudocode)
- **Image**: Photo or illustration with caption
- **Interactive Component**: React component (e.g., SVD decomposition visualizer)

**Stored in**:
```
module-XX-slug/
└── assets/
    ├── diagrams/
    ├── code/
    └── images/
```

---

## Content Quality Terminology

### Learning Outcome Coverage
**Definition**: Every learning outcome in a module has at least one assessment question testing it.

**Validation**:
```
For each LearningOutcome O in Module.learning_outcomes:
  questions_testing_O = Assessment.questions
    .filter(q => q.tests_outcome == O.id)
  Assert: questions_testing_O.length >= 1
```

**Importance**: Ensures assessment actually validates all objectives.

---

### Assessment Coverage
**Definition**: Every assessment question aligns with at least one learning outcome.

**Validation**:
```
For each Question Q in Assessment.questions:
  Assert: Q.tests_outcome ∈ Module.learning_outcomes
```

**Importance**: Keeps assessment focused (no random questions).

---

### Answerability
**Definition**: A student who studied the module content can correctly answer assessment questions.

**Validation**: External review + pilot testing
- Give module to 2-3 students
- Ask them to take assessment
- Target: ≥70% pass rate

**Importance**: Ensures module actually teaches what questions ask.

---

### Difficulty
**Definition**: The cognitive level required to understand or complete something.

**Levels**:
- **Beginner**: Foundational, assumes no prior knowledge
- **Intermediate**: Builds on other modules, requires some background
- **Advanced**: Deep dive, assumes strong foundation

**Applied to**:
- Modules: "Module 5: SVD is intermediate level"
- Questions: "This question is difficulty 3/5"
- Exercises: "Easy / Medium / Hard"

---

## DDD Terminology

### Bounded Context
**Definition**: A subsystem with clear boundaries and responsibility.

**Project Contexts**:
1. **Content Creation**: Writing modules and assessments
2. **Course Management**: Organizing modules into courses
3. **Publishing**: Exporting to channels

---

### Aggregate Root
**Definition**: The main entity that other objects belong to.

**Project Aggregate Roots**:
- **Module**: Root of all lesson, exercise, assessment data
- **Course**: Root of all module ordering, prerequisites

---

### Entity vs. Value Object
- **Entity**: Has identity, can change over time (Module, Course)
- **Value Object**: No identity, immutable (Question, LearningOutcome, CodeSnippet)

---

## Summary Table

| Term | Type | Scope | Multiplicity | Example |
|------|------|-------|--------------|---------|
| Module | Aggregate Root | 10-20 min | Dozens | "Tokens & Tokenization" |
| Lesson | Entity | 3-5 min | 3-5 per module | "What is a token?" |
| Concept | Entity | Atomic idea | Reused | "Tokenization" |
| Learning Outcome | Value Object | Measurable skill | 3-5 per module | "Define a token" |
| Assessment | Aggregate | Quiz/test | 1 per module | 5-7 questions |
| Question | Value Object | Single item | 5-7 per assessment | "What's a token?" |
| Exercise | Entity | Practice | 3-5 per module | "Tokenize this text" |
| Course | Aggregate Root | Multiple modules | A few | "AI Safety 101" |
| Prerequisite | Value Object | Dependency | Variable | "Requires: Module 1" |
| Channel | Value Object | Platform | 4 total | Netlify, LinkedIn, ... |
| Artifact | Entity | Supporting content | Variable | Diagrams, code, images |

---

## Writing Guidelines Using Ubiquitous Language

### When Creating a Module
1. Define 3-5 **learning outcomes** (what students should DO)
2. Create **concepts** that align with outcomes
3. Write **lessons** to explain each concept
4. Add **artifacts** (diagrams, code) to clarify
5. Create **exercises** for practice
6. Write **assessment** questions testing outcomes
7. Document **prerequisites**

### When Reviewing Content
- Use questions from ubiquitous language:
  - "Does each learning outcome have assessment coverage?"
  - "Can a student answer all assessment questions from the module?"
  - "Are prerequisite dependencies clearly marked?"
  - "Is the difficulty level appropriate?"

### When Discussing with Team
- Use exact terms: "Module", not "lesson" or "course"
- Say "learning outcome", not "objective" or "goal"
- Use "assessment", not "test" or "quiz" (test is ambiguous)
- Use "exercise", not "practice problem" (practice implies it's optional)

---

**Last Updated**: 2026-04-22  
**Maintained By**: Course Development Team
