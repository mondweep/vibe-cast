# Debugging Report: PowerPoint & SVG Marketing Assets

This report documents the corrective actions taken to resolve file corruption in programmatically generated PowerPoint decks and typography issues in specialized SVG marketing cards.

## 1. PowerPoint (PPTX) Stabilization

### The Problem
Generated `.pptx` files were triggering "Repair" prompts on Desktop PowerPoint (Mac/Windows). If repaired, slides 2-4 were frequently removed due to "unreadable content."

### Diagnosis
- **Schema Conflicts**: The use of `p:ph` (Placeholder) tags on slides referencing a "Blank" layout caused structural validation failures.
- **Missing Terminators**: Paragraphs were missing the mandatory `a:endParaRPr` (End Paragraph Run Properties) nodes.
- **Glyph Errors**: High-plane Unicode emojis (📊, ✓) were causing font fallback issues in specific Office desktop environments.
- **Master Inheritance**: Coupling with empty Master shapes was creating redundant or conflicting XML references.

### Fixes Applied
- **Strict OXML Compliance**: Locked the element sequence in `presentation.xml` and added mandatory paragraph properties.
- **Text Sanitization**: Replaced all emojis with plain text identifiers (e.g., `Trend:`, `Item:`) and handled empty lines by injecting safe spaces instead of creating empty `<a:t/>` nodes.
- **Decoupling**: Set `ShowMasterShapes = false` on all content slides and removed all `p:ph` placeholder metadata.
- **Property Correction**: Fixed a naming mismatch in the SDK code where `MarginLeft` was corrected to the valid `LeftMargin`.

## 2. SVG High-Fidelity Refinement

### The Problem
Marketing card headlines were frequently truncated ("delivers on the promise o...") or split awkwardly (e.g., "Ven dor" and "Gui de").

### Diagnosis
- **Static Typography**: Rigid 44pt font was too large for enterprise-length headlines.
- **Truncation Logic**: The rendering loop was hard-capped at 3 lines, regardless of format.
- **Word Wrapping**: The previous logic split words based on simple character counts rather than full word boundaries.

### Fixes Applied
- **Dynamic Font Scaling**: Implemented a logic that reduces font size (44pt → 36pt → 30pt) based on the total character count of the headline.
- **Word-Aware Wrapping**: Overhauled the `GenerateTspans` helper to only break lines at space boundaries, ensuring technical terms remain intact.
- **Increased Capacity**: Social cards now support up to 4-6 lines of text with optimized line spacing (`lineSpacing = fontSize + 6`).
- **Safe-Area Margins**: Standardized margins to ensure text stays within visual boundaries on all social formats (LinkedIn, Twitter, Instagram).

## 3. Synchronization
- All syntax fixes (`.cs`) and refined formatting logic have been pushed to the GitHub branch: `claude/microsoft-agent-framework-PYgKV`.
- Legacy output files have been pruned and the repository state is now synchronized with the latest successful generation.
