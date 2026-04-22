# Module 2: Transformer Architecture Basics

## Overview

This module covers the foundational architecture of transformer models - the core innovation behind modern LLMs like GPT, Claude, and others.

## Module Structure

- **objectives.json**: Learning outcomes for this module
- **assessment.json**: 5 questions (3 MC, 2 free-response) evaluating understanding
- **index.mdx**: Main lesson content (~2000 words)
- **exercises.json**: 4 hands-on exercises for practice
- **README.md**: This file

## Learning Path

**Prerequisites**: Module 1 (Tokens & Tokenization)

**Concepts Covered**:
1. Why transformers replaced RNNs (parallelization)
2. Token embeddings (converting IDs to vectors)
3. Positional encoding (adding position information)
4. Multi-head attention (parallel attention)
5. Feed-forward networks
6. Layer stacking

## TDD Approach

This module follows Test-Driven Development:

1. **RED** (Assessment First)
   - assessment.json defines what success looks like
   - Questions test each learning outcome
   - Rubrics ensure consistent evaluation

2. **GREEN** (Write Content)
   - index.mdx provides clear explanations
   - Diagrams and examples build intuition
   - Multiple representations of concepts

3. **REFACTOR** (Polish)
   - Exercises reinforce key concepts
   - Connections to later modules (especially Module 3)
   - Clear "Next Steps" for progression

4. **PUBLISH** (Ready for Production)
   - All files complete and validated
   - Routing in Astro configured
   - Ready to deploy

## Key Takeaways

After completing this module, students should understand:
- Why transformers enable parallel processing
- How embeddings and positional encoding work together
- The role of attention in connecting tokens
- Fundamental advantages of transformers over RNNs

## Assessment Strategy

- **Passing Score**: 70% (70 out of 100 points)
- **Question Types**: Mix of multiple-choice (tests factual knowledge) and free-response (tests conceptual understanding)
- **Rubrics**: Free-response questions have clear rubrics for partial credit

## Time Estimate

- Reading: 15 minutes
- Exercises: 20 minutes (optional, recommended)
- Assessment: 10 minutes
- **Total**: 20 minutes (content only) - 45 minutes (with exercises + assessment)

## Dependencies

- Module 1 (Tokens) should be completed first
- Module 3 (Attention Deep Dive) builds directly on this content
- Modules 4-6 extend to embeddings and specific architectures
