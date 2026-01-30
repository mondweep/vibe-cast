# I Built a Claude Skill to Turn NotebookLM Outputs into Knowledge Graphs

**How I automated the documentation of AI-generated infographics with semantic graphs and Neo4j exports**

---

Last week, I had a problem: I was generating beautiful infographics and slide decks using Google NotebookLM, but they were sitting in folders with no context, no searchability, and no way to connect related concepts across documents.

So I built a Claude skill to fix it.

## The Problem with Visual Content Libraries

NotebookLM is fantastic at transforming source documents into visual content—infographics, slide decks, audio overviews. But once you have 10, 20, or 100 of these assets, you face a new challenge:

- How do you navigate them?
- How do you search for concepts across documents?
- How do you see relationships between ideas?

PDFs and images don't answer these questions. You need structured metadata.

## The Solution: A Two-File Documentation Pattern

I created an **Infographic Content Library Skill** for Claude that generates two complementary files for every piece of content:

**1. README.md (Human Navigation)**
- Breadcrumb navigation
- Quick links to source, slides, infographic
- Executive summary and key statistics
- Clickable slide mosaic preview

**2. SEMANTIC-GRAPH.md (Machine-Readable Knowledge)**
- Four Mermaid diagrams: flowchart, ontology, taxonomy, knowledge graph
- Neo4j Cypher exports for database import
- Tags and natural language search phrases

## Real Example: India AI Governance Guidelines

I tested the skill on a 20-slide NotebookLM presentation about India's AI Governance framework. Here's what Claude generated:

**From the README.md:**
- Extracted key statistics (38,231 GPUs, 1,500 datasets, 217 AI models)
- Summarized the 7 Sutras and 6 Pillars framework
- Created a visual slide mosaic linking to the PDF

**From the SEMANTIC-GRAPH.md:**
- Governance architecture flowchart (AIGG → AISI → Sectoral Regulators)
- Entity ontology with Principles, Pillars, Institutions, Stakeholders
- Full taxonomy mindmap of the framework hierarchy
- 25+ Neo4j nodes with relationships ready for graph database import

## The Workflow

```
1. Generate content with NotebookLM
2. Upload PDF/images to a folder
3. Ask Claude: "Generate documentation using the infographic skill"
4. Get README.md + SEMANTIC-GRAPH.md + slide mosaic
```

That's it. The skill handles the structure, templates, diagrams, and exports.

## Why This Matters

**For individuals:** Your visual content becomes searchable and navigable.

**For teams:** Knowledge graphs create shared understanding across documents.

**For AI workflows:** Cypher exports let you build actual graph databases from your content library.

## Credits

This skill is based on workflow patterns from [Dinis Cruz's NotebookLM Infographics repository](https://github.com/DinisCruz/NotebookLM__Infographics-and-slides). His work on structured documentation for AI-generated content inspired this implementation.

## Try It Yourself

The skill is available in this repository. Upload a NotebookLM PDF and let Claude do the rest.

---

## LinkedIn Cover Post

```
I built a Claude skill that turns NotebookLM slides into knowledge graphs.

Input: A PDF slide deck from NotebookLM

Output:
→ README.md with navigation, summary, slide mosaic
→ SEMANTIC-GRAPH.md with 4 Mermaid diagrams
→ Neo4j Cypher exports ready for graph databases

Tested it on India's AI Governance Guidelines (20 slides) and got:
- Governance architecture flowchart
- Entity ontology diagram
- Full taxonomy mindmap
- 25+ graph nodes with relationships

Your visual content shouldn't sit in folders with no context.

Credit to Dinis Cruz for the workflow patterns that inspired this.

Full writeup below ↓

#AI #NotebookLM #KnowledgeGraphs #Claude #Automation
```

---

## Skill Location

- **Skill file:** [.claude/skills/infographic-content-library.md](.claude/skills/infographic-content-library.md)
- **Example output:** [content/india-ai-governance/](content/india-ai-governance/)
