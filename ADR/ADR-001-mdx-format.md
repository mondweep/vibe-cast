# ADR-001: Content Source Format — MDX

**Status**: Accepted  
**Date**: 2026-04-22  
**Deciders**: Mondweep, Claude  

## Context

The AI Safety Tutorial needs to be published across multiple platforms (Netlify, LinkedIn Learning, Disco, blog). Each platform has different content requirements:
- Netlify: HTML with interactive components
- LinkedIn Learning: Structured JSON with lessons
- Disco: Course cards with metadata
- Blog: Markdown with embeds

Without a unified source format, content becomes difficult to maintain—changes require manual updates across 4+ platforms.

## Decision

**Use MDX (Markdown + JSX) as the single source of truth for all tutorial content.**

### What is MDX?

MDX allows writing Markdown with embedded JSX components:
```mdx
# Learning About Tokens

Here's a paragraph of regular markdown.

<InteractiveComponent 
  title="Token Visualization"
  code={`"hello world" → ["hello", "world"]`}
/>

More markdown after the component.
```

## Rationale

1. **Human-readable in git**: Markdown is text-based, diffs are meaningful
2. **Version control friendly**: Track changes, blame, review diffs clearly
3. **Component-rich**: JSX allows custom interactive visualizations
4. **Tooling ecosystem**: 
   - MDX → HTML (Netlify via Next.js/Astro)
   - MDX → JSON (custom script for LinkedIn)
   - MDX → Markdown (strip JSX for blog posts)
5. **Single source**: Update once, deploy everywhere
6. **Future-proof**: Can add animations, code playgrounds, assessments

## Alternatives Considered

### Markdown Only
- ✅ Simple, widely supported
- ❌ No interactivity (math rendering, visualizations)
- ❌ Can't embed custom components

### Notion / Google Docs
- ✅ Rich WYSIWYG editing
- ❌ Loses version control (no meaningful diffs)
- ❌ Vendor lock-in
- ❌ Hard to automate exports

### HTML Templates
- ✅ Full control over output
- ❌ Not human-readable in git
- ❌ Hard to maintain

### ReStructuredText (RST)
- ✅ Used by many open-source projects
- ❌ Steeper learning curve
- ❌ Less component support than MDX

## Consequences

### Positive ✅
- **Unified source**: One file per module, deployed to multiple platforms
- **Auditable**: Git history shows all changes, who made them, when
- **Collaborative**: Multiple people can work on different modules
- **Scalable**: Easy to add new content or channels later
- **Modern tooling**: Active ecosystem (Astro, Next.js, Nextra)

### Negative / Constraints ⚠️
- **Build step required**: MDX → HTML requires 2-3 minute build (acceptable)
- **Learning curve**: Team members need to learn MDX syntax
- **Component library**: Must create custom components for interactive elements
- **Export complexity**: Converting MDX to LinkedIn JSON requires custom scripting (Phase 2)

## Implementation Notes

### File Structure
```
docs/modules/module-01-tokens/
├── index.mdx              ← Main content (MDX)
├── objectives.json        ← Learning outcomes (JSON)
├── assessment.json        ← Quiz/tests (JSON)
├── exercises.json         ← Practice problems (JSON)
└── assets/
    ├── diagrams/          ← SVG/PNG files
    ├── code/              ← Code examples
    └── images/
```

### Tool Stack (Phase 1)
- **Build**: Astro (static site generator, optimized for content)
- **Styling**: Tailwind CSS
- **Deployment**: Netlify (automatic on git push)
- **Components**: React/Preact for interactive elements

### Tool Stack (Phase 2)
- **Export**: Custom Node script: `mdx-to-linkedin.js`
- **Validation**: `mdx-lint.js` (check for broken links, missing images)

## Related Decisions
- ADR-002: Netlify hosting (requires static site generation)
- ADR-003: Modular lessons (each module = 1 MDX file)
- ADR-004: TDD assessments (assessment.json defines what MDX must teach)

## References
- [MDX Official Docs](https://mdxjs.com/)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
- [GitHub - notable MDX projects](https://github.com/mdx-js/mdx#examples)
