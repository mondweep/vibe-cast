# Claude Skills Directory

This directory contains Claude Code skills and workflow guides for the Vibe Cast project.

## Structure

```
.claude/
├── CLAUDE.md           # Main context file (auto-loaded by Claude)
├── README.md           # This file
└── skills/
    └── infographic-content-library.md  # Visual content library skill
```

## Available Skills

### Infographic Content Library
**File:** `skills/infographic-content-library.md`

A comprehensive workflow system for creating and documenting AI-generated visual content libraries.

**Capabilities:**
- README.md generation with navigation, links, and embedded images
- SEMANTIC-GRAPH.md creation with Mermaid diagrams and Neo4j Cypher exports
- Slide mosaic generation from PDF presentations
- Curated guide creation for themed content collections
- Two-pass executor/reviewer workflow for quality assurance

**Based on:** [DinisCruz/NotebookLM__Infographics-and-slides](https://github.com/DinisCruz/NotebookLM__Infographics-and-slides)

## Usage

Claude Code automatically loads `CLAUDE.md` at session start. To use a specific skill:

```
"Use the infographic skill to create a README for this folder"
"Generate a SEMANTIC-GRAPH.md for this content"
"Create a slide mosaic for my presentation"
```

## Adding New Skills

1. Create a new `.md` file in the `skills/` directory
2. Document the skill's purpose, capabilities, and usage
3. Update `CLAUDE.md` with a reference to the new skill
