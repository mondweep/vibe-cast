# Presentation — EV Repair Network Navigator Proposal

A recruiter- and client-facing proposal deck for the Chief Technical Strategy Officer role. This is the **research, architecture, and roadmap** for validation; the working prototype follows once the direction is agreed.

## Files

- `deck.md` — slide source (Marp Markdown, edit this)
- `deck.html` — built HTML deck (open in any browser, also navigable with arrow keys)
- `deck.pdf` — built PDF deck (for emailing or attaching)
- `build.sh` — rebuild both outputs from `deck.md`

## Rebuild

```bash
cd presentation
./build.sh
```

The script installs dependencies on first run (Marp CLI + a Puppeteer-bundled Chromium for PDF rendering) and regenerates `deck.html` and `deck.pdf`.

## Editing

Edit `deck.md` directly. Slides are separated by `---`. The styling and brand palette are defined in the front-matter `style:` block — change once, applies to every slide.
