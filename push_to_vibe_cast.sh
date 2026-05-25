#!/usr/bin/env bash
#
# push_to_vibe_cast.sh
# Pushes simple-agents-studio as an orphan branch on github.com/mondweep/vibe-cast
#
# Run this from inside the simple-agents-studio folder on your Mac:
#   cd ~/.gemini/antigravity/scratch/simple-agents-studio
#   bash push_to_vibe_cast.sh
#
# Sensitive files (.env, credentials.json, token.pickle, gmail_analysis_report.json)
# are blocked by .gitignore and verified again below before the commit lands.

set -euo pipefail

BRANCH="claude/simple-agents-studio"
REMOTE_URL="https://github.com/mondweep/vibe-cast.git"

# 1. Sanity check we're in the right folder
if [[ ! -f "app.py" || ! -f "gmail_analyst.py" || ! -f ".gitignore" ]]; then
  echo "ERROR: Run this from inside the simple-agents-studio folder." >&2
  exit 1
fi

# 2. Wipe any partial .git left from the sandbox attempt
if [[ -d ".git" ]]; then
  echo "Removing existing .git/ (likely partial state from Cowork sandbox)..."
  rm -rf .git
fi

# 3. Init repo and point HEAD at the orphan branch
#    (using symbolic-ref for compatibility with git < 2.28, which lacks `init -b`)
git init
git symbolic-ref HEAD "refs/heads/$BRANCH"
git config user.email "mondweep@dxsure.uk"
git config user.name "Mondweep"

# 4. Stage everything respecting .gitignore
git add -A

# 5. Hard safety check: refuse to commit if any sensitive file slipped through
SENSITIVE_REGEX='(^|/)(\.env|credentials\.json|token\.pickle|gmail_analysis_report\.json)$'
LEAKED=$(git ls-files | grep -E "$SENSITIVE_REGEX" || true)
if [[ -n "$LEAKED" ]]; then
  echo "ABORT: sensitive files staged:" >&2
  echo "$LEAKED" >&2
  exit 1
fi

# 6. Also refuse if any single file is >50MB (GitHub soft limit is 50MB, hard 100MB)
BIG=$(git ls-files | xargs -I{} stat -f "%z %N" "{}" 2>/dev/null | awk '$1 > 52428800 { print $0 }' || true)
if [[ -n "$BIG" ]]; then
  echo "ABORT: file(s) larger than 50MB staged:" >&2
  echo "$BIG" >&2
  exit 1
fi

echo ""
echo "Files that WILL be committed:"
git ls-files
echo ""

# 7. Commit
git commit -m "Initial commit: SimpleAgents Studio — Gmail analyst workflow

A small Flask + workflows.dev app that uses the Gmail API + OpenAI to
analyse the user's inbox: classify messages, summarise threads, and
expose them through a local web UI.

Files included:
  app.py                 — Flask app + endpoints
  gmail_analyst.py       — Gmail OAuth + analysis pipeline
  handlers.py            — workflow handlers
  workflow.yaml          — workflows.dev pipeline definition
  email_classifier.yaml  — classifier sub-workflow
  test_workflow.py       — local dev test script
  static/                — static assets for the UI
  requirements.txt       — Python dependencies
  README.md              — setup + usage

Excluded by .gitignore (kept local):
  .env                       — OPENAI_API_KEY + workflow base URL
  credentials.json           — Google OAuth client secret
  token.pickle               — cached Gmail access token
  gmail_analysis_report.json — analysed Gmail contents (PII)
  __pycache__/, .venv/       — build artefacts"

# 8. Add remote + push as orphan branch
git remote add origin "$REMOTE_URL"
echo ""
echo "Pushing branch $BRANCH to $REMOTE_URL ..."
git push -u origin "$BRANCH"

echo ""
echo "Done. Branch live at:"
echo "  https://github.com/mondweep/vibe-cast/tree/$BRANCH"
