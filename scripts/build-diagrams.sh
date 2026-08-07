#!/usr/bin/env bash
# Render docs/diagrams/*.mmd to committed SVGs.
#
# The README references the SVGs as ordinary images rather than embedding
# ```mermaid blocks, because GitHub's mermaid viewer has bitten us three ways:
# it renders <b>/<i> as literal text, drops <br/> without a line break, and
# clips anything taller than roughly 420px. Rendering here instead means the
# published page shows exactly what we saw locally.
#
#   ./scripts/build-diagrams.sh            regenerate every SVG
#   ./scripts/build-diagrams.sh --check    fail if any SVG is out of date
#
# Requires node. Installs mermaid-cli into scripts/.diagram-tools on first run.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

SRC_DIR="docs/diagrams"
TOOLS="scripts/.diagram-tools"
MMDC="$TOOLS/node_modules/.bin/mmdc"
CHECK=false
[ "${1:-}" = "--check" ] && CHECK=true

command -v node >/dev/null || { echo "node is required" >&2; exit 1; }

if [ ! -x "$MMDC" ]; then
  echo "Installing mermaid-cli into $TOOLS (first run only)..."
  mkdir -p "$TOOLS"
  ( cd "$TOOLS" && npm install --silent --no-package-lock @mermaid-js/mermaid-cli@11 )
fi

# Reuse a browser that is already present rather than downloading another.
PUPPETEER_CFG="$TOOLS/puppeteer.json"
BROWSER=""
for candidate in "${PUPPETEER_EXECUTABLE_PATH:-}" /opt/pw-browsers/chromium \
                 /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome; do
  [ -n "$candidate" ] && [ -x "$candidate" ] && { BROWSER="$candidate"; break; }
done
if [ -n "$BROWSER" ]; then
  printf '{"executablePath":"%s","args":["--no-sandbox"]}\n' "$BROWSER" > "$PUPPETEER_CFG"
else
  printf '{"args":["--no-sandbox"]}\n' > "$PUPPETEER_CFG"
fi

status=0
for src in "$SRC_DIR"/*.mmd; do
  out="${src%.mmd}.svg"
  tmp="$(mktemp -t diagram-XXXXXX.svg)"

  "$MMDC" --input "$src" --output "$tmp" \
          --backgroundColor transparent \
          --puppeteerConfigFile "$PUPPETEER_CFG" >/dev/null 2>&1

  # mermaid stamps a random id into the SVG on every run, which would make
  # every rebuild look like a change. Normalise it before comparing.
  sed -i 's/my-svg[a-zA-Z0-9_-]*/my-svg/g; s/mermaid-[0-9][0-9]*/mermaid-0/g' "$tmp"

  # mermaid emits width="100%" and no height, which leaves the SVG with no
  # intrinsic size. That is fine inside a page, but a markdown image is an
  # <img> -- with no intrinsic size the browser falls back to 300x150 and the
  # diagram is squashed. Give it real dimensions from the viewBox.
  node -e '
    const fs = require("fs");
    const f = process.argv[1];
    let s = fs.readFileSync(f, "utf8");
    const vb = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    if (vb) {
      const w = Math.ceil(parseFloat(vb[1])), h = Math.ceil(parseFloat(vb[2]));
      s = s.replace(/(<svg[^>]*?)\swidth="[^"]*"/, "$1");
      s = s.replace(/(<svg[^>]*?)\sheight="[^"]*"/, "$1");
      s = s.replace(/<svg /, `<svg width="${w}" height="${h}" `);
      s = s.replace(/style="max-width:[^"]*"/, "");
    }
    fs.writeFileSync(f, s);
  ' "$tmp"

  if $CHECK; then
    if [ ! -f "$out" ] || ! diff -q "$tmp" "$out" >/dev/null; then
      echo "STALE: $out does not match $src"
      status=1
    fi
    rm -f "$tmp"
  else
    mv "$tmp" "$out"
    echo "rendered $out"
  fi
done

if $CHECK; then
  [ $status -eq 0 ] && echo "all diagrams up to date"
  exit $status
fi
echo
echo "Done. Commit docs/diagrams/*.svg along with the .mmd sources."
