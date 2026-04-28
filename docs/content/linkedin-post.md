# LinkedIn Post

---

🚀 I built a full AWS Advanced Networking course platform in a single sprint — with an AI tutor, interactive labs, visual cheatsheets, and live deployment on Vercel.

Here's how it came together.

**The brief:** Create a structured, interactive learning platform for AWS Advanced Networking (ANS-C01 certification) — something that works for students, teachers, and practitioners simultaneously.

**What we built:**
→ 10 deep-dive modules covering VPC, Hybrid Connectivity, Transit Gateway, DNS, Load Balancing, Security, Monitoring, Automation, Multi-Account Architecture, and BGP
→ 3 interactive labs — a VPC Builder, BGP Path Simulator, and Scenario Exercises
→ 12 visual cheatsheets (generated with Google NotebookLM) — one per module, full-screen with keyboard navigation
→ An AI Tutor powered by GraphRAG — combining vector search across all 10 modules with a typed knowledge graph of 67 nodes and 69 edges, served by Claude Haiku
→ Persona-adaptive learning paths for students, teachers, and practitioners
→ Progress tracking that persists across sessions

**The tech stack:** Next.js 14 · TypeScript · Tailwind CSS · shadcn/ui · MDX · Supabase + pgvector · Voyage AI embeddings · Anthropic Claude API · Vercel

**The engineering approach:** Domain-Driven Design (4 bounded contexts) · London School TDD · Architecture Decision Records (ADR-001 to ADR-007) · GraphRAG hybrid retrieval pipeline

**The AI tutor is the part I'm most proud of.** When you ask it a question, it simultaneously searches the course content semantically AND traverses a knowledge graph to surface related concepts — then Claude synthesises the answer with full course context. It even tells you how many chunks and graph nodes it used.

**The cheatsheets** were generated entirely in Google NotebookLM — one prompt per module, exported as PNG, uploaded to GitHub, and served directly from Vercel.

The whole platform is open source:
🔗 https://aws-advanced-networking.vercel.app
📦 https://github.com/mondweep/vibe-cast/tree/aws-advanced-networking

If you're an AWS practitioner, teacher, or studying for ANS-C01 — go explore it. The AI tutor is live and free to use.

And if you're curious about the architecture or want to build something similar, drop me a message.

#AWS #CloudComputing #ANS-C01 #MachineLearning #GraphRAG #NextJS #OpenSource #LearningAndDevelopment #AITutor #EdTech

---
*Connect: linkedin.com/in/mondweepchakravorty*
