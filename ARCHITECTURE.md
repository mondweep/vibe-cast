# Token-Analyser Architecture

This diagram illustrates the functional components and data flow of the `token_analysis.py` script.

## Component Overview

```mermaid
graph TD
    subgraph Input ["Source Data"]
        CLA_LOGS["~/.claude/projects/"]
        JSONL["Session JSONL Files"]
        SUB_LOGS["Subagent JSONL Files"]
    end

    subgraph Core ["Logic Engine (main)"]
        A_ALL["analyze_all()"]
        P_SESS["parse_session()"]
        EXT_TEXT["extract_text_content()"]
        SUM_PROJ["summarize_projects()"]
        CUTOFF["get_cutoff()"]
    end

    subgraph Output ["Reports & Visualization"]
        CONSOLE["Console Summary"]
        REPORT["token_report.md"]
        PROMPTS["Project Prompts (MD)"]
    end

    %% Data Flow
    CLA_LOGS --> A_ALL
    A_ALL --> CUTOFF
    A_ALL --> P_SESS
    JSONL --> P_SESS
    SUB_LOGS -->|Recursive| P_SESS
    
    P_SESS --> EXT_TEXT
    
    A_ALL --> SUM_PROJ
    SUM_PROJ --> CONSOLE
    SUM_PROJ --> REPORT
    SUM_PROJ --> PROMPTS
    
    REPORT -->|Top Sessions| REPORT
    PROMPTS -->|Sorted by TS| PROMPTS
```

## Detailed Execution Flow

1.  **Scanning Phase**:
    *   `analyze_all()` loops through every project folder.
    *   `get_cutoff()` establishes if there's a time-based filter (e.g., `SINCE_DAYS=7`).
2.  **Parsing Phase**:
    *   `parse_session()` opens each `.jsonl` file.
    *   It extracts **Assistant** usage (input, output, and cache tokens).
    *   It extracts **User** prompts (filtering for human-only input via `is_human_prompt`).
    *   It recursively looks for a `subagents/` folder to capture recursive agent usage.
3.  **Aggregation Phase**:
    *   `summarize_projects()` rolls up session data into project-level totals.
    *   Calculates "Grand Totals" for the whole environment.
    *   Identifies the most "costly" (token-heavy) sessions and subagents.
4.  **Reporting Phase**:
    *   `print_summary()` gives immediate feedback in the terminal.
    *   `write_report()` generates the comprehensive Markdown analysis.
    *   `write_prompts_by_project()` creates detailed logs of what you actually asked Claude in each project.
