#!/bin/bash
# ==============================================================
# log_update.sh — Simple progress logger for Gemma AI build
# Usage: ./log_update.sh "What just happened (plain English)"
# ==============================================================

LOG_FILE="$(dirname "$0")/PROGRESS_LOG.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M %Z")

if [ -z "$1" ]; then
  echo "❌  Please provide a note. Example:"
  echo "    ./log_update.sh \"Build completed successfully!\""
  exit 1
fi

NOTE="$1"
STATUS="${2:-📝 Update}"  # Optional second arg for status emoji

echo ""
echo "📋 Logging update to PROGRESS_LOG.md..."
echo ""

# Append an update entry just before the Technical Reference section
UPDATE_BLOCK="
---

### 🔔 Update — $TIMESTAMP
- **Note:** $NOTE
- **Status:** $STATUS
"

# Insert the update block before the Technical Reference details section
python3 - <<PYEOF
import re

with open("$LOG_FILE", "r") as f:
    content = f.read()

insert_before = "## 🛠️ Technical Reference"
update_entry = """
---

### 🔔 Update — $TIMESTAMP
- **Note:** $NOTE
- **Status:** $STATUS
"""

# Update the "last updated" timestamp too
content = re.sub(
    r"\*Log last updated:.*\*",
    f"*Log last updated: $TIMESTAMP*",
    content
)

if insert_before in content:
    content = content.replace(insert_before, update_entry + insert_before, 1)
else:
    content += update_entry

with open("$LOG_FILE", "w") as f:
    f.write(content)

print("✅  Progress log updated!")
print(f"   → {repr('$NOTE')}")
print(f"   → Timestamp: $TIMESTAMP")
PYEOF
