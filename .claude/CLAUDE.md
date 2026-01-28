# Claude Context for Vibe Cast

This project includes integrated Claude skills for content creation and documentation workflows.

## Available Skills

### Infographic Content Library Skill
Located at: `.claude/skills/infographic-content-library.md`

A comprehensive workflow system for creating, organizing, and documenting AI-generated visual content libraries (infographics, slide decks, documentation).

**Key Capabilities:**
- **README.md Generation** — Create navigation-focused documentation with breadcrumbs, quick links, embedded images, and semantic knowledge graph references
- **SEMANTIC-GRAPH.md Generation** — Build machine-readable knowledge documentation with Mermaid diagrams (flowcharts, ontologies, taxonomies, knowledge graphs) and Neo4j Cypher exports
- **Slide Mosaic Creation** — Generate 4x4 preview grids from PDF presentations using pdftoppm and montage
- **Curated Guide Creation** — Build themed collections linking related content across the repository
- **Two-Pass Workflow** — Use executor/reviewer modes for quality-assured content creation

**Quick Start Commands:**
```
"Generate README.md for this folder using the infographic skill"
"Create SEMANTIC-GRAPH.md for this content"
"Create a slide mosaic for presentation.pdf"
"Create a curated guide about [theme]"
"Review this file in reviewer mode"
```

## Documentation Standards

### Two-File Pattern
Each content folder should contain:
1. **README.md** — Human navigation (breadcrumbs, links, images)
2. **SEMANTIC-GRAPH.md** — Machine-readable (diagrams, Cypher, tags)

### URL Encoding
Always encode special characters in links:
- Spaces → `%20`
- Parentheses → `%28` / `%29`
- Apostrophes → `%27`

### Color Conventions for Diagrams
| Element | Light | Dark |
|---------|-------|------|
| Problems | #ffcdd2 | #c62828 |
| Solutions | #c8e6c9 | #2e7d32 |
| Concepts | #e3f2fd | #1976d2 |
| Processes | #fff3e0 | #f57c00 |
| Data | #e1bee7 | #7b1fa2 |

## Attribution

Visual content generation: Source documents → Google NotebookLM → Infographics + Slide decks

Based on workflow patterns from [DinisCruz/NotebookLM__Infographics-and-slides](https://github.com/DinisCruz/NotebookLM__Infographics-and-slides)
