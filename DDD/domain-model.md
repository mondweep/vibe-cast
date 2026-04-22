# Domain-Driven Design: Domain Model

**Project**: AI Safety Tutorial Content System  
**Date**: 2026-04-22  
**Context**: Education content management across multiple platforms

---

## Core Domain: Learning Content System

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│           LEARNING CONTENT SYSTEM                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Content Bounded Context  Course Bounded Context   │
│  ├─ Module                ├─ CoursePath           │
│  ├─ Lesson                ├─ Prerequisite         │
│  ├─ Concept               └─ CourseMeta           │
│  ├─ Assessment                                     │
│  └─ Exercise              Publishing Bounded      │
│                           Context                  │
│                           ├─ PublishedVersion     │
│                           ├─ Channel              │
│                           └─ DeployEvent          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Entities (Objects with Identity)

### Module
**Definition**: A self-contained lesson of 10-20 minutes covering 1-2 concepts.

```typescript
class Module {
  // Identity
  id: ModuleId;              // "module-01-tokens"
  
  // Metadata
  title: string;             // "Tokens & Tokenization"
  slug: string;              // "tokens"
  description: string;       // Short summary
  created_at: Date;
  updated_at: Date;
  author: Author;
  
  // Content
  content: MDXContent;       // The lesson (index.mdx)
  estimated_duration_minutes: number;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  
  // Learning Structure
  learning_outcomes: LearningObjective[];    // 3-5 outcomes
  key_concepts: Concept[];                   // 1-2 core ideas
  prerequisites: ModuleId[];                 // Required modules
  
  // Assessment
  assessment: Assessment;                    // Quiz/test
  exercises: Exercise[];                     // Practice problems
  
  // Presentation
  assets: Asset[];                           // Diagrams, code, images
  status: "draft" | "published" | "archived";
  
  // Methods
  calculateReadingTime(): number;
  validateAssessmentCoverage(): boolean;    // Does assessment cover all objectives?
  getPrerequisiteChain(): Module[];         // All transitive prerequisites
}
```

### Lesson
**Definition**: A section within a Module.

```typescript
class Lesson {
  id: LessonId;
  module_id: ModuleId;
  
  title: string;
  section_order: number;
  content: MDXContent;
  duration_seconds: number;
  
  // References
  concepts: Concept[];       // Which concepts does this lesson teach?
  learning_outcomes: LearningObjective[];
}
```

### Concept
**Definition**: An atomic idea or skill that can be taught and tested.

Examples: "Tokenization", "Attention Mechanism", "SVD Decomposition"

```typescript
class Concept {
  id: ConceptId;
  
  name: string;              // "Singular Value Decomposition"
  technical_name: string;    // "SVD"
  
  // Understanding levels
  intuitive_explanation: string;     // Plain English
  mathematical_definition: string;   // Formal math
  visual_representation: Diagram;    // Picture
  code_example: CodeSnippet;
  
  // Relationships
  related_concepts: ConceptId[];
  prerequisites: ConceptId[];        // Concepts needed first
  
  // Usage
  used_in_modules: ModuleId[];
}
```

### Assessment
**Definition**: A test that validates learning outcomes.

```typescript
class Assessment {
  id: AssessmentId;
  module_id: ModuleId;
  
  title: string;
  description: string;
  
  // Questions
  questions: Question[];             // 5-7 questions
  passing_score: number;             // 0-100
  total_points: number;
  
  // Mapping to outcomes
  covers_outcomes: LearningObjective[];
  
  // Methods
  validate(): AssessmentValidationResult;
  grade(answers: StudentAnswers): GradeResult;
}
```

### Exercise
**Definition**: A practice problem for students to work through.

```typescript
class Exercise {
  id: ExerciseId;
  module_id: ModuleId;
  
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  
  // Problem
  prompt: string;
  solution: string;
  hint: string;
  
  // Validation
  tests: TestCase[];    // For code exercises
  expected_output: string;
  
  // Metadata
  estimated_time_minutes: number;
  related_concepts: ConceptId[];
}
```

---

## Value Objects (Immutable, No Identity)

### LearningObjective
**Definition**: A measurable outcome a student should achieve.

Uses Bloom's Taxonomy verbs: "define", "explain", "apply", "analyze", "evaluate"

```typescript
class LearningObjective {
  id: string;
  
  verb: "define" | "explain" | "apply" | "analyze" | "evaluate";
  subject: string;           // "What?" (e.g., "tokens")
  context: string;           // "Why?" (e.g., "for model input")
  
  // Example: verb="define", subject="token", context="NLP"
  // Means: "Student can define what a token is in NLP context"
  
  // Validation in assessment
  assessment_question_ids: string[];  // Which questions test this?
}
```

### CodeSnippet
**Definition**: Executable code example.

```typescript
class CodeSnippet {
  language: "python" | "javascript" | "pseudocode";
  code: string;
  explanation: string;
  
  // Validation
  is_runnable: boolean;
  expected_output: string;
}
```

### Diagram
**Definition**: Visual representation.

```typescript
class Diagram {
  id: string;
  title: string;
  
  format: "svg" | "png" | "mermaid";
  source: string | Buffer;
  alt_text: string;
  
  caption: string;
  explanation: string;
}
```

### Question
**Definition**: A single assessment question.

```typescript
class Question {
  id: string;
  
  type: "multiple_choice" | "free_text" | "code" | "matching";
  question_text: string;
  
  // Answer
  correct_answer: string | string[];
  explanation: string;        // Why is this correct?
  
  // Scoring
  points: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  
  // Pedagogical mapping
  tests_learning_outcome: string;  // LearningObjective id
  
  // Multiple choice specific
  options?: string[];
  correct_option?: "a" | "b" | "c" | "d";
}
```

