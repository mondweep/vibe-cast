# Debugging Report: PowerPoint & SVG Marketing Assets

This report documents the corrective actions taken to resolve file corruption in programmatically generated PowerPoint decks and typography issues in specialized SVG marketing cards.

## 1. PowerPoint (PPTX) Stabilization

### The Problem
Generated `.pptx` files were triggering "Repair" prompts on Desktop PowerPoint (Mac/Windows). If repaired, slides 2-4 were frequently removed due to "unreadable content."

### Earlier Partial Fixes (did not resolve the issue)
- Removed `p:ph` (Placeholder) tags from blank-layout slides.
- Added `a:endParaRPr` end-of-paragraph terminators.
- Replaced high-plane Unicode emojis with plain text to avoid font fallback issues.
- Set `ShowMasterShapes = false` on content slides.
- Corrected `MarginLeft` to `LeftMargin` property name.

These changes were valid improvements but did not address the actual corruption. The repair dialog persisted.

### Root Cause Diagnosis (Resolved 2026-04-13)
By unpacking the generated `.pptx` ZIP and comparing its XML structure against a known-good file produced by python-pptx, we identified that the OpenXML SDK does not enforce several structural requirements that PowerPoint desktop's schema validator expects. The SDK compiles and saves without errors, but the output is considered corrupt by PowerPoint.

The critical missing elements were:

1. **Theme not linked from presentation level** — The theme was only attached to the slide master (`slideMasterPart.AddNewPart<ThemePart>()`). PowerPoint requires a theme relationship in `presentation.xml.rels`. The theme must be created on the `PresentationPart` first, then shared to the slide master via `AddPart`.
2. **Missing `TableStylesPart`** — PowerPoint expects `ppt/tableStyles.xml` to exist even when there are no tables. An empty `<a:tblStyleLst>` with the standard default GUID is sufficient.
3. **Missing `defaultTextStyle` in `<p:presentation>`** — The presentation element must include 5 levels of default text paragraph properties (`lvl1pPr` through `lvl5pPr`).
4. **Wrong shape type for text boxes** — Text boxes were using `<a:spLocks noGrp="1"/>` (which is for placeholder shapes). Regular text boxes must use `<p:cNvSpPr txBox="1"/>` instead.
5. **Missing `ColorMapOverride` on slides** — Every slide must include `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>`.
6. **Missing `AdjustValueList` in `PresetGeometry`** — `<a:prstGeom prst="rect">` needs an `<a:avLst/>` child element.
7. **Missing `EffectList` in `BackgroundProperties`** — `<p:bgPr>` needs `<a:effectLst/>` after the fill element.
8. **Slide master background style** — Should use `BackgroundStyleReference` (with scheme color ref) rather than `BackgroundProperties`.
9. **Incomplete theme structure** — Theme was missing `ObjectDefaults` and `ExtraColorSchemeList` elements. The format scheme used bare `phClr` fills instead of the standard Office gradient structure with color transforms (`tint`, `shade`, `satMod`).
10. **Incomplete `ViewProperties`** — `NormalViewProperties` was missing `RestoredLeft` and `RestoredTop` child elements.

### Fixes Applied
All fixes are in `Formatters/PowerPointContentFormatter.cs`. The file was rewritten to match the structural patterns produced by python-pptx, which is known to generate universally compatible PPTX files. Key changes:

- Theme created on `PresentationPart` first, then shared to slide master via `slideMasterPart.AddPart(themePart)`
- Added `TableStylesPart` with empty `TableStyleList`
- Added `DefaultTextStyle` with 5 paragraph levels to the `Presentation` element
- Changed `NonVisualShapeDrawingProperties` to use `TextBox = true` instead of `ShapeLocks { NoGrouping = true }`
- Added `ColorMapOverride(new MasterColorMapping())` to every slide via shared `CreateSlideBase` helper
- Added `AdjustValueList` inside `PresetGeometry` and `EffectList` inside `BackgroundProperties`
- Slide master uses `BackgroundStyleReference` with index 1001
- Theme includes `ObjectDefaults`, `ExtraColorSchemeList`, and full Office-standard format scheme
- `ViewProperties` includes properly structured `NormalViewProperties`

### Lesson Learned
The OpenXML SDK validates C# syntax and type safety, but it does **not** validate whether the resulting XML meets PowerPoint desktop's schema expectations. Always compare generated output against a reference file from python-pptx or a real PowerPoint save when debugging repair errors. The quickest diagnostic method is to unzip both `.pptx` files and diff their XML structures.

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
