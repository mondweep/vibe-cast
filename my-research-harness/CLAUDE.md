# my-research-harness

My AI agent harness

## Pipeline

```
scout -> web-searcher -> source-grader -> synthesizer -> fact-checker -> citer
```

Each agent only sees the OUTPUT of the previous one, not the raw inputs. This forces information to flow through grading + verification gates.

## Agents

| Agent | Role | Tier |
|---|---|---|
| `scout` | Decompose the research question into subqueries | Sonnet |
| `web-searcher` | Run subqueries via WebSearch MCP, collect raw hits | Haiku |
| `source-grader` | Grade each source A/B/C/D by authority + freshness + relevance | Sonnet |
| `synthesizer` | Synthesise findings from grade A/B sources only | Sonnet |
| `fact-checker` | Adversarially verify each claim in the synthesis | Sonnet |
| `citer` | Final pass: every claim must cite a graded source | Sonnet |

## Evidence grading rubric

- **A**: Primary source (paper, official doc), <2 years old, on-topic
- **B**: Reputable secondary source (major outlet, expert blog), <5 years
- **C**: Tertiary source (Wikipedia, summary article) — informational only
- **D**: Discarded (forum, unsourced claim, broken link)

## Output

A dossier markdown: TL;DR + body (every claim cited) + bibliography with grades.
