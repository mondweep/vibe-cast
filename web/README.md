# Demo site

A single page showing all seven demos with their real output — for showing the
work to people who aren't going to clone a repo and install a Rust toolchain.

The page works two ways from the same files:

| Host | What your team sees | Cost | Setup |
|---|---|---|---|
| **Netlify** (recommended) | Captured output from a real run | Free | ~2 min |
| **Cloud Run** | A **Run live** button per demo that executes the binary on request | Container billing | ~10 min |

The page probes `/healthz` on load. If a backend answers, the *Run live* buttons
appear; on a static host they stay hidden and the captured output stands alone.
No separate build.

## Regenerating

`web/index.html` is committed, and is generated from **real demo runs** — not
hand-copied:

```bash
python3 web/build.py            # runs every demo, captures output, rebuilds the page
python3 web/build.py --no-run   # rebuild from web/fixtures/ without running anything
```

`build.py` runs each host demo, boots demo 4 under QEMU when available, converts
the ANSI colour to HTML, and writes both `web/index.html` and the per-demo
fixtures in `web/fixtures/`. Re-run it and commit whenever a demo changes.

## Netlify

Netlify's build image has no Rust toolchain and no QEMU, so it publishes the
committed `web/` directory as-is rather than regenerating. `netlify.toml` at the
repo root already sets this up.

**Via the dashboard:** New site → import from Git → pick this repo and the
`claude/rvm-hello-world-ideas-mua6ja` branch. The publish directory (`web`) is
read from `netlify.toml`. Deploy.

**Via CLI:**

```bash
npm install -g netlify-cli
netlify deploy --dir=web --prod
```

Drag-and-drop also works — the `web/` folder is fully self-contained (one HTML
file plus fixtures), no build step and no external assets.

## Cloud Run

Use this when you want people to press a button and watch the code actually run,
rather than read a transcript.

```bash
gcloud run deploy rvm-demos \
  --source . \
  --region europe-west2 \
  --allow-unauthenticated \
  --memory 512Mi
```

The `Dockerfile` clones rvm at the pinned revision, builds the six host demos in
a Rust stage, and copies just the binaries into a slim Python runtime that serves
`web/` and executes demos on `/run/<id>`.

Notes:

- **Demo 4 is never live.** It is a bare-metal AArch64 kernel needing QEMU; the
  image would roughly triple to carry an emulator. `/run/04` returns the
  captured boot output and says so.
- Each run is capped at 60s and runs as a non-root user. The demos take no
  input and touch no network or filesystem, so there is nothing to inject —
  but it is still arbitrary execution behind an HTTP endpoint. Drop
  `--allow-unauthenticated` and put it behind IAP if the deploy is not private
  to your team.
- Timings shown live will differ from the committed ones — Cloud Run CPU is
  slower and noisier than the machine these were measured on. The relative
  picture (P1/P3 in nanoseconds, witness emission in hundreds) holds.

## Endpoints (Cloud Run only)

| Route | Returns |
|---|---|
| `/` | The page |
| `/healthz` | `{"ok":true}` — what the page probes to decide whether to show live buttons |
| `/run/<id>` | `{"live":bool,"exit_code":int,"html":"..."}` for `01`,`02`,`03`,`05`,`06`,`07`; `04` returns the fixture |

## Local preview

```bash
# static, exactly as Netlify serves it
python3 -m http.server 8000 --directory web

# with the live backend, exactly as Cloud Run serves it
cargo build --release --workspace
DEMO_BIN_DIR=$PWD/target/release PORT=8099 python3 web/server.py
```
