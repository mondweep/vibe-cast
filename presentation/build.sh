#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install --silent
fi

CHROME=$(node -e "console.log(require('puppeteer').executablePath())")
export CHROME_PATH="$CHROME"

./node_modules/.bin/marp deck.md -o deck.html --html
./node_modules/.bin/marp deck.md -o deck.pdf  --pdf  --html --allow-local-files

echo "Built: $(pwd)/deck.html and $(pwd)/deck.pdf"
