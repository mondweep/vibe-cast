# Product Requirements Document (PRD)

## Competitive Analysis AI Agent

**Version**: 1.0
**Date**: 2026-03-07
**Branch**: `claude/competitive-analysis-l4dH6`
**Repository**: mondweep/vibe-cast

---

## 1. Problem Statement

In today's fast-paced and highly competitive business landscape, staying ahead of competitors is critical for any organization aiming to maintain or grow its market position. Conducting thorough competitive analysis to understand market scenarios, competitor strategies, and emerging opportunities is essential. However, this analysis is a complex, time-intensive process requiring up-to-date knowledge of industry trends and competitor performance.

### Key Pain Points

- **Manual research is slow**: Gathering competitor data across pricing, marketing, and product offerings takes hours or days.
- **Data goes stale quickly**: By the time a report is assembled, market conditions may have shifted.
- **Inconsistent methodology**: Different analysts produce reports of varying depth and focus.
- **Actionable insights are hard to extract**: Raw data alone doesn't tell a company what to do next.

---

## 2. Proposed Solution

A **Competitive Analysis AI Agent** — a single-agent system that automates the end-to-end process of competitor research and analysis. Given a company name, the agent will:

1. **Validate** the input company and confirm it is a real, identifiable entity.
2. **Identify the sector** the company operates in.
3. **Determine the top three competitors** within that sector.
4. **Collect and analyze strategic data** about each competitor, including:
   - Pricing strategies
   - Marketing approaches
   - Product and service offerings
   - Market positioning
5. **Generate a comparative report** with actionable insights to help the company outperform its competitors.

---

## 3. Solution Architecture

The system leverages **MCP (Model Context Protocol)** with a client-server architecture.

### Components

| Component | Role |
|-----------|------|
| **MCP Server** | Hosts all tools: company validation, sector identification, competitor identification, web browsing, and report generation |
| **AI Agent (Client)** | Single agent running on the client side; orchestrates tool calls via MCP to perform the full analysis workflow |

### Tool Inventory

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `validate_company` | Confirm the company exists and resolve its canonical name | Company name (string) | Validated company object (name, domain, description) |
| `identify_sector` | Determine the industry/sector for a validated company | Validated company object | Sector classification (sector name, SIC/NAICS codes, sub-sector) |
| `find_competitors` | Identify top 3 competitors in the same sector | Company + sector | List of competitor objects (name, domain, brief description) |
| `browse_company` | Scrape/search for strategic data about a single company | Company name/domain + data categories | Structured data (pricing, products, marketing, positioning) |
| `generate_report` | Compile all gathered data into a comparative analysis report | Company data + competitor data | Formatted markdown report with insights and recommendations |

### Agent Workflow

```
User Input (company name)
        |
        v
  [validate_company]
        |
        v
  [identify_sector]
        |
        v
  [find_competitors]  -->  Top 3 competitors
        |
        v
  [browse_company] x4  -->  Data for target + 3 competitors
        |
        v
  [generate_report]
        |
        v
  Comparative Report with Actionable Insights
```

---

## 4. Functional Requirements

### FR-1: Company Validation

- The agent MUST accept a company name as free-text input.
- The agent MUST validate that the company is a real, identifiable entity.
- If validation fails, the agent MUST return a clear error message suggesting corrections.

### FR-2: Sector Identification

- The agent MUST classify the validated company into an industry sector.
- Sector identification MUST use web search to ensure up-to-date classification.

### FR-3: Competitor Identification

- The agent MUST identify the top 3 competitors within the identified sector.
- Competitors MUST be ranked by market relevance (market share, brand recognition, product overlap).

### FR-4: Strategic Data Collection

- For each company (target + 3 competitors), the agent MUST collect:
  - **Pricing**: Pricing models, tiers, publicly available price points.
  - **Products/Services**: Core offerings, recent launches, feature comparisons.
  - **Marketing**: Brand positioning, key messaging, channels, recent campaigns.
  - **Market Position**: Estimated market share, growth trajectory, strengths/weaknesses.
- Data collection MUST rely on publicly available information via web search/browsing.

### FR-5: Report Generation

- The agent MUST produce a single, structured comparative report.
- The report MUST include:
  - Executive summary
  - Company overview (target company)
  - Competitor profiles (top 3)
  - Side-by-side comparison matrix
  - SWOT analysis for the target company relative to competitors
  - Actionable recommendations (at least 3 concrete suggestions)
- The report MUST be in markdown format.

---

## 5. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **End-to-end latency** | < 5 minutes for a full analysis |
| **Accuracy** | Competitor identification should match what a human analyst would select in 80%+ of cases |
| **Output format** | Markdown (easily convertible to PDF/HTML) |
| **Error handling** | Graceful degradation — if one data category is unavailable, report should still be generated with available data |
| **Extensibility** | Tool-based architecture allows adding new data sources without modifying the agent logic |

---

## 6. Tech Stack

| Layer | Technology |
|-------|------------|
| Agent runtime | Python with Claude API (Anthropic SDK) |
| MCP server | Python (FastMCP or equivalent) |
| Web search/browsing | Integrated via MCP tools (e.g., Brave Search API, web scraping) |
| Report rendering | Markdown with optional HTML/PDF export |
| Configuration | Environment variables (`.env`) for API keys |

---

## 7. Project Structure

```
competitive-analysis/
├── README.md                  # Setup and usage guide
├── requirements.txt           # Python dependencies
├── .env.example               # Template for API keys
├── server/
│   ├── __init__.py
│   ├── mcp_server.py          # MCP server entry point
│   └── tools/
│       ├── __init__.py
│       ├── validate_company.py
│       ├── identify_sector.py
│       ├── find_competitors.py
│       ├── browse_company.py
│       └── generate_report.py
├── agent/
│   ├── __init__.py
│   └── competitive_agent.py   # Single-agent client logic
├── templates/
│   └── report_template.md     # Report template
└── output/                    # Generated reports
```

---

## 8. User Interface

### Input

```
Enter company name: Acme Corp
```

### Output

A markdown file saved to `output/` containing the full comparative analysis report, plus a summary printed to the console.

---

## 9. Success Criteria

| Metric | Definition | Target |
|--------|-----------|--------|
| **Completion rate** | % of runs that produce a valid report | > 90% |
| **Competitor accuracy** | % of identified competitors that a human analyst agrees with | > 80% |
| **Insight quality** | Recommendations are specific and actionable (human review) | 3+ actionable items per report |
| **User satisfaction** | Report is useful without significant manual rework | Qualitative feedback |

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Web search rate limits | Data collection fails or is incomplete | Implement retry with backoff; cache results |
| Inaccurate competitor identification | Report is irrelevant | Allow user to confirm/override competitor list before deep analysis |
| Stale or incorrect data | Misleading recommendations | Timestamp all data sources; include confidence indicators |
| Company name ambiguity | Wrong company analyzed | Validation step returns multiple candidates for user disambiguation |

---

## 11. Future Enhancements

- **Multi-agent architecture**: Parallelize data collection across competitors for faster results.
- **Historical tracking**: Store reports over time to show competitive landscape evolution.
- **Custom data sources**: Allow users to plug in proprietary databases or APIs.
- **Interactive mode**: Let users drill down into specific sections or ask follow-up questions.
- **Scheduled runs**: Automatically generate weekly/monthly competitive updates.

---

## 12. References

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) — Tool orchestration framework
- [Anthropic Claude API](https://docs.anthropic.com/) — Agent LLM backbone
- Vibe Cast Repository — `mondweep/vibe-cast`
