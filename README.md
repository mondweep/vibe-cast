# Claude Code Token Analyser

This tool analyzes your Claude Code token usage by scanning the JSONL files in `~/.claude/projects/`.

## Features
- **Project Breakdown**: See which projects are consuming the most tokens.
- **Session Analysis**: Identify individual high-cost sessions.
- **Subagent Tracking**: Track token usage by recursive subagents.
- **Prompt History**: Automatically extracts human prompts for each project.

## Usage

Run the analysis script:
```bash
python3 token_analysis.py
```

### Filtering by Date
You can filter the analysis using environment variables:

- **Last N days**:
  ```bash
  SINCE_DAYS=7 python3 token_analysis.py
  ```
- **From specific date**:
  ```bash
  SINCE_DATE=2026-03-30 python3 token_analysis.py
  ```

## Reports
By default, the script generates reports in:
`~/tuin/analysis/tokens`

- `token_report.md`: The main summary report.
- `prompts/`: A directory containing prompt histories for each project.
