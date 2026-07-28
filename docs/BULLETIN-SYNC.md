# Keeping the bulletin archive current

The console ships its bulletins **pre-parsed at build time**: the PDFs live in
`fixtures/`, a generator turns them into TypeScript under `src/generated/`, and
the browser opens on the result without ever touching pdf.js or the network
(ADR-0004, ADR-0007, NFR-3).

That is fast and it works offline, but it means a new ASDMA Daily Flood Report
only reaches the deployed site by way of a commit. This job removes the commit
from the repository owner's side of that: **drop the PDF in the Drive folder,
and it appears on the site the next morning.**

- Workflow: [`.github/workflows/sync-bulletins.yml`](../.github/workflows/sync-bulletins.yml)
- Fetcher: [`scripts/fetch-drive-bulletins.ts`](../scripts/fetch-drive-bulletins.ts)
  (the executable half) and [`scripts/drive-bulletins.ts`](../scripts/drive-bulletins.ts)
  (everything worth testing)
- Tests: `scripts/fetch-drive-bulletins.test.ts`

---

## What the repository owner has to do

Two things, once.

### 1. Let Actions write to the repository

**Settings → Actions → General → Workflow permissions → "Read and write
permissions" → Save.**

The job commits the new fixtures and the regenerated archive. The workflow asks
for `permissions: contents: write`, but a repository whose default is read-only
overrides that and the push fails with a 403. Nothing else needs granting —
there are **no secrets to configure**.

### 2. Confirm which branch this all happens on

The console currently deploys from **`claude/assam-flood-monitoring-prd-4fet9c`**,
and that is the branch the workflow checks out and pushes to
(`TARGET_BRANCH` at the top of the file).

Two things must line up, and they are separate:

- **Netlify** must be building that branch — Netlify → Site configuration →
  Build & deploy → Branches. If it is building `main` instead, the sync will
  commit perfectly good bulletins that nobody ever sees.
- **GitHub** only fires `schedule` triggers for workflows that exist on the
  repository's **default branch**. This is the one people are always caught by.
  If the default branch is `main` and this file only exists on the working
  branch, the nightly run simply never happens — no error, no run, no
  notification. `workflow_dispatch` still works from the branch, so it will look
  fine when tested by hand and do nothing thereafter.

  So either merge this workflow to the default branch (it will still check out
  and push to `TARGET_BRANCH`), or make the deploy branch the default. Pick one;
  the honest test is that a run appears in the Actions tab on a day nobody
  clicked anything.

To point the job at a different Drive folder, change `DEFAULT_FOLDER_ID` in
`scripts/drive-bulletins.ts`, or set `DRIVE_FOLDER_ID` — the workflow also takes
a folder id as a manual-run input, so a one-off backfill from another folder
needs no code change.

---

## How it works

Nightly at **20:00 UTC (01:30 IST)**, and on demand from the Actions tab:

1. **Read the folder.** `GET https://drive.google.com/drive/folders/<ID>` —
   no credentials — returns ~350 kB of HTML listing every file.
2. **Pair names with ids.** Each `Daily_Flood_Report_*.pdf` is matched to its
   Drive file id (see below).
3. **Skip what we already have.** Drive names files `2026-07-20`; `fixtures/`
   names them `20260720`. Comparison is by the *date*, never the filename —
   otherwise every bulletin looks new every night.
4. **Download and validate.** `https://drive.usercontent.google.com/download?id=…&export=download`.
   A file is kept only if it starts with `%PDF` **and** parses as a DRIMS
   bulletin **and** the `reportDate` inside it matches the date in its filename.
   Anything else is reported and discarded — a bulletin filed under the wrong
   date is worse than a missing one, because the timeline would then show a day
   of flood belonging to another day.
5. **Regenerate, then prove it.** Every `generate:*` script in `package.json` is
   re-run, then `npx vitest run` and `npm run build`.
6. **Commit** as `Claude <noreply@anthropic.com>`, naming the dates added, and
   push. Netlify takes it from there.

Steps 5 and 6 are in that order on purpose. This project has already shipped a
bulletin that broke the parser once; the tests run *before* the commit exists,
so a bad bulletin produces a red run and an unchanged site rather than a green
run and a broken console.

If a bulletin is rejected, the good bulletins of the same day are still
committed and the run is **failed afterwards**, so nothing is lost and someone
still gets told.

---

## Why it scrapes the page instead of calling the Drive API

`https://www.googleapis.com/drive/v3/files?q=…` returns **403 without an API
key**, even for a world-readable folder. (It does send CORS headers, so this is
about authentication, not about the browser.)

Using it would mean a key in repository secrets: something to create, something
to rotate, something an owner must be around to renew, and something that can
expire quietly — in exchange for reading data that is already public to anyone
with the link. The folder's own page needs none of that.

The cost of the trade is honest: **the folder page is undocumented markup and
Google can change it.** That is the known fragility of this job, and everything
below is about making sure it fails in the loud direction.

