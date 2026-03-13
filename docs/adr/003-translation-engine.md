# ADR-003: Translation Engine

## Status
Accepted

## Context
SanskritSync needs high-quality Sanskrit-to-English translation with contextual understanding of philosophical, spiritual, and cultural meaning.

## Decision
Claude API for translation and contextual explanation.

## Rationale
- Superior contextual understanding of Sanskrit philosophical texts
- Can provide both literal and poetic translations in a single call
- Excellent at explaining cultural context and source references
- Streaming API support for low-latency progressive display

## Alternatives Rejected
- **Google Translate**: Poor Sanskrit support, no contextual explanation
- **GPT-4**: Good but less nuanced on Indic philosophical contexts
- **Custom fine-tuned model**: Too expensive and time-consuming for MVP