---

## Aggregates (Clusters of Entities)

### CourseAggregate
**Root**: Course
**Responsibility**: Manage all modules, prerequisites, and publishing as a cohesive unit.

```typescript
class Course {
  id: CourseId;
  
  title: string;
  description: string;
  
  // Composition
  modules: Module[];         // Ordered list
  
  // Lifecycle
  status: "planning" | "in_progress" | "published" | "archived";
  version: string;           // "1.0.0"
  published_at: Date;
  
  // Quality gates
  validation_results: ValidationResult[];
  
  // Methods
  addModule(module: Module): void;
  validatePrerequisites(): PrerequisiteError[];
  calculateTotalDuration(): number;
  publish(channel: Channel): PublishedVersion;
}
```

### ModuleAggregate
**Root**: Module
**Responsibility**: Everything about a single module (content, assessment, exercises).

```typescript
class Module {
  // (See above: Module entity)
  // This is its own aggregate root
  
  // Invariants
  private validateInvariants() {
    // All learning outcomes must have assessment questions
    // All assessment questions must map to outcomes
    // All exercises must relate to concepts
  }
}
```

---

## Bounded Contexts

### Context 1: Content Creation
**Scope**: Writing, editing, and validating educational content

**Entities**:
- Module
- Lesson
- Concept
- Assessment
- Exercise

**Key Operations**:
- Create module with objectives
- Write content
- Create assessment
- Validate coverage (objectives ↔ assessment)
- Generate learning path

**Invariants**:
- Module has 1-2 concepts
- All learning outcomes have assessment questions
- Assessment questions map to outcomes
- Prerequisites form a DAG (no cycles)

---

### Context 2: Course Management
**Scope**: Organizing modules into courses, managing dependencies

**Entities**:
- Course
- CoursePath
- Prerequisite

**Key Operations**:
- Create course from modules
- Define prerequisite chains
- Calculate learning path
- Validate no circular dependencies

**Invariants**:
- Course modules are ordered
- Prerequisites are acyclic
- All prerequisite modules exist

---

### Context 3: Publishing
**Scope**: Exporting content to multiple platforms

**Entities**:
- PublishedVersion
- Channel (Netlify, LinkedIn, Disco, Blog)
- DeployEvent

**Key Operations**:
- Export MDX → HTML (Netlify)
- Export MDX → JSON (LinkedIn Learning)
- Export MDX → Markdown (Blog)
- Track publishing history

**Invariants**:
- Each channel has one "live" version
- Versions are immutable (snapshots)
- Can rollback to previous version

---

## Ubiquitous Language

A shared vocabulary used throughout the project:

| Term | Definition | Example |
|------|-----------|---------|
| **Module** | Self-contained lesson (10-20 min) covering 1-2 concepts | "Module 1: Tokens & Tokenization" |
| **Lesson** | A section within a module | "Lesson 2.3: Understanding the KV Cache" |
| **Concept** | Atomic idea that can be learned and tested | "SVD Decomposition" |
| **Learning Outcome** | Measurable skill after studying module | "Student can define a token" |
| **Assessment** | Test validating outcomes (quiz/exam) | "5-question quiz on tokens" |
| **Exercise** | Practice problem for hands-on learning | "Calculate tokens in: 'Hello, world!'" |
| **Prerequisite** | Module(s) that must be completed first | "Module 2 requires Module 1" |
| **Channel** | Publication platform | Netlify, LinkedIn Learning, Disco, Blog |
| **Artifact** | Any content: diagrams, code, images | `assets/tokens-diagram.svg` |
| **Course** | Collection of ordered modules | "AI Safety Fundamentals" |
| **Draft** | Content in progress, not yet published | Status = "draft" |
| **Published** | Live on at least one channel | Status = "published" |
| **Difficulty** | Skill level required | beginner, intermediate, advanced |
| **Duration** | Expected time to complete | 15 minutes, 20 minutes |
| **Covering** | Assessment questions align with outcomes | "Assessment covers all 3 outcomes" |

---

## Key Invariants

Rules that must always be true for a valid domain model:

1. **Outcome Coverage**: Every LearningObjective must have ≥1 Question testing it
   ```
   For each outcome in Module.learning_outcomes:
     questions_testing_outcome = Assessment.questions
       .filter(q => q.tests_learning_outcome == outcome.id)
     Assert: questions_testing_outcome.length >= 1
   ```

2. **No Circular Prerequisites**: Prerequisite graph is acyclic
   ```
   For Module M1:
     prerequisites = M1.prerequisites + M1.prerequisites[*].prerequisites + ...
     Assert: M1 not in prerequisites  // M1 can't require itself (transitively)
   ```

3. **Concept Alignment**: Every exercise relates to module concepts
   ```
   For each Exercise E in Module.exercises:
     Assert: E.related_concepts ⊆ Module.key_concepts
   ```

4. **Assessment Quality**: Questions are answerable from content
   ```
   For each Question Q in Assessment.questions:
     // Can a student who studied the module answer Q correctly?
     AssertViaExternalReview: IsAnswerable(Q, Module.content)
   ```

---

## Aggregate Design Decisions

### Why Module is its own aggregate root:
- Modules are created and published independently
- Can exist without a course
- Assessment must be validated before module is "complete"
- Exercises are always child of a module

### Why Course is an aggregate root:
- Manages module ordering
- Validates prerequisite chains
- Publishes as a unit
- Can be versioned independently

### Anti-pattern: Trying to make LearningObjective an aggregate root
- ❌ Outcomes don't have independent lifecycle
- ❌ Always belong to a module
- ✅ Make them value objects instead

---

## References
- Domain-Driven Design by Eric Evans
- DDD Applied: Architecture Patterns