> Aside: the Drive folder is reachable from GitHub's runners at all because,
> unlike the SDRF source the console links to, it is not geo-restricted to
> India. That is the reason this approach is possible and the SDRF one is not.

### How the pairing actually works

The extractor walks the HTML **one element at a time** and keeps an element that
contains exactly one bulletin filename and exactly one Drive-id-shaped
*complete* attribute value:

```html
<div class=" i92Sbe a65Cwf" ssk='6:by9fbe38:1Pz7OVD0LB-n_SNws1wsnk68bcRaHV2AY-0-16'
     data-id="1Pz7OVD0LB-n_SNws1wsnk68bcRaHV2AY" jsname="vtaz5c"
     data-tooltip="Daily_Flood_Report_2026-07-20.pdf PDF">
```

Three deliberate choices:

- **Per element, not per document.** Two values being near each other in 350 kB
  of minified HTML proves nothing. Two values on the same element is as close to
  a stated relationship as the page offers.
- **Whole attribute values only.** Google also writes the id inside
  `ssk='6:by9fbe38:<id>-0-16'`. A loose match swallows the `-0-16` and yields an
  id that 404s. Requiring the value to be *nothing but* id characters skips
  those and keeps the clean `data-id="…"` form.
- **No attribute name is hard-coded.** `data-id` and `data-tooltip` are not
  matched by name — Google renames attributes far more readily than it changes
  how an id is written. Class names (`i92Sbe`, `a65Cwf`) are ignored entirely;
  they are build-generated and change constantly.
- **Ambiguity is dropped, never guessed.** An element with two ids, or two
  different filenames, contributes nothing.

**How brittle is this, really?** Moderately. It survives a class-name reshuffle,
an attribute rename, and reordering — the three most frequent kinds of change.
It does not survive Google moving the file list into a JSON blob rendered by
JavaScript, or serving a different page to non-browser clients, and either could
happen without notice. Expect it to work for a long time and to break without
warning, which is why the next section exists.

### Why "found nothing" is an error

The dangerous failure here is not a crash. It is Google reshuffling their markup
so that nothing pairs, the run going green with "0 new bulletins", and the
console quietly serving a stale archive for weeks while every signal says the
sync is healthy. A silent zero and a genuinely quiet day look identical, and
those two must never look alike.

So the script **exits non-zero when it finds no file at all**, and says which of
the two situations it thinks it is in:

- the page names bulletins but none could be paired with an id → almost
  certainly an attribute change, and it says so;
- the page names nothing → empty folder, unshared folder, or a page we can no
  longer read.

Better a red run that is occasionally about nothing than a green one that is
occasionally a lie.

---

## When it breaks

Read the failing step's log first — the messages are written to tell you which
of these it is.

| What you see | What happened | What to do |
| --- | --- | --- |
| `no file id could be paired` | Google changed the folder-page markup. | Fix the extractor in `scripts/drive-bulletins.ts`. Re-capture `scripts/__fixtures__/drive-folder-page.html` from a live `curl` first, so the test is again against real markup. |
| `No bulletins found on the folder page` | Empty folder, or it is no longer shared publicly, or the page shape changed wholesale. | Open the folder URL in a private window. If it prompts for sign-in, re-share it as "Anyone with the link". |
| `Google returned 403` | The folder stopped being public. | Re-share it. **Do not add an API key** — the job holds no secrets on purpose. |
| `not a PDF — the first bytes are not %PDF` | Drive served an interstitial, or the upload is corrupt. | Re-upload. If it recurs for large files, Drive's virus-scan warning page is the usual cause. |
| `does not parse` | ASDMA changed the bulletin layout, or the file is not a DRIMS bulletin. | A parser problem, not a sync problem. The file was **not** committed, so the site is unharmed. |
| `the filename says X but the bulletin reports Y` | The PDF was uploaded under the wrong date. | Rename it in Drive. |
| Push fails with 403 | Actions is read-only for this repository. | See "Let Actions write to the repository" above. |
| Nothing runs at night, but manual runs work | The workflow is not on the default branch. | See "Confirm which branch this all happens on" above. |
| The test or build step fails | A new bulletin broke something. | Working as designed: nothing was committed. Fix it, then re-run the workflow. |

### Running it by hand

```bash
npx vite-node scripts/fetch-drive-bulletins.ts      # writes into fixtures/
npm run generate:bundled-bulletins                  # or: every generate:* script
npx vitest run && npm run build
```

`DRIVE_FOLDER_ID=<other-folder> npx vite-node scripts/fetch-drive-bulletins.ts`
reads somewhere else.

### Testing the extractor

`scripts/__fixtures__/drive-folder-page.html` is a **byte-verbatim slice** of a
real response — two file entries, obfuscated class names and all. It is
deliberately not hand-written: a fixture invented by the extractor's own author
proves only that the extractor matches its author's idea of the markup, which is
the one thing already known.

The suite also exercises the failure the whole design is arranged around: it
strips `data-id` from the real markup and asserts the sync *raises* rather than
reporting a quiet zero.
