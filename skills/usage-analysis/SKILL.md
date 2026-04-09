---
name: Usage Analysis
description: Assess and report on token usage across Claude Code projects.
---

# Usage Analysis Skill

This skill allows you to analyze and report on token usage across your Claude Code projects. It leverages a Python analyzer to scan local logs and identify cost-intensive sessions and projects.

## Capabilities

- **Project Summaries**: Aggregated token counts for all scanned projects.
- **Session Details**: Deep dive into specific high-usage sessions.
- **Subagent Tracking**: Break down tokens consumed by recursive agentic workflows.
- **Prompt Logs**: Export a history of human prompts for documentation or review.

## Usage

### Prerequisites
- Python 3.x
- Claude Code logs located in `~/.claude/projects/`

### Running the Analysis
You can run the analysis using the bundled script:

```bash
python3 token_analysis.py
```

### Filtering by Date
- To see usage from the last **7 days**:
  ```bash
  SINCE_DAYS=7 python3 token_analysis.py
  ```
- To see usage since a **specific date**:
  ```bash
  SINCE_DATE=2026-03-30 python3 token_analysis.py
  ```

## Reports
Reports are generated in `~/tuin/analysis/tokens/`:
- `token_report.md`: The primary overview.
- `prompts/`: Project-specific prompt histories.
